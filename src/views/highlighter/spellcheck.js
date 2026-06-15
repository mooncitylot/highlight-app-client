// OCR-aware spell-check for scanned text.
//
// Tesseract produces character-confusion typos (rn->m, l/1/I, O/0, c->e, vv->w)
// rather than the keyboard-adjacency typos a human makes. This module loads a
// Hunspell dictionary (offline) and ranks corrections by an edit distance that
// makes those OCR confusions cheap, so the visually-plausible fix wins.
//
// Entry points: spellcheckText(text, confidenceByWord) and getSpeller().

// nspell is heavy and only needed once text exists, so it loads lazily in its
// own chunk (kept out of the camera/scan path). The Hunspell dictionary files
// are fetched as static assets (copied to /dict by webpack) rather than imported
// from `dictionary-en`, whose loader is Node-only. Being same-origin, they get
// cached by the service worker, so spell-check keeps working offline.
const DICT_BASE = "dict/";
let _spellerPromise = null;

export function getSpeller() {
  if (!_spellerPromise) {
    _spellerPromise = (async () => {
      const base = typeof document !== "undefined" ? document.baseURI : DICT_BASE;
      const [{ default: nspell }, aff, dic] = await Promise.all([
        import("nspell"),
        fetch(new URL(DICT_BASE + "index.aff", base)).then((r) => r.text()),
        fetch(new URL(DICT_BASE + "index.dic", base)).then((r) => r.text()),
      ]);
      return nspell(aff, dic);
    })().catch((err) => {
      _spellerPromise = null; // allow retry on next scan
      throw err;
    });
  }
  return _spellerPromise;
}

// Common OCR confusions, listed both directions. Each entry maps a substring the
// engine might emit to what it probably should have been. Multi-char pairs
// (rn<->m, vv<->w, cl<->d) matter most — single-glyph errors nspell often gets.
const OCR_CONFUSIONS = [
  ["rn", "m"], ["m", "rn"],
  ["vv", "w"], ["w", "vv"],
  ["cl", "d"], ["d", "cl"],
  ["l", "1"], ["1", "l"],
  ["l", "i"], ["i", "l"],
  ["i", "1"], ["1", "i"],
  ["o", "0"], ["0", "o"],
  ["c", "e"], ["e", "c"],
  ["s", "5"], ["5", "s"],
  ["b", "6"], ["6", "b"],
  ["g", "9"], ["9", "g"],
  ["b", "h"], ["h", "b"],
  ["nn", "m"], ["m", "nn"],
  ["ii", "u"], ["u", "ii"],
];

// Cost of a single-character substitution when the pair is a known OCR confusion.
const CONFUSION_SUB_COST = 0.3;

function isConfusableChar(a, b) {
  return OCR_CONFUSIONS.some(([x, y]) => x === a && y === b);
}

// Levenshtein where a confusable single-char substitution is cheap. Operates on
// lowercased input; casing is handled by the caller.
export function ocrDistance(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      let sub = prev;
      if (a[i - 1] !== b[j - 1]) {
        sub += isConfusableChar(a[i - 1], b[j - 1]) ? CONFUSION_SUB_COST : 1;
      }
      row[j] = Math.min(sub, row[j] + 1, row[j - 1] + 1);
      prev = tmp;
    }
  }
  return row[n];
}

// Generate candidate corrections by replacing each OCR-confusable substring with
// its likely intended form, keeping only results that are real words.
function confusionCandidates(word, speller) {
  const out = new Set();
  const lower = word.toLowerCase();
  for (const [from, to] of OCR_CONFUSIONS) {
    let idx = lower.indexOf(from);
    while (idx !== -1) {
      const cand = lower.slice(0, idx) + to + lower.slice(idx + from.length);
      if (cand !== lower && speller.correct(cand)) out.add(cand);
      idx = lower.indexOf(from, idx + 1);
    }
  }
  return [...out];
}

// Re-apply the original word's casing pattern to a lowercase suggestion.
function matchCase(original, suggestion) {
  if (original === original.toUpperCase() && original.length > 1) {
    return suggestion.toUpperCase();
  }
  if (/\p{L}/u.test(original[0]) && original[0] === original[0].toUpperCase()) {
    return suggestion[0].toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

// Top suggestions for a misspelled word, OCR-distance ordered, casing preserved.
export function rankSuggestions(word, speller) {
  const lower = word.toLowerCase();
  const pool = new Set([...speller.suggest(word), ...confusionCandidates(word, speller)]);
  return [...pool]
    .map((s) => ({ word: matchCase(word, s.toLowerCase()), d: ocrDistance(lower, s.toLowerCase()) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map((s) => s.word);
}

// Words we never flag: tokens with no letters (numbers/codes), acronyms,
// URLs/emails, and 1-char tokens. Digits inside a word are kept — they're
// usually OCR confusions (1->l, 0->o) we want to correct.
function shouldSkip(word) {
  if (word.length < 2) return true;
  if (!/\p{L}/u.test(word)) return true;
  if (/[@/]/.test(word) || /\.\w/.test(word)) return true;
  if (word === word.toUpperCase()) return true;
  return false;
}

// Split a word token into [leadPunct, core, trailPunct] so corrections only
// touch the core and reassembly is exact. Only strips true punctuation — a
// leading/trailing digit stays part of the core (it may be an OCR error).
function peel(token) {
  const m = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  return m ? [m[1], m[2], m[3]] : ["", token, ""];
}

// Decide whether the top suggestion is safe to auto-apply. Needs to be close in
// OCR distance and a clear winner over the runner-up. Low Tesseract confidence
// for the word loosens both bars.
function isConfidentFix(core, suggestions, confidence) {
  if (!suggestions.length) return false;
  const loose = confidence != null && confidence < 70;
  const d0 = ocrDistance(core, suggestions[0]);
  const maxD = loose ? 1.6 : 1.0;
  if (d0 > maxD) return false;
  if (suggestions.length === 1) return true;
  const d1 = ocrDistance(core, suggestions[1]);
  const margin = loose ? 0.2 : 0.4;
  return d1 - d0 >= margin;
}

// Spell-check whole OCR text. Returns reassemblable tokens tagged ok/fixed/
// suspect plus a count of auto-applied fixes.
//   confidenceByWord: optional Map/object of lowercased word -> Tesseract conf.
export async function spellcheckText(text, confidenceByWord = {}) {
  const speller = await getSpeller();
  const getConf = (w) =>
    confidenceByWord instanceof Map ? confidenceByWord.get(w) : confidenceByWord[w];

  // Split keeping whitespace runs as their own tokens for exact reassembly.
  const parts = text.split(/(\s+)/);
  const tokens = [];
  let fixedCount = 0;

  for (const part of parts) {
    if (part === "") continue;
    if (/^\s+$/.test(part)) {
      tokens.push({ type: "space", text: part });
      continue;
    }
    const [lead, core, trail] = peel(part);
    if (!core || shouldSkip(core) || speller.correct(core)) {
      tokens.push({ type: "ok", text: part });
      continue;
    }

    const suggestions = rankSuggestions(core, speller);
    const conf = getConf(core.toLowerCase());

    if (isConfidentFix(core, suggestions, conf)) {
      fixedCount++;
      tokens.push({
        type: "fixed",
        text: lead + suggestions[0] + trail,
        original: part,
        lead,
        core,
        trail,
        suggestions,
      });
    } else if (suggestions.length) {
      tokens.push({ type: "suspect", text: part, lead, core, trail, suggestions });
    } else {
      tokens.push({ type: "ok", text: part });
    }
  }

  return { tokens, fixedCount };
}

import { LitElement, html, css } from "lit";
import Tesseract from "tesseract.js";
import { go } from "../../router/router-mixin.js";
import { routes } from "../../router/routes.js";
import globalStyles from "../../styles/global-styles.js";

class HighlighterContainer extends LitElement {
  static get properties() {
    return {
      ocrText: { type: String },
      progress: { type: Number },
      scanning: { type: Boolean },
      cameraActive: { type: Boolean },
      bandHeight: { type: Number },
      bandWidth: { type: Number },
      shareSupported: { type: Boolean },
      copied: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.ocrText = "";
    this.progress = 0;
    this.scanning = false;
    this.cameraActive = false;
    this._stream = null;
    this.bandHeight = 64;
    this.bandWidth = 90; // percent of viewport width
    this.shareSupported = typeof navigator !== "undefined" && !!navigator.share;
    this.copied = false;
  }

  async _startCamera() {
    this.ocrText = "";
    this.copied = false;
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable.");
      return;
    }
    this.cameraActive = true;
    await this.updateComplete;
    const video = this.shadowRoot.querySelector("video");
    video.srcObject = this._stream;
  }

  _stopCamera() {
    this._stream?.getTracks().forEach((t) => t.stop());
    this._stream = null;
    this.cameraActive = false;
  }

  async _capture() {
    const video = this.shadowRoot.querySelector("video");

    // Camera uses object-fit: cover — recompute the visible source rect so the
    // crop band maps to what the user actually sees.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    const coverScale = Math.max(cw / vw, ch / vh);
    const visW = cw / coverScale; // source px visible horizontally
    const visH = ch / coverScale; // source px visible vertically
    const offX = (vw - visW) / 2;
    const offY = (vh - visH) / 2;

    const bandSrcH = (this.bandHeight / ch) * visH;
    const bandSrcW = (this.bandWidth / 100) * visW;
    const sx = offX + (visW - bandSrcW) / 2;
    const sy = offY + (visH - bandSrcH) / 2;
    const sw = bandSrcW;
    const sh = bandSrcH;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    this._stopCamera();

    this.scanning = true;
    this.progress = 0;

    const result = await Tesseract.recognize(canvas, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          this.progress = Math.round(m.progress * 100);
        }
      },
    });

    this.ocrText = result.data.text.trim();
    this.scanning = false;
  }

  async _share() {
    const text = this._currentText();
    if (!text) return;
    try {
      await navigator.share({ text });
    } catch (err) {
      if (err?.name !== "AbortError") console.error(err);
    }
  }

  async _copy() {
    const text = this._currentText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  _currentText() {
    const ta = this.shadowRoot.querySelector("textarea");
    return ta ? ta.value.trim() : this.ocrText.trim();
  }

  _reset() {
    this.ocrText = "";
    this.copied = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopCamera();
  }

  render() {
    return html`
      <div class="screen">
        ${this._renderTopBar()} ${this.cameraActive ? this._renderCamera() : ""}
        ${this.scanning ? this._renderScanning() : ""}
        ${this.ocrText && !this.cameraActive && !this.scanning
          ? this._renderResult()
          : ""}
        ${!this.cameraActive && !this.scanning && !this.ocrText
          ? this._renderIdle()
          : ""}
      </div>
    `;
  }

  _renderTopBar() {
    return html`
      <div class="topbar">
        <button class="icon-btn" @click=${() => go(routes.DASHBOARD.path)}>
          ‹ Back
        </button>
        <span class="title">Highlighter</span>
        <span class="spacer"></span>
      </div>
    `;
  }

  _renderIdle() {
    return html`
      <div class="idle">
        <h2>Scan a line</h2>
        <p>Point your camera at a line of text and capture it.</p>
        <button class="primary big" @click=${this._startCamera}>
          Open Camera
        </button>
      </div>
    `;
  }

  _renderCamera() {
    return html`
      <div class="camera-stage">
        <video autoplay playsinline muted></video>
        <div class="mask">
          <div class="mask-fill"></div>
          <div class="band-row" style="height:${this.bandHeight}px">
            <div class="mask-fill side"></div>
            <div class="band" style="width:${this.bandWidth}%"></div>
            <div class="mask-fill side"></div>
          </div>
          <div class="mask-fill"></div>
        </div>
        <div class="hint">Line up the text inside the highlight</div>
      </div>

      <div class="bottom-bar">
        <label class="slider">
          <span>Height</span>
          <input
            type="range"
            min="28"
            max="160"
            .value=${this.bandHeight}
            @input=${(e) => (this.bandHeight = Number(e.target.value))}
          />
        </label>
        <label class="slider">
          <span>Width</span>
          <input
            type="range"
            min="20"
            max="100"
            .value=${this.bandWidth}
            @input=${(e) => (this.bandWidth = Number(e.target.value))}
          />
        </label>
        <div class="shutter-row">
          <button class="ghost" @click=${this._stopCamera}>Cancel</button>
          <button
            class="shutter"
            aria-label="Capture"
            @click=${this._capture}
          ></button>
          <span class="ghost-spacer"></span>
        </div>
      </div>
    `;
  }

  _renderScanning() {
    return html`
      <div class="scanning">
        <div class="spinner"></div>
        <p>Reading text… ${this.progress}%</p>
      </div>
    `;
  }

  _renderResult() {
    return html`
      <div class="result">
        <label class="field-label">Scanned text — tap to edit</label>
        <textarea .value=${this.ocrText} rows="6"></textarea>
        <div class="result-actions">
          ${this.shareSupported
            ? html`<button class="primary big" @click=${this._share}>
                Save to…
              </button>`
            : ""}
          <button class="secondary big" @click=${this._copy}>
            ${this.copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <button class="ghost full" @click=${this._startCamera}>
          Scan again
        </button>
      </div>
    `;
  }

  static get styles() {
    return [
      globalStyles,
      css`
        :host {
          display: block;
          height: 100%;
        }
        .screen {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--app-white);
        }

        /* Top bar */
        .topbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          padding-top: max(10px, env(safe-area-inset-top));
          background: var(--app-primary-color);
          color: var(--app-primary-font-color);
        }
        .topbar .title {
          font-weight: 600;
          font-size: 17px;
        }
        .topbar .spacer {
          flex: 1;
        }
        .icon-btn {
          background: transparent;
          color: var(--app-primary-font-color);
          border: none;
          padding: 6px 8px;
          font-size: 16px;
        }
        .icon-btn:hover {
          opacity: 0.85;
        }

        /* Idle */
        .idle {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          gap: 8px;
        }
        .idle-art {
          font-size: 56px;
        }
        .idle p {
          color: var(--app-grey);
          max-width: 260px;
        }

        /* Camera */
        .camera-stage {
          position: relative;
          flex: 1;
          background: #000;
          overflow: hidden;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .mask {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }
        .mask-fill {
          flex: 1;
          background: rgba(0, 0, 0, 0.5);
        }
        .band-row {
          display: flex;
          width: 100%;
        }
        .mask-fill.side {
          flex: 1;
          height: 100%;
        }
        .band {
          height: 100%;
          background: rgba(255, 225, 70, 0.28);
          border: 2px solid rgba(255, 213, 0, 0.95);
        }
        .hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 12px;
          text-align: center;
          color: #fff;
          font-size: 13px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
          pointer-events: none;
        }

        /* Bottom controls */
        .bottom-bar {
          background: var(--app-primary-color);
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .slider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--app-primary-font-color);
          font-size: 13px;
          margin: 0;
        }
        .slider span {
          min-width: 56px;
        }
        .slider input[type="range"] {
          flex: 1;
          margin: 0;
          accent-color: #ffd500;
        }
        .shutter-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .shutter {
          width: 66px;
          height: 66px;
          border-radius: 50%;
          background: #fff;
          border: 4px solid rgba(255, 255, 255, 0.55);
          padding: 0;
          box-shadow: 0 0 0 2px var(--app-primary-color) inset;
        }
        .shutter:active {
          transform: scale(0.94);
        }
        .ghost,
        .ghost-spacer {
          width: 72px;
          text-align: center;
        }
        .ghost {
          background: transparent;
          color: var(--app-primary-font-color);
          border: none;
          padding: 8px;
        }

        /* Scanning */
        .scanning {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--app-grey);
        }
        .spinner {
          width: 44px;
          height: 44px;
          border: 4px solid var(--app-light-grey);
          border-top-color: var(--app-primary-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Result */
        .result {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          gap: 12px;
          overflow: auto;
        }
        .field-label {
          margin: 0;
          font-size: 13px;
          color: var(--app-grey);
          font-weight: 500;
        }
        textarea {
          width: 100%;
          flex: 0 0 auto;
          min-height: 140px;
          resize: vertical;
          padding: 14px;
          border: 1px solid var(--app-light-grey);
          border-radius: var(--app-border-radius);
          font-size: 17px;
          line-height: 1.5;
          font-family: var(--primary-font-family);
          background: #fff;
        }
        textarea:focus {
          outline: none;
          border-color: var(--app-primary-color);
        }
        .result-actions {
          display: flex;
          gap: 10px;
        }
        .result-actions button {
          flex: 1;
        }

        /* Shared button sizing */
        .primary {
          background-color: var(--app-primary-color);
          color: #fff;
        }
        .big {
          padding: 14px 20px;
          font-size: 16px;
          border-radius: var(--app-border-radius);
        }
        .full {
          width: 100%;
        }
        button.ghost.full {
          color: var(--app-grey);
        }
      `,
    ];
  }
}

customElements.define("highlighter-container", HighlighterContainer);
export default HighlighterContainer;

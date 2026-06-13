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
      capturedUrl: { type: String },
      cropHeight: { type: Number },
      cropWidth: { type: Number },
    };
  }

  constructor() {
    super();
    this.ocrText = "";
    this.progress = 0;
    this.scanning = false;
    this.cameraActive = false;
    this.capturedUrl = null;
    this._stream = null;
    this.cropHeight = 120;
    this.cropWidth = 320;
  }

  async _startCamera() {
    this.capturedUrl = null;
    this.ocrText = "";
    this._stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
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
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;
    const sx = ((video.clientWidth - this.cropWidth) / 2) * scaleX;
    const sy = ((video.clientHeight - this.cropHeight) / 2) * scaleY;
    const sw = this.cropWidth * scaleX;
    const sh = this.cropHeight * scaleY;
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    this._stopCamera();

    this.capturedUrl = canvas.toDataURL("image/png");
    this.scanning = true;
    this.progress = 0;

    const result = await Tesseract.recognize(canvas, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          this.progress = Math.round(m.progress * 100);
        }
      },
    });

    this.ocrText = result.data.text;
    this.scanning = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopCamera();
  }

  render() {
    return html`
      <div class="highlighter-container">
        <h3>OCR Scanner</h3>
        <button @click=${() => go(routes.DASHBOARD.path)}>Dashboard</button>
        ${!this.cameraActive && !this.capturedUrl
          ? html`<button @click=${this._startCamera}>Open Camera</button>`
          : ""}
        ${this.cameraActive
          ? html`
              <div class="camera-wrapper">
                <video autoplay playsinline></video>
                <div
                  class="crop-overlay"
                  style="width:${this.cropWidth}px;height:${this.cropHeight}px"
                ></div>
              </div>
              <div class="crop-controls">
                <label class="slider-label">
                  <span>W: ${this.cropWidth}px</span>
                  <input
                    type="range"
                    min="50"
                    max="1280"
                    .value=${this.cropWidth}
                    @input=${(e) => (this.cropWidth = Number(e.target.value))}
                  />
                </label>
                <label class="slider-label">
                  <span>H: ${this.cropHeight}px</span>
                  <input
                    type="range"
                    min="20"
                    max="720"
                    .value=${this.cropHeight}
                    @input=${(e) => (this.cropHeight = Number(e.target.value))}
                  />
                </label>
              </div>
              <div class="controls">
                <button @click=${this._capture}>Capture</button>
                <button @click=${this._stopCamera}>Cancel</button>
              </div>
            `
          : ""}
        ${this.capturedUrl
          ? html`
              <img class="preview" src=${this.capturedUrl} alt="captured" />
              <button @click=${this._startCamera}>Retake</button>
            `
          : ""}
        ${this.scanning
          ? html`<p class="status">Scanning... ${this.progress}%</p>`
          : ""}
        ${this.ocrText ? html`<pre class="result">${this.ocrText}</pre>` : ""}
      </div>
    `;
  }

  static get styles() {
    return [
      globalStyles,
      css`
        .preview {
          max-width: 100%;
          display: block;
          margin: 1em 0;
          border-radius: 4px;
        }
        .camera-wrapper {
          position: relative;
          display: inline-block;
          line-height: 0;
          margin: 1em 0 0;
        }
        video {
          display: block;
          width: 720px;
          height: 320px;
          border-radius: 4px;
        }
        .crop-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid red;
          pointer-events: none;
          box-sizing: border-box;
        }
        .crop-controls {
          display: flex;
          flex-direction: column;
          gap: 0.4em;
          margin: 0.5em 0 0.5em;
          font-size: 0.85em;
        }
        .slider-label {
          display: flex;
          align-items: center;
          gap: 0.5em;
        }
        .slider-label span {
          min-width: 80px;
        }
        .slider-label input[type="range"] {
          flex: 1;
        }
        .controls {
          display: flex;
          gap: 0.5em;
          margin-bottom: 1em;
        }
        button {
          padding: 0.5em 1em;
          cursor: pointer;
        }
        .status {
          color: #666;
          font-style: italic;
        }
        .result {
          white-space: pre-wrap;
          background: #f4f4f4;
          padding: 1em;
          border-radius: 4px;
          font-size: 0.9em;
        }
      `,
    ];
  }
}

customElements.define("highlighter-container", HighlighterContainer);
export default HighlighterContainer;

import { LitElement, html, css, unsafeCSS } from "lit";
import routerMixin, { VIEW_ROUTE_ENTER_CLASS } from "./router/router-mixin.js";
import globalStyles from "./styles/global-styles.js";

class AppEnterElement extends routerMixin(LitElement) {
  static properties = {
    showHeader: { type: Boolean },
  };

  constructor() {
    super();
    this.showHeader = true;
  }

  render() {
    return html`
      ${this.showHeader ? html`<header><h1>Highlighter</h1></header>` : null}
      <slot></slot>
    `;
  }

  static styles = [
    globalStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
      }

      header {
        background-color: var(--app-primary-color);
        padding: 16px;
        text-align: center;
      }

      header > h1 {
        color: white;
        margin: 0;
      }

      slot {
        flex: 1;
        overflow: auto;
        perspective: 1200px;
      }

      @keyframes view-route-enter {
        0% {
          opacity: 0;
          transform: translateY(22px) rotateX(8deg) scale(0.94);
        }
        55% {
          opacity: 1;
          transform: translateY(-6px) rotateX(-2deg) scale(1.02);
        }
        100% {
          opacity: 1;
          transform: translateY(0) rotateX(0) scale(1);
        }
      }

      slot > ${unsafeCSS(`.${VIEW_ROUTE_ENTER_CLASS}`)} {
        animation: view-route-enter 0.58s cubic-bezier(0.22, 1, 0.36, 1) both;
        transform-origin: 50% 0%;
      }

      @media (prefers-reduced-motion: reduce) {
        slot > ${unsafeCSS(`.${VIEW_ROUTE_ENTER_CLASS}`)} {
          animation: none;
          opacity: 1;
          transform: none;
        }
      }
    `,
  ];
}

customElements.define("app-enter", AppEnterElement);
export default AppEnterElement;

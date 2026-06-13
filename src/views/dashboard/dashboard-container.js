import { LitElement, html, css } from "lit";
import globalStyles from "../../styles/global-styles.js";
import { go } from "../../router/router-mixin.js";
import { routes } from "../../router/routes.js";

class DashboardContainer extends LitElement {
  render() {
    return html`
      <div class="container">
        <div class="dashboard-card">
          <button @click=${() => go(routes.HIGHLIGHTER.path)}>
            Highlighter
          </button>
        </div>
      </div>
    `;
  }

  static styles = [
    globalStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        min-height: 100%;
      }

      .dashboard-card {
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: var(--box-shadow);
        max-width: 600px;
        width: 100%;
      }

      h1 {
        margin-bottom: 24px;
      }

      button {
        margin-top: 24px;
      }
    `,
  ];
}

customElements.define("dashboard-container", DashboardContainer);
export default DashboardContainer;

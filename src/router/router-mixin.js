import { routes, getRouteByPath } from "./routes.js";

export function go(path) {
  window.history.pushState(null, null, path);
  window.dispatchEvent(new CustomEvent("route-change"));
}

/** Class applied to routed view roots for entry animation (styled in app-enter). */
export const VIEW_ROUTE_ENTER_CLASS = "view-route-enter";

const componentLoader = (pathname) => import(`./../views/${pathname}.js`);

export default (SuperClass) => {
  return class extends SuperClass {
    static properties = {
      showHeader: { type: Boolean },
    };

    constructor() {
      super();
      this.showHeader = true;
      window.addEventListener("load", () => this.urlChange(), false);
      window.addEventListener("popstate", () => this.urlChange(), false);
    }

    connectedCallback() {
      super.connectedCallback();
      window.addEventListener("route-change", () => this.urlChange(), false);
    }

    async urlChange() {
      const { pathname } = window.location;

      if (pathname === "/") return go(routes.DASHBOARD.path);

      const routeObj = getRouteByPath(pathname);

      if (!routeObj) return go(routes.DASHBOARD.path);

      this.showHeader = true;

      await componentLoader(routeObj.componentPath).catch((err) => {
        console.error(err);
      });

      this.updateUI(routeObj);
    }

    async updateUI(nextView) {
      const component = document.createElement(nextView.componentName);

      if (component.routeEnter) {
        try {
          await component.routeEnter();
        } catch (error) {
          console.error(error);
        }
      }

      const slot = this.shadowRoot.querySelector("slot");
      slot.innerHTML = "";
      slot.append(component);
      component.classList.add(VIEW_ROUTE_ENTER_CLASS);
    }
  };
};

// Chrome fires popstate on load, unlike Firefox and Safari
(function () {
  let blockPopstateEvent = document.readyState != "complete";
  window.addEventListener(
    "load",
    () =>
      setTimeout(function () {
        blockPopstateEvent = false;
      }, 0),
    false,
  );
  window.addEventListener(
    "popstate",
    (evt) => {
      if (blockPopstateEvent && document.readyState == "complete") {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
    },
    false,
  );
})();

import { pathToRegexp } from "path-to-regexp";

export const routes = {
  DASHBOARD: {
    path: "/dashboard",
    componentPath: "dashboard/dashboard-container",
    componentName: "dashboard-container",
    showNav: false,
    showHeader: true,
  },
  HIGHLIGHTER: {
    path: "/highlighter",
    componentPath: "highlighter/highlighter-container",
    componentName: "highlighter-container",
    showNav: true,
    showHeader: false,
  },
};

// Add pathRegexp to each route
Object.values(routes).forEach((route) => {
  route.pathRegexp = pathToRegexp(route.path);
});

export function getRouteByPath(pathname) {
  return Object.values(routes).find((route) => route.pathRegexp.test(pathname));
}

export default routes;

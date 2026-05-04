import type { ReactNode } from "react";

export type AdminRouteConfig = {
  path?: string;
  index?: boolean;
  element?: ReactNode;
  children?: AdminRouteConfig[];
};

export type AdminNavItem = {
  path: string;
  label: string;
};

export type AdminRouteMeta = {
  pathPrefix: string;
  title: string;
  breadcrumb: string;
};

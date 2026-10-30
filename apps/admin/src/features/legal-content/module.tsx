/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const LegalContentPage = lazy(() => import("./pages/LegalContentPage"));

export const legalContentRoutes: AdminRouteConfig[] = [
  {
    path: "/legal-content",
    element: <LazyScreen component={LegalContentPage} />,
  },
];

export const legalContentNavItems: AdminNavItem[] = [
  {
    path: "/legal-content",
    label: "Legal Content",
  },
];

export const legalContentRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/legal-content",
    title: "Legal Content",
    breadcrumb: "Configuration / Legal Content",
  },
];

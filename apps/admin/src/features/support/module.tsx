import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const SupportPage = lazy(() => import("./pages/SupportPage"));
const SupportFaqsPage = lazy(() => import("./pages/SupportFaqsPage"));

export const supportRoutes: AdminRouteConfig[] = [
  {
    path: "/support",
    element: <LazyScreen component={SupportPage} />,
  },
  {
    path: "/support/faqs",
    element: <LazyScreen component={SupportFaqsPage} />,
  },
];

export const supportNavItems: AdminNavItem[] = [
  {
    path: "/support",
    label: "Support & Complaints",
  },
];

export const supportRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/support/faqs",
    title: "Support FAQs",
    breadcrumb: "Support / FAQs",
  },
  {
    pathPrefix: "/support",
    title: "Support & Complaints",
    breadcrumb: "Support / Tickets",
  },
];

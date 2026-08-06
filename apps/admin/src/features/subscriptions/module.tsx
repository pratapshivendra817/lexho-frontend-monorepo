import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const SubscriptionDetailsPage = lazy(() => import("./pages/SubscriptionDetailsPage"));

export const subscriptionsRoutes: AdminRouteConfig[] = [
  {
    path: "/subscriptions",
    children: [
      { index: true, element: <LazyScreen component={SubscriptionsPage} /> },
      { path: ":id", element: <LazyScreen component={SubscriptionDetailsPage} /> },
    ],
  },
];

export const subscriptionsNavItems: AdminNavItem[] = [
  {
    path: "/subscriptions",
    label: "Subscriptions",
  },
];

export const subscriptionsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/subscriptions/",
    title: "Subscription Details",
    breadcrumb: "subscriptions / details",
  },
  {
    pathPrefix: "/subscriptions",
    title: "Subscriptions",
    breadcrumb: "subscriptions",
  },
];

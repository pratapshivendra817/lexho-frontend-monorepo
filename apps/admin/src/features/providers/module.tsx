import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ProvidersPage = lazy(() => import("./pages/ProvidersPage"));
const ProviderDetailsPage = lazy(() => import("./pages/ProviderVerificationPage"));

export const providersRoutes: AdminRouteConfig[] = [
  {
    path: "/providers",
    children: [
      {
        index: true,
        element: <LazyScreen component={ProvidersPage} />,
      },
      {
        path: ":id",
        element: <LazyScreen component={ProviderDetailsPage} />,
      },
    ],
  },
];

export const providersNavItems: AdminNavItem[] = [
  {
    path: "/providers",
    label: "Providers",
  },
];

export const providersRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/providers/",
    title: "Provider Details",
    breadcrumb: "Providers / Details",
  },
  {
    pathPrefix: "/providers",
    title: "Providers",
    breadcrumb: "providers",
  },
];

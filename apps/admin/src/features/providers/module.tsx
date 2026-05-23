import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const PartnersPage = lazy(() => import("./pages/ProvidersPage"));
const PartnerDetailsPage = lazy(() => import("./pages/ProviderVerificationPage"));

export const partnersRoutes: AdminRouteConfig[] = [
  {
    path: "/partners",
    children: [
      {
        index: true,
        element: <LazyScreen component={PartnersPage} />,
      },
      {
        path: ":id",
        element: <LazyScreen component={PartnerDetailsPage} />,
      },
    ],
  },
];

export const partnersNavItems: AdminNavItem[] = [
  {
    path: "/partners",
    label: "Partners",
  },
];

export const partnersRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/partners/",
    title: "Partner Details",
    breadcrumb: "Partners / Details",
  },
  {
    pathPrefix: "/partners",
    title: "Partners",
    breadcrumb: "partners",
  },
];


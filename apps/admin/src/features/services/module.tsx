import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ServiceDetailsPage = lazy(() => import("./pages/ServiceDetailsPage"));

export const servicesRoutes: AdminRouteConfig[] = [
  {
    path: "/services",
    children: [
      {
        index: true,
        element: <LazyScreen component={ServicesPage} />,
      },
      {
        path: ":id",
        element: <LazyScreen component={ServiceDetailsPage} />,
      },
    ],
  },
];

export const servicesNavItems: AdminNavItem[] = [
  {
    path: "/services",
    label: "Services",
  },
];

export const servicesRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/services/",
    title: "Service Details",
    breadcrumb: "catalog / services / details",
  },
  {
    pathPrefix: "/services",
    title: "Services",
    breadcrumb: "catalog / services",
  },
];

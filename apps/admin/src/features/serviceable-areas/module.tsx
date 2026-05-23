import { lazy, type ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { hasRequiredRole } from "@/utils/authSession";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ServiceableAreaPage = lazy(() => import("./pages/ServiceableAreaPage"));
const GeoManagementPage = lazy(() => import("./pages/GeoManagementPage"));

function RequireServiceableAreaAccess({ children }: { children: ReactElement }) {
  if (!hasRequiredRole(["ADMIN"])) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const serviceableAreaChildren: AdminRouteConfig[] = [
  {
    index: true,
    element: (
      <RequireServiceableAreaAccess>
        <LazyScreen component={ServiceableAreaPage} />
      </RequireServiceableAreaAccess>
    ),
  },
  {
    path: "geo",
    element: (
      <RequireServiceableAreaAccess>
        <LazyScreen component={GeoManagementPage} />
      </RequireServiceableAreaAccess>
    ),
  },
];

export const serviceableAreaRoutes: AdminRouteConfig[] = [
  {
    path: "/serviceable-areas",
    children: serviceableAreaChildren,
  },
];

export const serviceableAreaNavItems: AdminNavItem[] = [
  {
    path: "/serviceable-areas",
    label: "Serviceable Areas",
  },
  {
    path: "/serviceable-areas/geo",
    label: "Geo Cities & Zones",
  },
];

export const serviceableAreaRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/serviceable-areas",
    title: "Serviceable Areas",
    breadcrumb: "operations / serviceable areas",
  },
  {
    pathPrefix: "/serviceable-areas/geo",
    title: "Geo Cities & Zones",
    breadcrumb: "operations / geo cities & zones",
  },
];

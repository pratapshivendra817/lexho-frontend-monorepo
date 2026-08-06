import { lazy } from "react";
import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const EmergencyIncidentsPage = lazy(() => import("./pages/EmergencyIncidentsPage"));
const EmergencyIncidentDetailsPage = lazy(() => import("./pages/EmergencyIncidentDetailsPage"));
export const emergencySosRoutes: AdminRouteConfig[] = [{ path: "/emergency-sos", element: <LazyScreen component={EmergencyIncidentsPage} /> }, { path: "/emergency-sos/:eventId", element: <LazyScreen component={EmergencyIncidentDetailsPage} /> }];
export const emergencySosNavItems: AdminNavItem[] = [{ path: "/emergency-sos", label: "Emergency SOS" }];
export const emergencySosRouteMeta: AdminRouteMeta[] = [{ pathPrefix: "/emergency-sos", title: "Emergency SOS", breadcrumb: "Emergency / Incidents" }];

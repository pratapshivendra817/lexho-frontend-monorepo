import { lazy } from "react";
import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";
const CouponsPage = lazy(() => import("./pages/CouponsPage"));
export const couponsRoutes: AdminRouteConfig[] = [{ path: "/coupons", element: <LazyScreen component={CouponsPage} /> }];
export const couponsNavItems: AdminNavItem[] = [{ path: "/coupons", label: "Coupons" }];
export const couponsRouteMeta: AdminRouteMeta[] = [{ pathPrefix: "/coupons", title: "Coupons", breadcrumb: "Campaigns / Coupons" }];

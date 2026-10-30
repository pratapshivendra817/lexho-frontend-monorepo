import { lazy } from "react";
import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";
const SocialMediaPage = lazy(() => import("./pages/SocialMediaPage"));
export const socialMediaRoutes: AdminRouteConfig[] = [{ path: "/social-media", element: <LazyScreen component={SocialMediaPage} /> }];
export const socialMediaNavItems: AdminNavItem[] = [{ path: "/social-media", label: "Social Media" }];
export const socialMediaRouteMeta: AdminRouteMeta[] = [{ pathPrefix: "/social-media", title: "Social Media", breadcrumb: "Configuration / Social Media" }];

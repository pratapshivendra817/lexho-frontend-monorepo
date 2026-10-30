import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const PartnerOnboardingPage = lazy(() => import("./pages/PartnerOnboardingPage"));

export const partnerOnboardingRoutes: AdminRouteConfig[] = [
  { path: "/partner-onboarding", element: <LazyScreen component={PartnerOnboardingPage} /> },
];

export const partnerOnboardingNavItems: AdminNavItem[] = [
  { path: "/partner-onboarding", label: "Partner Onboarding" },
];

export const partnerOnboardingRouteMeta: AdminRouteMeta[] = [
  { pathPrefix: "/partner-onboarding", title: "Partner Onboarding", breadcrumb: "Partners / Onboarding" },
];

import { activityLogsNavItems, activityLogsRouteMeta } from "../features/activity-logs";
import { apiReadinessNavItems, apiReadinessRouteMeta } from "../features/api-readiness";
import { bannersNavItems, bannersRouteMeta } from "../features/banners";
import { bookingsNavItems, bookingsRouteMeta } from "../features/bookings";
import { categoriesNavItems, categoriesRouteMeta } from "../features/categories";
import { dashboardNavItems, dashboardRouteMeta } from "../features/dashboard";
import { notificationsNavItems, notificationsRouteMeta } from "../features/notifications";
import { popularServicesNavItems, popularServicesRouteMeta } from "../features/popular-services";
import { payoutsNavItems, payoutsRouteMeta } from "../features/payouts";
import { providersNavItems, providersRouteMeta } from "../features/providers";
import { reviewsNavItems, reviewsRouteMeta } from "../features/reviews";
import { sectionsNavItems, sectionsRouteMeta } from "../features/sections";
import { servicesNavItems, servicesRouteMeta } from "../features/services";
import { supportNavItems, supportRouteMeta } from "../features/support";
import { usersNavItems, usersRouteMeta } from "../features/users";
import {
  bannerManagementNavItems,
  bannerManagementRouteMeta,
} from "../modules/banner";

import type { AdminNavItem, AdminRouteMeta } from "./types";

export const adminNavItems: AdminNavItem[] = [
  ...dashboardNavItems,
  ...categoriesNavItems,
  ...usersNavItems,
  ...bookingsNavItems,
  ...providersNavItems,
  ...servicesNavItems,
  ...bannersNavItems,
  ...bannerManagementNavItems,
  ...reviewsNavItems,
  ...sectionsNavItems,
  ...notificationsNavItems,
  ...popularServicesNavItems,
  ...supportNavItems,
  ...payoutsNavItems,
  ...activityLogsNavItems,
  ...apiReadinessNavItems,
];

const adminRouteMeta: AdminRouteMeta[] = [
  ...usersRouteMeta,
  ...categoriesRouteMeta,
  ...bookingsRouteMeta,
  ...providersRouteMeta,
  ...servicesRouteMeta,
  ...bannersRouteMeta,
  ...bannerManagementRouteMeta,
  ...reviewsRouteMeta,
  ...sectionsRouteMeta,
  ...notificationsRouteMeta,
  ...popularServicesRouteMeta,
  ...supportRouteMeta,
  ...payoutsRouteMeta,
  ...activityLogsRouteMeta,
  ...apiReadinessRouteMeta,
  ...dashboardRouteMeta,
].sort((first, second) => second.pathPrefix.length - first.pathPrefix.length);

export function getAdminRouteMeta(pathname: string): AdminRouteMeta {
  const match = adminRouteMeta.find((meta) => {
    if (meta.pathPrefix === "/") {
      return pathname === "/";
    }

    return pathname === meta.pathPrefix || pathname.startsWith(meta.pathPrefix);
  });

  if (match) {
    return match;
  }

  const fallback = pathname.replace(/^\//, "") || "dashboard";
  return {
    pathPrefix: pathname,
    title: "Dashboard",
    breadcrumb: fallback,
  };
}

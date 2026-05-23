import { activityLogsNavItems, activityLogsRouteMeta } from "../features/activity-logs";
import { apiReadinessNavItems, apiReadinessRouteMeta } from "../features/api-readiness";
import { bannersNavItems, bannersRouteMeta } from "../features/banners";
import { bookingsNavItems, bookingsRouteMeta } from "../features/bookings";
import { categoriesNavItems, categoriesRouteMeta } from "../features/categories";
import {
  customerProfileControlNavItems,
  customerProfileControlRouteMeta,
} from "../features/customer-profile-control";
import { dashboardNavItems, dashboardRouteMeta } from "../features/dashboard";
import { notificationsNavItems, notificationsRouteMeta } from "../features/notifications";
import { popularServicesNavItems, popularServicesRouteMeta } from "../features/popular-services";
import { payoutsNavItems, payoutsRouteMeta } from "../features/payouts";
import { partnersNavItems, partnersRouteMeta } from "../features/partners";
import { reviewsNavItems, reviewsRouteMeta } from "../features/reviews";
import { sectionsNavItems, sectionsRouteMeta } from "../features/sections";
import { serviceableAreaNavItems, serviceableAreaRouteMeta } from "../features/serviceable-areas";
import { servicesNavItems, servicesRouteMeta } from "../features/services";
import { settingsNavItems, settingsRouteMeta } from "../features/settings";
import { supportNavItems, supportRouteMeta } from "../features/support";
import { usersNavItems, usersRouteMeta } from "../features/users";
import { liveDispatchNavItems, liveDispatchRouteMeta } from "../features/live-dispatch";
import {
  bannerManagementNavItems,
  bannerManagementRouteMeta,
} from "../modules/banner";

import type { AdminNavItem, AdminRouteMeta } from "./types";

export const adminNavItems: AdminNavItem[] = [
  ...dashboardNavItems,
  ...customerProfileControlNavItems,
  ...categoriesNavItems,
  ...usersNavItems,
  ...bookingsNavItems,
  ...partnersNavItems,
  ...servicesNavItems,
  ...bannersNavItems,
  ...bannerManagementNavItems,
  ...reviewsNavItems,
  ...sectionsNavItems,
  ...serviceableAreaNavItems,
  ...liveDispatchNavItems,
  ...notificationsNavItems,
  ...popularServicesNavItems,
  ...supportNavItems,
  ...settingsNavItems,
  ...payoutsNavItems,
  ...activityLogsNavItems,
  ...apiReadinessNavItems,
];

const adminRouteMeta: AdminRouteMeta[] = [
  ...usersRouteMeta,
  ...customerProfileControlRouteMeta,
  ...categoriesRouteMeta,
  ...bookingsRouteMeta,
  ...partnersRouteMeta,
  ...servicesRouteMeta,
  ...bannersRouteMeta,
  ...bannerManagementRouteMeta,
  ...reviewsRouteMeta,
  ...sectionsRouteMeta,
  ...serviceableAreaRouteMeta,
  ...liveDispatchRouteMeta,
  ...notificationsRouteMeta,
  ...popularServicesRouteMeta,
  ...supportRouteMeta,
  ...settingsRouteMeta,
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



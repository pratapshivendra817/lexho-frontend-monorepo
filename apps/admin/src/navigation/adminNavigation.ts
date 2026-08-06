import { adminPaymentsNavItems, adminPaymentsRouteMeta } from "../features/admin-payments";
import { apiReadinessNavItems, apiReadinessRouteMeta } from "../features/api-readiness";
import { bannersNavItems, bannersRouteMeta } from "../features/banners";
import { bookingsNavItems, bookingsRouteMeta } from "../features/bookings";
import { cartBookingSettingsNavItems, cartBookingSettingsRouteMeta } from "../features/cart-booking-settings";
import { categoriesNavItems, categoriesRouteMeta } from "../features/categories";
import { cookFamilySizesNavItems, cookFamilySizesRouteMeta } from "../features/cook-family-sizes";
import { cleaningCoverageNavItems, cleaningCoverageRouteMeta } from "../features/cleaning-coverage";
import {
  customerProfileControlNavItems,
  customerProfileControlRouteMeta,
} from "../features/customer-profile-control";
import { dashboardNavItems, dashboardRouteMeta } from "../features/dashboard";
import { emergencySosNavItems, emergencySosRouteMeta } from "../features/emergency-sos";
import { notificationsNavItems, notificationsRouteMeta } from "../features/notifications";
import { operationsNavItems, operationsRouteMeta } from "../features/operations";
import { popularServicesNavItems, popularServicesRouteMeta } from "../features/popular-services";
import { payoutsNavItems, payoutsRouteMeta } from "../features/payouts";
import { partnersNavItems, partnersRouteMeta } from "../features/providers";
import { recommendedAddonsNavItems, recommendedAddonsRouteMeta } from "../features/recommended-addons";
import { reviewsNavItems, reviewsRouteMeta } from "../features/reviews";
import { sectionsNavItems, sectionsRouteMeta } from "../features/sections";
import { serviceableAreaNavItems, serviceableAreaRouteMeta } from "../features/serviceable-areas";
import { servicesNavItems, servicesRouteMeta } from "../features/services";
import { settingsNavItems, settingsRouteMeta } from "../features/settings";
import { subscriptionsNavItems, subscriptionsRouteMeta } from "../features/subscriptions";
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
  ...emergencySosNavItems,
  ...customerProfileControlNavItems,
  ...categoriesNavItems,
  ...usersNavItems,
  ...bookingsNavItems,
  ...cartBookingSettingsNavItems,
  ...partnersNavItems,
  ...servicesNavItems,
  ...cookFamilySizesNavItems,
  ...cleaningCoverageNavItems,
  ...bannersNavItems,
  ...bannerManagementNavItems,
  ...reviewsNavItems,
  ...sectionsNavItems,
  ...serviceableAreaNavItems,
  ...liveDispatchNavItems,
  ...notificationsNavItems,
  ...popularServicesNavItems,
  ...recommendedAddonsNavItems,
  ...adminPaymentsNavItems,
  ...subscriptionsNavItems,
  ...supportNavItems,
  ...settingsNavItems,
  ...payoutsNavItems,
  ...operationsNavItems,
  ...apiReadinessNavItems,
];

const adminRouteMeta: AdminRouteMeta[] = [
  ...emergencySosRouteMeta,
  ...usersRouteMeta,
  ...customerProfileControlRouteMeta,
  ...categoriesRouteMeta,
  ...bookingsRouteMeta,
  ...cartBookingSettingsRouteMeta,
  ...partnersRouteMeta,
  ...servicesRouteMeta,
  ...cookFamilySizesRouteMeta,
  ...cleaningCoverageRouteMeta,
  ...bannersRouteMeta,
  ...bannerManagementRouteMeta,
  ...reviewsRouteMeta,
  ...sectionsRouteMeta,
  ...serviceableAreaRouteMeta,
  ...liveDispatchRouteMeta,
  ...notificationsRouteMeta,
  ...popularServicesRouteMeta,
  ...recommendedAddonsRouteMeta,
  ...adminPaymentsRouteMeta,
  ...subscriptionsRouteMeta,
  ...supportRouteMeta,
  ...settingsRouteMeta,
  ...payoutsRouteMeta,
  ...operationsRouteMeta,
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

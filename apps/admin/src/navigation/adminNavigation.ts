import { adminPaymentsNavItems, adminPaymentsRouteMeta } from "../features/admin-payments";
import { apiReadinessNavItems, apiReadinessRouteMeta } from "../features/api-readiness";
import { couponsNavItems, couponsRouteMeta } from "../features/coupons";
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
import { legalContentNavItems, legalContentRouteMeta } from "../features/legal-content";
import { screeningCentreNavItems, screeningCentreRouteMeta } from "../features/screening-centre";
import { websiteCitiesNavItems, websiteCitiesRouteMeta } from "../features/website-cities";
import {
  bannerManagementNavItems,
  bannerManagementRouteMeta,
} from "../modules/banner";

import type { AdminNavItem, AdminRouteMeta } from "./types";
import { accountDeletionNavItems, accountDeletionRouteMeta } from "../features/account-deletion";
import { socialMediaNavItems, socialMediaRouteMeta } from "../features/social-media";
import { partnerOnboardingNavItems, partnerOnboardingRouteMeta } from "../features/partner-onboarding";

export const adminNavItems: AdminNavItem[] = [
  ...dashboardNavItems,
  ...couponsNavItems,
  ...emergencySosNavItems,
  ...customerProfileControlNavItems,
  ...categoriesNavItems,
  ...usersNavItems,
  ...bookingsNavItems,
  ...cartBookingSettingsNavItems,
  ...servicesNavItems,
  ...cookFamilySizesNavItems,
  ...cleaningCoverageNavItems,
  ...bannersNavItems,
  ...bannerManagementNavItems,
  ...reviewsNavItems,
  ...sectionsNavItems,
  ...serviceableAreaNavItems,
  ...liveDispatchNavItems,
  ...accountDeletionNavItems,
  ...socialMediaNavItems,
  ...legalContentNavItems,
  ...websiteCitiesNavItems,
  ...screeningCentreNavItems,
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
  ...partnerOnboardingNavItems,
];

const adminRouteMeta: AdminRouteMeta[] = [
  ...couponsRouteMeta,
  ...socialMediaRouteMeta,
  ...emergencySosRouteMeta,
  ...usersRouteMeta,
  ...customerProfileControlRouteMeta,
  ...categoriesRouteMeta,
  ...bookingsRouteMeta,
  ...cartBookingSettingsRouteMeta,
  ...servicesRouteMeta,
  ...cookFamilySizesRouteMeta,
  ...cleaningCoverageRouteMeta,
  ...bannersRouteMeta,
  ...bannerManagementRouteMeta,
  ...reviewsRouteMeta,
  ...sectionsRouteMeta,
  ...serviceableAreaRouteMeta,
  ...liveDispatchRouteMeta,
  ...accountDeletionRouteMeta,
  ...legalContentRouteMeta,
  ...websiteCitiesRouteMeta,
  ...screeningCentreRouteMeta,
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
  ...partnerOnboardingRouteMeta,
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

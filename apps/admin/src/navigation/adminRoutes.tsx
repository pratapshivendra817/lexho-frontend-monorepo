import type { AdminRouteConfig } from "./types";

import { adminPaymentsRoutes } from "../features/admin-payments";
import { apiReadinessRoutes } from "../features/api-readiness";
import { bannersRoutes } from "../features/banners";
import { bookingsRoutes } from "../features/bookings";
import { cartBookingSettingsRoutes } from "../features/cart-booking-settings";
import { categoriesRoutes } from "../features/categories";
import { cookFamilySizesRoutes } from "../features/cook-family-sizes";
import { cleaningCoverageRoutes } from "../features/cleaning-coverage";
import { customerProfileControlRoutes } from "../features/customer-profile-control";
import { dashboardRoutes } from "../features/dashboard";
import { emergencySosRoutes } from "../features/emergency-sos";
import { notificationsRoutes } from "../features/notifications";
import { operationsRoutes } from "../features/operations";
import { popularServicesRoutes } from "../features/popular-services";
import { payoutsRoutes } from "../features/payouts";
import { partnersRoutes } from "../features/providers";
import { recommendedAddonsRoutes } from "../features/recommended-addons";
import { reviewsRoutes } from "../features/reviews";
import { sectionsRoutes } from "../features/sections";
import { serviceableAreaRoutes } from "../features/serviceable-areas";
import { servicesRoutes } from "../features/services";
import { settingsRoutes } from "../features/settings";
import { subscriptionsRoutes } from "../features/subscriptions";
import { supportRoutes } from "../features/support";
import { usersRoutes } from "../features/users";
import { liveDispatchRoutes } from "../features/live-dispatch";
import { bannerManagementRoutes } from "../modules/banner";

export const adminRoutes: AdminRouteConfig[] = [
  ...dashboardRoutes,
  ...emergencySosRoutes,
  ...customerProfileControlRoutes,
  ...categoriesRoutes,
  ...usersRoutes,
  ...bookingsRoutes,
  ...cartBookingSettingsRoutes,
  ...partnersRoutes,
  ...servicesRoutes,
  ...cookFamilySizesRoutes,
  ...cleaningCoverageRoutes,
  ...bannersRoutes,
  ...bannerManagementRoutes,
  ...reviewsRoutes,
  ...sectionsRoutes,
  ...serviceableAreaRoutes,
  ...liveDispatchRoutes,
  ...notificationsRoutes,
  ...popularServicesRoutes,
  ...recommendedAddonsRoutes,
  ...adminPaymentsRoutes,
  ...subscriptionsRoutes,
  ...supportRoutes,
  ...settingsRoutes,
  ...payoutsRoutes,
  ...operationsRoutes,
  ...apiReadinessRoutes,
];



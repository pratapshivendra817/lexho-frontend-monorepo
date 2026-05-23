import type { AdminRouteConfig } from "./types";

import { activityLogsRoutes } from "../features/activity-logs";
import { apiReadinessRoutes } from "../features/api-readiness";
import { bannersRoutes } from "../features/banners";
import { bookingsRoutes } from "../features/bookings";
import { categoriesRoutes } from "../features/categories";
import { customerProfileControlRoutes } from "../features/customer-profile-control";
import { dashboardRoutes } from "../features/dashboard";
import { notificationsRoutes } from "../features/notifications";
import { popularServicesRoutes } from "../features/popular-services";
import { payoutsRoutes } from "../features/payouts";
import { partnersRoutes } from "../features/partners";
import { reviewsRoutes } from "../features/reviews";
import { sectionsRoutes } from "../features/sections";
import { serviceableAreaRoutes } from "../features/serviceable-areas";
import { servicesRoutes } from "../features/services";
import { settingsRoutes } from "../features/settings";
import { supportRoutes } from "../features/support";
import { usersRoutes } from "../features/users";
import { liveDispatchRoutes } from "../features/live-dispatch";
import { bannerManagementRoutes } from "../modules/banner";

export const adminRoutes: AdminRouteConfig[] = [
  ...dashboardRoutes,
  ...customerProfileControlRoutes,
  ...categoriesRoutes,
  ...usersRoutes,
  ...bookingsRoutes,
  ...partnersRoutes,
  ...servicesRoutes,
  ...bannersRoutes,
  ...bannerManagementRoutes,
  ...reviewsRoutes,
  ...sectionsRoutes,
  ...serviceableAreaRoutes,
  ...liveDispatchRoutes,
  ...notificationsRoutes,
  ...popularServicesRoutes,
  ...supportRoutes,
  ...settingsRoutes,
  ...payoutsRoutes,
  ...activityLogsRoutes,
  ...apiReadinessRoutes,
];



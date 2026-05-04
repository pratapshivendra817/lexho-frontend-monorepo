import type { AdminRouteConfig } from "./types";

import { activityLogsRoutes } from "../features/activity-logs";
import { apiReadinessRoutes } from "../features/api-readiness";
import { bannersRoutes } from "../features/banners";
import { bookingsRoutes } from "../features/bookings";
import { categoriesRoutes } from "../features/categories";
import { dashboardRoutes } from "../features/dashboard";
import { notificationsRoutes } from "../features/notifications";
import { popularServicesRoutes } from "../features/popular-services";
import { payoutsRoutes } from "../features/payouts";
import { providersRoutes } from "../features/providers";
import { reviewsRoutes } from "../features/reviews";
import { sectionsRoutes } from "../features/sections";
import { servicesRoutes } from "../features/services";
import { supportRoutes } from "../features/support";
import { usersRoutes } from "../features/users";
import { bannerManagementRoutes } from "../modules/banner";

export const adminRoutes: AdminRouteConfig[] = [
  ...dashboardRoutes,
  ...categoriesRoutes,
  ...usersRoutes,
  ...bookingsRoutes,
  ...providersRoutes,
  ...servicesRoutes,
  ...bannersRoutes,
  ...bannerManagementRoutes,
  ...reviewsRoutes,
  ...sectionsRoutes,
  ...notificationsRoutes,
  ...popularServicesRoutes,
  ...supportRoutes,
  ...payoutsRoutes,
  ...activityLogsRoutes,
  ...apiReadinessRoutes,
];

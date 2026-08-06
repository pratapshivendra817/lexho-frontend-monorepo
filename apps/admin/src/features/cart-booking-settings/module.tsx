/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const CartBookingSettingsPage = lazy(() => import("./pages/CartBookingSettingsPage"));

export const cartBookingSettingsRoutes: AdminRouteConfig[] = [
  {
    path: "/cart-booking-settings",
    element: <LazyScreen component={CartBookingSettingsPage} />,
  },
];

export const cartBookingSettingsNavItems: AdminNavItem[] = [
  {
    path: "/cart-booking-settings",
    label: "Cart & Booking Settings",
  },
];

export const cartBookingSettingsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/cart-booking-settings",
    title: "Cart & Booking Settings",
    breadcrumb: "configuration / cart & booking",
  },
];

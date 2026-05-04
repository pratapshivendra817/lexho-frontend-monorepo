import { lazy, type ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { hasRequiredRole } from "@/utils/authSession";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const BookingsPage = lazy(() => import("./pages/BookingsPage"));
const BookingDetailsPage = lazy(() => import("./pages/BookingDetailsPage"));
const EditBookingPage = lazy(() => import("./pages/EditBookingPage"));

function RequireBookingsAccess({ children }: { children: ReactElement }) {
  if (!hasRequiredRole(["ADMIN"])) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const bookingRouteChildren: AdminRouteConfig[] = [
  {
    index: true,
    element: (
      <RequireBookingsAccess>
        <LazyScreen component={BookingsPage} />
      </RequireBookingsAccess>
    ),
  },
  {
    path: "edit/:id",
    element: (
      <RequireBookingsAccess>
        <LazyScreen component={EditBookingPage} />
      </RequireBookingsAccess>
    ),
  },
  {
    path: ":id",
    element: (
      <RequireBookingsAccess>
        <LazyScreen component={BookingDetailsPage} />
      </RequireBookingsAccess>
    ),
  },
];

export const bookingsRoutes: AdminRouteConfig[] = [
  {
    path: "/bookings",
    children: bookingRouteChildren,
  },
  {
    path: "/admin/bookings",
    children: bookingRouteChildren,
  },
];

export const bookingsNavItems: AdminNavItem[] = [
  {
    path: "/bookings",
    label: "Bookings",
  },
];

export const bookingsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/admin/bookings/edit/",
    title: "Edit Booking",
    breadcrumb: "Bookings / Edit",
  },
  {
    pathPrefix: "/bookings/edit/",
    title: "Edit Booking",
    breadcrumb: "Bookings / Edit",
  },
  {
    pathPrefix: "/admin/bookings/",
    title: "Booking Details",
    breadcrumb: "Bookings / Details",
  },
  {
    pathPrefix: "/bookings/",
    title: "Booking Details",
    breadcrumb: "Bookings / Details",
  },
  {
    pathPrefix: "/admin/bookings",
    title: "Bookings",
    breadcrumb: "bookings",
  },
  {
    pathPrefix: "/bookings",
    title: "Bookings",
    breadcrumb: "bookings",
  },
];



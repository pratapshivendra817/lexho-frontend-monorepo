import { describe, expect, it, vi } from "vitest";

const { nestedServiceRoute } = vi.hoisted(() => ({
  nestedServiceRoute: {
    path: "/services",
    element: "services-page",
    children: [
      { index: true, element: "services-index" },
      { path: ":serviceId", element: "service-detail" },
    ],
  },
}));

vi.mock("@/features/admin-payments", () => ({
  adminPaymentsRoutes: [{ path: "/payments", element: "payments-page" }],
}));
vi.mock("@/features/api-readiness", () => ({
  apiReadinessRoutes: [{ path: "/api-readiness", element: "api-readiness-page" }],
}));
vi.mock("@/features/banners", () => ({
  bannersRoutes: [],
}));
vi.mock("@/features/bookings", () => ({
  bookingsRoutes: [{ path: "/bookings", element: "bookings-page" }],
}));
vi.mock("@/features/cart-booking-settings", () => ({
  cartBookingSettingsRoutes: [{ path: "/cart-booking-settings", element: "cart-settings-page" }],
}));
vi.mock("@/features/categories", () => ({
  categoriesRoutes: [{ path: "/categories", element: "categories-page" }],
}));
vi.mock("@/features/cook-family-sizes", () => ({
  cookFamilySizesRoutes: [{ path: "/cook-family-sizes", element: "cook-family-sizes-page" }],
}));
vi.mock("@/features/cleaning-coverage", () => ({
  cleaningCoverageRoutes: [{ path: "/cleaning-coverage", element: "cleaning-coverage-page" }],
}));
vi.mock("@/features/customer-profile-control", () => ({
  customerProfileControlRoutes: [{ path: "/profile-control", element: "profile-control-page" }],
}));
vi.mock("@/features/dashboard", () => ({
  dashboardRoutes: [{ index: true, element: "dashboard-home" }],
}));
vi.mock("@/features/emergency-sos", () => ({
  emergencySosRoutes: [{ path: "/emergency-sos", element: "emergency-page" }],
}));
vi.mock("@/features/notifications", () => ({
  notificationsRoutes: [],
}));
vi.mock("@/features/operations", () => ({
  operationsRoutes: [{ path: "/operations", element: "operations-page" }],
}));
vi.mock("@/features/popular-services", () => ({
  popularServicesRoutes: [],
}));
vi.mock("@/features/payouts", () => ({
  payoutsRoutes: [{ path: "/payouts", element: "payouts-page" }],
}));
vi.mock("@/features/providers", () => ({
  partnersRoutes: [{ path: "/providers", element: "providers-page" }],
}));
vi.mock("@/features/recommended-addons", () => ({
  recommendedAddonsRoutes: [{ path: "/recommended-addons", element: "recommended-addons-page" }],
}));
vi.mock("@/features/reviews", () => ({
  reviewsRoutes: [{ path: "/reviews", element: "reviews-page" }],
}));
vi.mock("@/features/sections", () => ({
  sectionsRoutes: [],
}));
vi.mock("@/features/serviceable-areas", () => ({
  serviceableAreaRoutes: [{ path: "/serviceable-areas", element: "serviceable-areas-page" }],
}));
vi.mock("@/features/services", () => ({
  servicesRoutes: [nestedServiceRoute],
}));
vi.mock("@/features/settings", () => ({
  settingsRoutes: [],
}));
vi.mock("@/features/subscriptions", () => ({
  subscriptionsRoutes: [{ path: "/subscriptions", element: "subscriptions-page" }],
}));
vi.mock("@/features/support", () => ({
  supportRoutes: [{ path: "/support", element: "support-page" }],
}));
vi.mock("@/features/users", () => ({
  usersRoutes: [],
}));
vi.mock("@/features/live-dispatch", () => ({
  liveDispatchRoutes: [{ path: "/live-dispatch", element: "live-dispatch-page" }],
}));
vi.mock("@/modules/banner", () => ({
  bannerManagementRoutes: [{ path: "/banner-management", element: "banner-management-page" }],
}));

import { adminRoutes } from "@/navigation/adminRoutes";

describe("adminRoutes", () => {
  it("aggregates route config arrays in the declared order", () => {
    expect(adminRoutes).toEqual([
      { index: true, element: "dashboard-home" },
      { path: "/emergency-sos", element: "emergency-page" },
      { path: "/profile-control", element: "profile-control-page" },
      { path: "/categories", element: "categories-page" },
      { path: "/bookings", element: "bookings-page" },
      { path: "/cart-booking-settings", element: "cart-settings-page" },
      { path: "/providers", element: "providers-page" },
      nestedServiceRoute,
      { path: "/cook-family-sizes", element: "cook-family-sizes-page" },
      { path: "/cleaning-coverage", element: "cleaning-coverage-page" },
      { path: "/banner-management", element: "banner-management-page" },
      { path: "/reviews", element: "reviews-page" },
      { path: "/serviceable-areas", element: "serviceable-areas-page" },
      { path: "/live-dispatch", element: "live-dispatch-page" },
      { path: "/recommended-addons", element: "recommended-addons-page" },
      { path: "/payments", element: "payments-page" },
      { path: "/subscriptions", element: "subscriptions-page" },
      { path: "/support", element: "support-page" },
      { path: "/payouts", element: "payouts-page" },
      { path: "/operations", element: "operations-page" },
      { path: "/api-readiness", element: "api-readiness-page" },
    ]);
  });

  it("preserves nested child route structures instead of flattening them", () => {
    const servicesRoute = adminRoutes.find((route) => route.path === "/services");

    expect(servicesRoute).toEqual(nestedServiceRoute);
    expect(servicesRoute?.children).toHaveLength(2);
    expect(servicesRoute?.children?.[0]).toEqual({ index: true, element: "services-index" });
    expect(servicesRoute?.children?.[1]).toEqual({ path: ":serviceId", element: "service-detail" });
  });

  it("keeps index routes and skips empty module route arrays naturally", () => {
    expect(adminRoutes[0]).toEqual({ index: true, element: "dashboard-home" });
    expect(adminRoutes.some((route) => route.path === "/notifications")).toBe(false);
    expect(adminRoutes.some((route) => route.path === "/settings")).toBe(false);
  });
});

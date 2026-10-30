import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/admin-payments", () => ({
  adminPaymentsNavItems: [{ path: "/payments", label: "Payments" }],
  adminPaymentsRouteMeta: [{ pathPrefix: "/payments", title: "Payments", breadcrumb: "Payments" }],
}));
vi.mock("@/features/api-readiness", () => ({
  apiReadinessNavItems: [{ path: "/api-readiness", label: "API Readiness" }],
  apiReadinessRouteMeta: [{ pathPrefix: "/api-readiness", title: "API Readiness", breadcrumb: "API Readiness" }],
}));
vi.mock("@/features/coupons", () => ({
  couponsNavItems: [{ path: "/coupons", label: "Coupons" }],
  couponsRouteMeta: [{ pathPrefix: "/coupons", title: "Coupons", breadcrumb: "Campaigns / Coupons" }],
}));
vi.mock("@/features/banners", () => ({
  bannersNavItems: [],
  bannersRouteMeta: [{ pathPrefix: "/banners", title: "Banners", breadcrumb: "Banners" }],
}));
vi.mock("@/features/bookings", () => ({
  bookingsNavItems: [{ path: "/bookings", label: "Bookings" }],
  bookingsRouteMeta: [{ pathPrefix: "/bookings", title: "Bookings", breadcrumb: "Bookings" }],
}));
vi.mock("@/features/cart-booking-settings", () => ({
  cartBookingSettingsNavItems: [{ path: "/cart-booking-settings", label: "Cart Settings" }],
  cartBookingSettingsRouteMeta: [{ pathPrefix: "/cart-booking-settings", title: "Cart Settings", breadcrumb: "Cart Settings" }],
}));
vi.mock("@/features/categories", () => ({
  categoriesNavItems: [{ path: "/categories", label: "Categories" }],
  categoriesRouteMeta: [{ pathPrefix: "/categories", title: "Categories", breadcrumb: "Categories" }],
}));
vi.mock("@/features/cook-family-sizes", () => ({
  cookFamilySizesNavItems: [{ path: "/cook-family-sizes", label: "Cook Family Sizes" }],
  cookFamilySizesRouteMeta: [{ pathPrefix: "/cook-family-sizes", title: "Cook Family Sizes", breadcrumb: "Cook Family Sizes" }],
}));
vi.mock("@/features/cleaning-coverage", () => ({
  cleaningCoverageNavItems: [{ path: "/cleaning-coverage", label: "Cleaning Coverage" }],
  cleaningCoverageRouteMeta: [{ pathPrefix: "/cleaning-coverage", title: "Cleaning Coverage", breadcrumb: "Cleaning Coverage" }],
}));
vi.mock("@/features/customer-profile-control", () => ({
  customerProfileControlNavItems: [{ path: "/profile-control", label: "Profile Control" }],
  customerProfileControlRouteMeta: [{ pathPrefix: "/profile-control", title: "Profile Control", breadcrumb: "Profile Control" }],
}));
vi.mock("@/features/dashboard", () => ({
  dashboardNavItems: [{ path: "/", label: "Dashboard" }],
  dashboardRouteMeta: [{ pathPrefix: "/", title: "Dashboard", breadcrumb: "Dashboard" }],
}));
vi.mock("@/features/emergency-sos", () => ({
  emergencySosNavItems: [{ path: "/emergency-sos", label: "Emergency SOS" }],
  emergencySosRouteMeta: [{ pathPrefix: "/emergency-sos", title: "Emergency SOS", breadcrumb: "Emergency SOS" }],
}));
vi.mock("@/features/notifications", () => ({
  notificationsNavItems: [],
  notificationsRouteMeta: [{ pathPrefix: "/notifications", title: "Notifications", breadcrumb: "Notifications" }],
}));
vi.mock("@/features/operations", () => ({
  operationsNavItems: [{ path: "/operations", label: "Operations" }],
  operationsRouteMeta: [{ pathPrefix: "/operations", title: "Operations", breadcrumb: "Operations" }],
}));
vi.mock("@/features/popular-services", () => ({
  popularServicesNavItems: [],
  popularServicesRouteMeta: [{ pathPrefix: "/popular-services", title: "Popular Services", breadcrumb: "Popular Services" }],
}));
vi.mock("@/features/payouts", () => ({
  payoutsNavItems: [{ path: "/payouts", label: "Payouts" }],
  payoutsRouteMeta: [{ pathPrefix: "/payouts", title: "Payouts", breadcrumb: "Payouts" }],
}));
vi.mock("@/features/recommended-addons", () => ({
  recommendedAddonsNavItems: [{ path: "/recommended-addons", label: "Recommended Addons" }],
  recommendedAddonsRouteMeta: [{ pathPrefix: "/recommended-addons", title: "Recommended Addons", breadcrumb: "Recommended Addons" }],
}));
vi.mock("@/features/reviews", () => ({
  reviewsNavItems: [{ path: "/reviews", label: "Reviews" }],
  reviewsRouteMeta: [{ pathPrefix: "/reviews", title: "Reviews", breadcrumb: "Reviews" }],
}));
vi.mock("@/features/sections", () => ({
  sectionsNavItems: [],
  sectionsRouteMeta: [{ pathPrefix: "/sections", title: "Sections", breadcrumb: "Sections" }],
}));
vi.mock("@/features/serviceable-areas", () => ({
  serviceableAreaNavItems: [{ path: "/serviceable-areas", label: "Serviceable Areas" }],
  serviceableAreaRouteMeta: [{ pathPrefix: "/serviceable-areas", title: "Serviceable Areas", breadcrumb: "Serviceable Areas" }],
}));
vi.mock("@/features/services", () => ({
  servicesNavItems: [{ path: "/services", label: "Services" }],
  servicesRouteMeta: [
    { pathPrefix: "/services", title: "Services", breadcrumb: "Services" },
    { pathPrefix: "/services/detail", title: "Service Detail", breadcrumb: "Service Detail" },
  ],
}));
vi.mock("@/features/settings", () => ({
  settingsNavItems: [],
  settingsRouteMeta: [{ pathPrefix: "/settings", title: "Settings", breadcrumb: "Settings" }],
}));
vi.mock("@/features/subscriptions", () => ({
  subscriptionsNavItems: [{ path: "/subscriptions", label: "Subscriptions" }],
  subscriptionsRouteMeta: [{ pathPrefix: "/subscriptions", title: "Subscriptions", breadcrumb: "Subscriptions" }],
}));
vi.mock("@/features/support", () => ({
  supportNavItems: [{ path: "/support", label: "Support" }],
  supportRouteMeta: [{ pathPrefix: "/support", title: "Support", breadcrumb: "Support" }],
}));
vi.mock("@/features/users", () => ({
  usersNavItems: [],
  usersRouteMeta: [{ pathPrefix: "/users", title: "Users", breadcrumb: "Users" }],
}));
vi.mock("@/features/live-dispatch", () => ({
  liveDispatchNavItems: [{ path: "/live-dispatch", label: "Live Dispatch" }],
  liveDispatchRouteMeta: [{ pathPrefix: "/live-dispatch", title: "Live Dispatch", breadcrumb: "Live Dispatch" }],
}));
vi.mock("@/features/legal-content", () => ({
  legalContentNavItems: [{ path: "/legal-content", label: "Legal Content" }],
  legalContentRouteMeta: [{ pathPrefix: "/legal-content", title: "Legal Content", breadcrumb: "Legal Content" }],
}));
vi.mock("@/features/account-deletion", () => ({
  accountDeletionNavItems: [],
  accountDeletionRouteMeta: [{ pathPrefix: "/account-deletion", title: "Account Deletion", breadcrumb: "Account Deletion" }],
}));
vi.mock("@/features/social-media", () => ({
  socialMediaNavItems: [],
  socialMediaRouteMeta: [{ pathPrefix: "/social-media", title: "Social Media", breadcrumb: "Social Media" }],
}));
vi.mock("@/features/screening-centre", () => ({
  screeningCentreNavItems: [{ path: "/screening-centre", label: "Screening Centre" }],
  screeningCentreRouteMeta: [{ pathPrefix: "/screening-centre", title: "Screening Centre", breadcrumb: "Screening Centre" }],
}));
vi.mock("@/features/website-cities", () => ({
  websiteCitiesNavItems: [{ path: "/website/header-navigation/cities", label: "Website Cities" }],
  websiteCitiesRouteMeta: [
    {
      pathPrefix: "/website/header-navigation/cities",
      title: "Website Cities",
      breadcrumb: "Website / Header Navigation / Cities",
    },
  ],
}));
vi.mock("@/modules/banner", () => ({
  bannerManagementNavItems: [],
  bannerManagementRouteMeta: [{ pathPrefix: "/banner-management", title: "Banner Management", breadcrumb: "Banner Management" }],
}));

import { adminNavItems, getAdminRouteMeta } from "@/navigation/adminNavigation";

describe("adminNavigation", () => {
  it("aggregates nav items in the declared order while keeping hidden sections empty", () => {
    expect(adminNavItems).toEqual([
      { path: "/", label: "Dashboard" },
      { path: "/coupons", label: "Coupons" },
      { path: "/emergency-sos", label: "Emergency SOS" },
      { path: "/profile-control", label: "Profile Control" },
      { path: "/categories", label: "Categories" },
      { path: "/bookings", label: "Bookings" },
      { path: "/cart-booking-settings", label: "Cart Settings" },
      { path: "/providers", label: "Providers" },
      { path: "/services", label: "Services" },
      { path: "/cook-family-sizes", label: "Cook Family Sizes" },
      { path: "/cleaning-coverage", label: "Cleaning Coverage" },
      { path: "/reviews", label: "Reviews" },
      { path: "/serviceable-areas", label: "Serviceable Areas" },
      { path: "/live-dispatch", label: "Live Dispatch" },
      { path: "/legal-content", label: "Legal Content" },
      { path: "/website/header-navigation/cities", label: "Website Cities" },
      { path: "/screening-centre", label: "Screening Centre" },
      { path: "/recommended-addons", label: "Recommended Addons" },
      { path: "/payments", label: "Payments" },
      { path: "/subscriptions", label: "Subscriptions" },
      { path: "/support", label: "Support" },
      { path: "/payouts", label: "Payouts" },
      { path: "/operations", label: "Operations" },
      { path: "/api-readiness", label: "API Readiness" },
    ]);
  });

  it("returns the root meta only for the exact root pathname", () => {
    expect(getAdminRouteMeta("/")).toEqual({
      pathPrefix: "/",
      title: "Dashboard",
      breadcrumb: "Dashboard",
    });
  });

  it("matches a route by exact path and by startsWith prefix", () => {
    expect(getAdminRouteMeta("/bookings")).toEqual({
      pathPrefix: "/bookings",
      title: "Bookings",
      breadcrumb: "Bookings",
    });

    expect(getAdminRouteMeta("/live-dispatch/current-job")).toEqual({
      pathPrefix: "/live-dispatch",
      title: "Live Dispatch",
      breadcrumb: "Live Dispatch",
    });

    expect(getAdminRouteMeta("/website/header-navigation/cities")).toEqual({
      pathPrefix: "/website/header-navigation/cities",
      title: "Website Cities",
      breadcrumb: "Website / Header Navigation / Cities",
    });
  });

  it("prefers the longest matching path prefix when multiple prefixes overlap", () => {
    expect(getAdminRouteMeta("/services/detail/42")).toEqual({
      pathPrefix: "/services/detail",
      title: "Service Detail",
      breadcrumb: "Service Detail",
    });
  });

  it("falls back to a dashboard-shaped meta object for unknown paths", () => {
    expect(getAdminRouteMeta("/unknown/path")).toEqual({
      pathPrefix: "/unknown/path",
      title: "Dashboard",
      breadcrumb: "unknown/path",
    });
  });

  it("uses dashboard as the fallback breadcrumb when the pathname is empty", () => {
    expect(getAdminRouteMeta("")).toEqual({
      pathPrefix: "",
      title: "Dashboard",
      breadcrumb: "dashboard",
    });
  });
});

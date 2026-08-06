import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component: Component }: { component: () => JSX.Element }) => <Component />,
}));

vi.mock("@/features/notifications/pages/NotificationsPage", () => ({
  default: () => <div>notifications-page</div>,
}));

vi.mock("@/features/notifications/pages/NotificationDetailsPage", () => ({
  default: () => <div>notification-details-page</div>,
}));

vi.mock("@/features/reviews/pages/ReviewsPage", () => ({
  default: () => <div>reviews-page</div>,
}));

vi.mock("@/features/subscriptions/pages/SubscriptionsPage", () => ({
  default: () => <div>subscriptions-page</div>,
}));

vi.mock("@/features/subscriptions/pages/SubscriptionDetailsPage", () => ({
  default: () => <div>subscription-details-page</div>,
}));

vi.mock("@/features/support/pages/SupportPage", () => ({
  default: () => <div>support-page</div>,
}));

vi.mock("@/features/support/pages/SupportFaqsPage", () => ({
  default: () => <div>support-faqs-page</div>,
}));

vi.mock("@/features/api-readiness/pages/ApiReadinessPage", () => ({
  default: () => <div>api-readiness-page</div>,
}));

vi.mock("@/features/banners/pages/BannersPage", () => ({
  default: () => <div>banners-page</div>,
}));

describe("feature modules", () => {
  it("exposes notifications routes, route meta, and barrel exports", async () => {
    const feature = await import("@/features/notifications");

    expect(feature.notificationsRoutes).toHaveLength(1);
    expect(feature.notificationsRoutes[0]?.path).toBe("/notifications");
    expect(feature.notificationsRoutes[0]?.children).toHaveLength(2);
    expect(feature.notificationsNavItems).toEqual([]);
    expect(feature.notificationsRouteMeta).toEqual([
      {
        pathPrefix: "/notifications/",
        title: "Notification Details",
        breadcrumb: "Communication / Notifications / Details",
      },
      {
        pathPrefix: "/notifications",
        title: "Notification Center",
        breadcrumb: "Communication / Notifications",
      },
    ]);
    expect(feature.useAdminNotificationsQuery).toBeTypeOf("function");
    expect(feature.useAdminNotificationSocket).toBeTypeOf("function");
    expect(feature.getAdminNotifications).toBeTypeOf("function");
    expect(feature.NotificationStatusBadge).toBeTypeOf("function");
  });

  it("exposes reviews routes, route meta, and barrel exports", async () => {
    const feature = await import("@/features/reviews");

    expect(feature.reviewsRoutes).toEqual([{ path: "/reviews", element: expect.any(Object) }]);
    expect(feature.reviewsNavItems).toEqual([{ path: "/reviews", label: "Ratings & Reviews" }]);
    expect(feature.reviewsRouteMeta).toEqual([
      { pathPrefix: "/reviews", title: "Ratings & Reviews", breadcrumb: "Reviews" },
    ]);
    expect(feature.useAdminReviewsQuery).toBeTypeOf("function");
    expect(feature.getAdminReviews).toBeTypeOf("function");
    expect(feature.RatingStars).toBeTypeOf("function");
  });

  it("exposes subscriptions routes, route meta, and barrel exports", async () => {
    const feature = await import("@/features/subscriptions");

    expect(feature.subscriptionsRoutes).toHaveLength(1);
    expect(feature.subscriptionsRoutes[0]?.path).toBe("/subscriptions");
    expect(feature.subscriptionsRoutes[0]?.children).toHaveLength(2);
    expect(feature.subscriptionsNavItems).toEqual([{ path: "/subscriptions", label: "Subscriptions" }]);
    expect(feature.subscriptionsRouteMeta).toEqual([
      {
        pathPrefix: "/subscriptions/",
        title: "Subscription Details",
        breadcrumb: "subscriptions / details",
      },
      { pathPrefix: "/subscriptions", title: "Subscriptions", breadcrumb: "subscriptions" },
    ]);
  });

  it("exposes support routes, route meta, and barrel exports", async () => {
    const feature = await import("@/features/support");

    expect(feature.supportRoutes).toEqual([
      { path: "/support", element: expect.any(Object) },
      { path: "/support/faqs", element: expect.any(Object) },
    ]);
    expect(feature.supportNavItems).toEqual([{ path: "/support", label: "Support & Complaints" }]);
    expect(feature.supportRouteMeta).toEqual([
      { pathPrefix: "/support/faqs", title: "Support FAQs", breadcrumb: "Support / FAQs" },
      { pathPrefix: "/support", title: "Support & Complaints", breadcrumb: "Support / Tickets" },
    ]);
    expect(feature.StatsCards).toBeTypeOf("function");
    expect(feature.TicketDetail).toBeTypeOf("function");
    expect(feature.TicketTable).toBeTypeOf("function");
  });

  it("exposes api readiness route config", async () => {
    const feature = await import("@/features/api-readiness");

    expect(feature.apiReadinessRoutes).toEqual([{ path: "/api-readiness", element: expect.any(Object) }]);
    expect(feature.apiReadinessNavItems).toEqual([{ path: "/api-readiness", label: "API Readiness" }]);
    expect(feature.apiReadinessRouteMeta).toEqual([
      { pathPrefix: "/api-readiness", title: "API Readiness", breadcrumb: "api-readiness" },
    ]);
  });

  it("exposes banners route config", async () => {
    const feature = await import("@/features/banners");

    expect(feature.bannersRoutes).toEqual([{ path: "/banners", element: expect.any(Object) }]);
    expect(feature.bannersRouteMeta).toEqual([
      { pathPrefix: "/banners", title: "Home Banners", breadcrumb: "home banners" },
    ]);
    expect(feature.getBanners).toBeTypeOf("function");
    expect(feature.useBannersQuery).toBeTypeOf("function");
    expect(feature.BannerStatusBadge).toBeTypeOf("function");
  });
});

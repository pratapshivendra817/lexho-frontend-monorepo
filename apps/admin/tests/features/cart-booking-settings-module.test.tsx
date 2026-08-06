import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component: Component }: { component: () => JSX.Element }) => <Component />,
}));

vi.mock("@/features/cart-booking-settings/pages/CartBookingSettingsPage", () => ({
  default: () => <div>cart-booking-settings-page</div>,
}));

describe("cart booking settings module", () => {
  it("exports route and nav metadata", async () => {
    const feature = await import("@/features/cart-booking-settings");

    expect(feature.cartBookingSettingsRoutes).toHaveLength(1);
    expect(feature.cartBookingSettingsRoutes[0]?.path).toBe("/cart-booking-settings");
    expect(feature.cartBookingSettingsNavItems).toEqual([
      { path: "/cart-booking-settings", label: "Cart & Booking Settings" },
    ]);
    expect(feature.cartBookingSettingsRouteMeta).toEqual([
      {
        pathPrefix: "/cart-booking-settings",
        title: "Cart & Booking Settings",
        breadcrumb: "configuration / cart & booking",
      },
    ]);
  });

  it("re-exports types/default settings", async () => {
    const feature = await import("@/features/cart-booking-settings");

    expect(feature.defaultCartBookingSettings.maxCartItems).toBe(10);
    expect(feature.defaultCartBookingSettings.subscriptionAutoRenewEnabled).toBe(false);
  });
});

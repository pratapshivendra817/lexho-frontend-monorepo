import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component: Component }: { component: () => JSX.Element }) => <Component />,
}));

vi.mock("@/features/customer-profile-control/pages/CustomerProfilesControlPage", () => ({
  default: () => <div>customer-profiles-control-page</div>,
}));

vi.mock("@/features/customer-profile-control/pages/ProfileContentControlPage", () => ({
  default: () => <div>profile-content-control-page</div>,
}));

describe("customer profile control module", () => {
  it("exports nested routes, nav items, and route meta", async () => {
    const feature = await import("@/features/customer-profile-control");

    expect(feature.customerProfileControlRoutes[0]?.path).toBe("/customer-profile-control");
    expect(feature.customerProfileControlRoutes[0]?.children).toHaveLength(2);
    expect(feature.customerProfileControlNavItems).toEqual([
      { path: "/customer-profile-control", label: "Customer Profiles" },
      { path: "/customer-profile-control/content", label: "Profile Content" },
    ]);
    expect(feature.customerProfileControlRouteMeta).toEqual([
      {
        pathPrefix: "/customer-profile-control/content",
        title: "Profile Content Manager",
        breadcrumb: "Customer Profile / Content",
      },
      {
        pathPrefix: "/customer-profile-control",
        title: "Customer Profile Manager",
        breadcrumb: "Customer Profile / Data",
      },
    ]);
  });

  it("re-exports types", async () => {
    const feature = await import("@/features/customer-profile-control");

    expect(feature.customerProfileControlNavItems).toHaveLength(2);
  });
});

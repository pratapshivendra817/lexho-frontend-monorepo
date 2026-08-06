import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/payouts/pages/PayoutsPage", () => ({
  default: () => <div>payouts-page</div>,
}));

import {
  payoutData,
  payoutsNavItems,
  payoutsRouteMeta,
  payoutsRoutes,
} from "@/features/payouts";

describe("payouts module", () => {
  it("exports the configured route, nav item, and route meta", () => {
    expect(payoutsRoutes).toHaveLength(1);
    expect(payoutsRoutes[0].path).toBe("/payouts");
    expect(payoutsRoutes[0].element).toBeTruthy();

    expect(payoutsNavItems).toEqual([
      {
        path: "/payouts",
        label: "Payouts",
      },
    ]);

    expect(payoutsRouteMeta).toEqual([
      {
        pathPrefix: "/payouts",
        title: "Partner Payouts",
        breadcrumb: "Finance / Payouts",
      },
    ]);
  });

  it("exports seeded payout data", () => {
    expect(payoutData).toHaveLength(3);
    expect(payoutData[0]).toMatchObject({
      id: "PO1",
      providerName: "Amit Sharma",
      status: "PENDING",
    });
    expect(payoutData[2]).toMatchObject({
      id: "PO3",
      providerName: "Sanjay Singh",
      status: "FAILED",
    });
  });
});

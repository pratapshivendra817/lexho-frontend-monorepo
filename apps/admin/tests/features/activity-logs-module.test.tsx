import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/activity-logs/pages/ActivityLogsPage", () => ({
  default: () => <div>activity-logs-page</div>,
}));

import {
  activityData,
  activityLogsNavItems,
  activityLogsRouteMeta,
  activityLogsRoutes,
} from "@/features/activity-logs";

describe("activity-logs module", () => {
  it("exports the configured route, nav item, and route meta", () => {
    expect(activityLogsRoutes).toHaveLength(1);
    expect(activityLogsRoutes[0].path).toBe("/activity-logs");
    expect(activityLogsRoutes[0].element).toBeTruthy();

    expect(activityLogsNavItems).toEqual([
      {
        path: "/activity-logs",
        label: "Activity Logs",
      },
    ]);

    expect(activityLogsRouteMeta).toEqual([
      {
        pathPrefix: "/activity-logs",
        title: "Activity Logs",
        breadcrumb: "Audit / Activity Logs",
      },
    ]);
  });

  it("exports seeded activity log data", () => {
    expect(activityData).toHaveLength(3);
    expect(activityData[0]).toMatchObject({ adminName: "Shivendra", role: "Super Admin", module: "User" });
    expect(activityData[2]).toMatchObject({ adminName: "Neha", role: "Finance", module: "Payment" });
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/operations/pages/WebhookEventsPage", () => ({
  default: () => <div>webhook-events-page</div>,
}));
vi.mock("@/features/operations/pages/WebhookDetailPage", () => ({
  default: () => <div>webhook-detail-page</div>,
}));
vi.mock("@/features/operations/pages/AuditLogsPage", () => ({
  default: () => <div>audit-logs-page</div>,
}));
vi.mock("@/features/operations/pages/AuditDetailPage", () => ({
  default: () => <div>audit-detail-page</div>,
}));

import {
  operationsNavItems,
  operationsRouteMeta,
  operationsRoutes,
} from "@/features/operations";

describe("operations module", () => {
  it("exports all operations routes", () => {
    expect(operationsRoutes).toHaveLength(5);
    expect(operationsRoutes.map((route) => route.path)).toEqual([
      "/webhooks",
      "/webhooks/:id",
      "/audit-logs",
      "/audit-logs/:id",
      "/activity-logs",
    ]);
    expect(operationsRoutes.every((route) => route.element)).toBe(true);
  });

  it("exports navigation items and route metadata", () => {
    expect(operationsNavItems).toEqual([
      { path: "/webhooks", label: "Razorpay Webhooks" },
      { path: "/audit-logs", label: "Audit Logs" },
    ]);

    expect(operationsRouteMeta).toEqual([
      { pathPrefix: "/webhooks", title: "Razorpay Webhooks", breadcrumb: "Monitoring / Razorpay Webhooks" },
      { pathPrefix: "/audit-logs", title: "Audit Logs", breadcrumb: "Audit / Logs" },
      { pathPrefix: "/activity-logs", title: "Audit Logs", breadcrumb: "Audit / Logs" },
    ]);
  });
});

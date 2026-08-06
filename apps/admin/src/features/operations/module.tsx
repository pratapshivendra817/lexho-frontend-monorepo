import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const WebhookEventsPage = lazy(() => import("./pages/WebhookEventsPage"));
const WebhookDetailPage = lazy(() => import("./pages/WebhookDetailPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const AuditDetailPage = lazy(() => import("./pages/AuditDetailPage"));

export const operationsRoutes: AdminRouteConfig[] = [
  { path: "/webhooks", element: <LazyScreen component={WebhookEventsPage} /> },
  { path: "/webhooks/:id", element: <LazyScreen component={WebhookDetailPage} /> },
  { path: "/audit-logs", element: <LazyScreen component={AuditLogsPage} /> },
  { path: "/audit-logs/:id", element: <LazyScreen component={AuditDetailPage} /> },
  { path: "/activity-logs", element: <LazyScreen component={AuditLogsPage} /> },
];

export const operationsNavItems: AdminNavItem[] = [
  { path: "/webhooks", label: "Razorpay Webhooks" },
  { path: "/audit-logs", label: "Audit Logs" },
];

export const operationsRouteMeta: AdminRouteMeta[] = [
  { pathPrefix: "/webhooks", title: "Razorpay Webhooks", breadcrumb: "Monitoring / Razorpay Webhooks" },
  { pathPrefix: "/audit-logs", title: "Audit Logs", breadcrumb: "Audit / Logs" },
  { pathPrefix: "/activity-logs", title: "Audit Logs", breadcrumb: "Audit / Logs" },
];

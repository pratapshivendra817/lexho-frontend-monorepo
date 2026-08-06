import { api } from "@/api/axios";

import type {
  AuditLog,
  AuditLogDetail,
  MonitoringDashboard,
  WebhookEvent,
  WebhookEventDetail,
  WebhookProcessingHistory,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number" ? String(value) : fallback;

const asHealthStatus = (...values: unknown[]) => {
  for (const value of values) {
    const direct = asString(value);
    if (direct) return direct;

    const nested = asRecord(value);
    const nestedStatus = asString(
      nested.status ??
        nested.health ??
        nested.state ??
        nested.value ??
        nested.overallStatus ??
        nested.serviceStatus,
    );
    if (nestedStatus) return nestedStatus;
  }
  return "UNKNOWN";
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const readArray = (payload: unknown, keys: string[]): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  for (const source of [root, nested]) {
    for (const key of keys) {
      if (Array.isArray(source[key])) return source[key] as UnknownRecord[];
    }
  }
  return [];
};

const readObject = (payload: unknown, keys: string[]) => {
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  for (const source of [root, nested]) {
    for (const key of keys) {
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) return value as UnknownRecord;
    }
  }
  return Object.keys(nested).length > 0 ? nested : root;
};

const mapWebhook = (row: UnknownRecord): WebhookEvent => ({
  id: asString(row.id ?? row.eventId ?? row.webhookEventId),
  eventType: asString(row.eventType ?? row.type),
  paymentId: asString(row.paymentId ?? row.razorpayPaymentId) || undefined,
  status: asString(row.status ?? row.processingStatus, "PENDING"),
  processedAt: asString(row.processedAt ?? row.updatedAt) || undefined,
  retryCount: asNumber(row.retryCount ?? row.retries),
  requestId: asString(row.requestId) || undefined,
  correlationId: asString(row.correlationId) || undefined,
});

const mapHistory = (row: UnknownRecord, index: number): WebhookProcessingHistory => ({
  id: asString(row.id ?? index),
  status: asString(row.status, "PENDING"),
  message: asString(row.message ?? row.errorMessage) || undefined,
  processedAt: asString(row.processedAt ?? row.createdAt) || undefined,
});

const mapAudit = (row: UnknownRecord): AuditLog => ({
  id: asString(row.id ?? row.auditId),
  date: asString(row.date ?? row.createdAt ?? row.timestamp),
  user: asString(row.user ?? row.adminName ?? row.username),
  role: asString(row.role),
  action: asString(row.action),
  entityType: asString(row.entityType ?? row.module),
  entityId: asString(row.entityId ?? row.referenceId),
  requestId: asString(row.requestId) || undefined,
  correlationId: asString(row.correlationId) || undefined,
});

export async function fetchMonitoringDashboard(): Promise<MonitoringDashboard> {
  const { data } = await api.get("/api/v1/admin/monitoring/dashboard");
  const source = readObject(data, ["data", "dashboard", "result"]);
  const health = asRecord(
    source.health ??
      source.systemHealth ??
      source.status ??
      source.healthStatus ??
      source.monitoringHealth,
  );
  const metrics = asRecord(source.metrics ?? source.counters ?? source.summary ?? source.monitoringMetrics);
  return {
    health: {
      system: asHealthStatus(
        health.system,
        health.overall,
        health.app,
        source.systemHealthStatus,
        source.systemStatus,
        source.overallStatus,
        source.status,
      ) as MonitoringDashboard["health"]["system"],
      api: asHealthStatus(
        health.api,
        health.backend,
        health.server,
        source.apiHealth,
        source.backendHealth,
        source.serverHealth,
        source.status,
      ) as MonitoringDashboard["health"]["api"],
      redis: asHealthStatus(
        health.redis,
        health.cache,
        source.redisHealth,
        source.cacheHealth,
      ) as MonitoringDashboard["health"]["redis"],
      database: asHealthStatus(
        health.database,
        health.db,
        source.databaseHealth,
        source.dbHealth,
      ) as MonitoringDashboard["health"]["database"],
      checkedAt: asString(
        health.checkedAt ??
          health.lastCheckedAt ??
          health.updatedAt ??
          source.checkedAt ??
          source.lastCheckedAt ??
          source.updatedAt ??
          source.timestamp,
      ) || undefined,
    },
    metrics: {
      ordersCreated: asNumber(
        metrics.ordersCreated ??
          metrics.createdOrders ??
          source.ordersCreated ??
          source.createdOrders ??
          source.bookingCreationCount,
      ),
      ordersCompleted: asNumber(
        metrics.ordersCompleted ??
          metrics.completedOrders ??
          source.ordersCompleted ??
          source.completedOrders ??
          source.completedBookings,
      ),
      paymentsSuccess: asNumber(
        metrics.paymentsSuccess ?? metrics.successfulPayments ?? source.paymentsSuccess ?? source.successfulPayments,
      ),
      paymentsFailed: asNumber(
        metrics.paymentsFailed ??
          metrics.failedPayments ??
          source.paymentsFailed ??
          source.failedPayments ??
          source.paymentFailureCount,
      ),
      partnerOnlineCount: asNumber(
        metrics.partnerOnlineCount ?? metrics.onlinePartners ?? source.partnerOnlineCount ?? source.onlinePartners,
      ),
    },
  };
}

export async function fetchWebhookEvents(params: { search?: string; eventType?: string; status?: string }) {
  const { data } = await api.get("/api/v1/admin/razorpay/webhooks", { params });
  return readArray(data, ["content", "items", "events", "results"]).map(mapWebhook);
}

export async function fetchWebhookEventDetail(id: string): Promise<WebhookEventDetail> {
  const { data } = await api.get(`/api/v1/admin/razorpay/webhooks/${id}`);
  const source = readObject(data, ["data", "event", "item", "result"]);
  return {
    ...mapWebhook(source),
    payload: source.payload ?? source.eventPayload ?? {},
    errorMessage: asString(source.errorMessage ?? source.error) || undefined,
    retryStatus: asString(source.retryStatus) || undefined,
    history: readArray(source.history ?? source.processingHistory, ["history", "processingHistory", "items"]).map(mapHistory),
  };
}

export async function fetchAuditLogs(params: {
  startDate?: string;
  endDate?: string;
  action?: string;
  user?: string;
  role?: string;
}) {
  const { data } = await api.get("/api/v1/admin/audit-logs", { params });
  return readArray(data, ["content", "items", "logs", "results"]).map(mapAudit);
}

export async function fetchAuditLogDetail(id: string): Promise<AuditLogDetail> {
  const { data } = await api.get(`/api/v1/admin/audit-logs/${id}`);
  const source = readObject(data, ["data", "audit", "item", "result"]);
  return {
    ...mapAudit(source),
    oldValue: source.oldValue,
    newValue: source.newValue,
    changeHistory: readArray(source.changeHistory ?? source.changes, ["changeHistory", "changes", "items"]).map((row, index) => ({
      id: asString(row.id ?? index),
      field: asString(row.field) || undefined,
      oldValue: row.oldValue,
      newValue: row.newValue,
      changedAt: asString(row.changedAt ?? row.createdAt) || undefined,
    })),
  };
}

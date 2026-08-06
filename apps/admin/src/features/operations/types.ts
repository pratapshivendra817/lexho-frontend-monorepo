export type HealthStatus = "UP" | "DOWN" | "DEGRADED" | "UNKNOWN";

export type SystemHealth = {
  system: HealthStatus;
  api: HealthStatus;
  redis: HealthStatus;
  database: HealthStatus;
  checkedAt?: string;
};

export type MonitoringMetrics = {
  ordersCreated: number;
  ordersCompleted: number;
  paymentsSuccess: number;
  paymentsFailed: number;
  partnerOnlineCount: number;
};

export type MonitoringDashboard = {
  health: SystemHealth;
  metrics: MonitoringMetrics;
};

export type WebhookEvent = {
  id: string;
  eventType: string;
  paymentId?: string;
  status: string;
  processedAt?: string;
  retryCount: number;
  requestId?: string;
  correlationId?: string;
};

export type WebhookProcessingHistory = {
  id: string;
  status: string;
  message?: string;
  processedAt?: string;
};

export type WebhookEventDetail = WebhookEvent & {
  payload: unknown;
  errorMessage?: string;
  retryStatus?: string;
  history: WebhookProcessingHistory[];
};

export type AuditLog = {
  id: string;
  date: string;
  user: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string;
  correlationId?: string;
};

export type AuditLogDetail = AuditLog & {
  oldValue?: unknown;
  newValue?: unknown;
  changeHistory: Array<{
    id: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    changedAt?: string;
  }>;
};

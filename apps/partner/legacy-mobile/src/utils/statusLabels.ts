type TranslationResolver = (key: string, fallback: string) => string;

function normalize(value: string | undefined | null) {
  return String(value ?? "").trim().toUpperCase();
}

export function getOrderStatusLabel(status: string | undefined, tr: TranslationResolver) {
  const normalized = normalize(status);
  const map: Record<string, string> = {
    NEW: tr("orders.status_new", "New"),
    CREATED: tr("orders.status_created", "Created"),
    ASSIGNED: tr("orders.status_assigned", "Assigned"),
    PENDING: tr("orders.status_pending", "Pending"),
    ACCEPTED: tr("orders.status_accepted", "Accepted"),
    ARRIVED: tr("orders.status_arrived", "Arrived"),
    REJECTED: tr("orders.status_rejected", "Rejected"),
    EXPIRED: tr("orders.status_expired", "Expired"),
    STARTED: tr("orders.status_started", "Started"),
    IN_PROGRESS: tr("orders.status_in_progress", "In Progress"),
    COMPLETED: tr("orders.status_completed", "Completed"),
    CANCELLED: tr("orders.status_cancelled", "Cancelled"),
  };
  return map[normalized] ?? (normalized || "-");
}

export function getOrderPriorityLabel(priority: string | undefined, tr: TranslationResolver) {
  const normalized = normalize(priority);
  const map: Record<string, string> = {
    LOW: tr("orders.priority_low", "Low"),
    NORMAL: tr("orders.priority_normal", "Normal"),
    HIGH: tr("orders.priority_high", "High"),
    URGENT: tr("orders.priority_urgent", "Urgent"),
  };
  return map[normalized] ?? (normalized || "-");
}

export function getBookingTypeLabel(type: string | undefined, tr: TranslationResolver) {
  const normalized = normalize(type);
  const map: Record<string, string> = {
    INSTANT: tr("orders.booking_type_instant", "Instant"),
    SCHEDULED: tr("orders.booking_type_scheduled", "Scheduled"),
  };
  return map[normalized] ?? (normalized || "-");
}

export function getLeaveStatusLabel(status: string | undefined, tr: TranslationResolver) {
  const normalized = normalize(status);
  const map: Record<string, string> = {
    PENDING: tr("leave.status_pending", "Pending"),
    APPROVED: tr("leave.status_approved", "Approved"),
    REJECTED: tr("leave.status_rejected", "Rejected"),
    CANCELLED: tr("leave.status_cancelled", "Cancelled"),
  };
  return map[normalized] ?? (normalized || "-");
}

export function getWarningTypeLabel(type: string | undefined, tr: TranslationResolver) {
  const normalized = normalize(type);
  const map: Record<string, string> = {
    WARNING: tr("warnings.type_warning", "Warning"),
    SUSPENSION: tr("warnings.type_suspension", "Suspension"),
    BLOCKED: tr("warnings.type_blocked", "Blocked"),
  };
  return map[normalized] ?? (normalized || "-");
}

export function getWarningStatusLabel(status: string | undefined, tr: TranslationResolver) {
  const normalized = normalize(status);
  const map: Record<string, string> = {
    ACTIVE: tr("warnings.status_active", "Active"),
    RESOLVED: tr("warnings.status_resolved", "Resolved"),
    CLOSED: tr("warnings.status_closed", "Closed"),
    PENDING: tr("warnings.pending", "Pending"),
    APPROVED: tr("warnings.approved", "Approved"),
    REJECTED: tr("warnings.rejected", "Rejected"),
  };
  return map[normalized] ?? (normalized || "-");
}

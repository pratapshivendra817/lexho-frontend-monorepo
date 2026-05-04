import { useParams } from "react-router-dom";

import { DataState } from "@/components/admin";

import { NotificationStatusBadge } from "../components";
import { useAdminNotificationDetailsQuery } from "../hooks/useAdminNotifications";

export default function NotificationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const detailsQuery = useAdminNotificationDetailsQuery(id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Notification Details</h2>
        <p className="text-sm text-[var(--color-muted)]">Audit and inspect a specific notification payload</p>
      </div>

      <DataState
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        isEmpty={!detailsQuery.data}
        loadingText="Loading notification..."
        errorText="Failed to load notification details"
        emptyText="Notification not found"
        onRetry={() => void detailsQuery.refetch()}
      >
        {detailsQuery.data ? (
          <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]">
            <p><strong>ID:</strong> {detailsQuery.data.id}</p>
            <p><strong>Title:</strong> {detailsQuery.data.title || "-"}</p>
            <p><strong>User Type:</strong> {detailsQuery.data.userType || "-"}</p>
            <p><strong>Notification Type:</strong> {detailsQuery.data.notificationType || "-"}</p>
            <p><strong>Channel:</strong> {detailsQuery.data.channelType || "-"}</p>
            <p><strong>Status:</strong> <NotificationStatusBadge status={detailsQuery.data.status} /></p>
            <p><strong>City Target:</strong> {detailsQuery.data.city || "-"}</p>
            <p><strong>Service Target:</strong> {detailsQuery.data.service || "-"}</p>
            <p><strong>Created:</strong> {detailsQuery.data.createdAt || "-"}</p>
            <p><strong>Scheduled:</strong> {detailsQuery.data.scheduledAt || "-"}</p>
            <p><strong>Read Count:</strong> {detailsQuery.data.readCount ?? 0}</p>
            <p><strong>Click Count:</strong> {detailsQuery.data.clickCount ?? 0}</p>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Message</p>
              <p className="mt-1">{detailsQuery.data.message || "-"}</p>
            </div>
          </div>
        ) : null}
      </DataState>
    </div>
  );
}

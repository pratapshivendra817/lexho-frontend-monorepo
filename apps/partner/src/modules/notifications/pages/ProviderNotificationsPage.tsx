import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { NotificationBell } from "../components/NotificationBell";
import { useProviderNotificationSocket } from "../hooks/useProviderNotificationSocket";
import { useProviderNotificationMutations, useProviderNotificationsQuery, useProviderUnreadCountQuery } from "../hooks/useProviderNotifications";

export function ProviderNotificationsPage() {
  const [page, setPage] = useState(0);
  const size = 10;

  const notificationsQuery = useProviderNotificationsQuery(page, size);
  const unreadCountQuery = useProviderUnreadCountQuery();
  const { invalidateAll, markReadMutation } = useProviderNotificationMutations();

  useProviderNotificationSocket({
    onMessage: () => {
      toast.success("New provider alert received");
      void invalidateAll();
    },
  });

  const rows = notificationsQuery.data?.content ?? [];
  const totalPages = notificationsQuery.data?.totalPages ?? 1;
  const unreadCount = unreadCountQuery.data ?? 0;

  const summary = useMemo(() => {
    const jobs = rows.filter((row) => row.type.toUpperCase().includes("JOB")).length;
    const payments = rows.filter((row) => row.type.toUpperCase().includes("PAYMENT")).length;
    const reviews = rows.filter((row) => row.type.toUpperCase().includes("REVIEW")).length;
    return { jobs, payments, reviews };
  }, [rows]);

  return (
    <section className="panel light-panel stack">
      <div className="panel-header">
        <div>
          <h2>Provider Notifications</h2>
          <p className="item-subtitle">Job assignment alerts, payments, booking updates and reviews</p>
        </div>
        <NotificationBell unreadCount={unreadCount} />
      </div>

      <div className="metrics">
        <article className="metric-card">
          <p className="metric-label">Unread Alerts</p>
          <p className="metric-value">{unreadCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Job Alerts (Page)</p>
          <p className="metric-value">{summary.jobs}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Payment Alerts (Page)</p>
          <p className="metric-value">{summary.payments}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Review Alerts (Page)</p>
          <p className="metric-value">{summary.reviews}</p>
        </article>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="stack">
          <div className="partner-notify-skeleton" />
          <div className="partner-notify-skeleton" />
          <div className="partner-notify-skeleton" />
        </div>
      ) : notificationsQuery.isError ? (
        <div className="stack">
          <p className="error-text">Failed to fetch notifications</p>
          <button type="button" className="small-action" onClick={() => void notificationsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="item-subtitle">No notifications found</p>
      ) : (
        <div className="list">
          {rows.map((notification) => (
            <article key={notification.id} className={`list-item light ${notification.read ? "" : "partner-notify-unread"}`}>
              <div>
                <p className="item-title">{notification.title}</p>
                <p className="item-subtitle">{notification.message}</p>
                <p className="item-subtitle">
                  {notification.type} •{" "}
                  {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "-"}
                </p>
              </div>
              <div className="inline-actions">
                {!notification.read ? (
                  <button
                    type="button"
                    className="small-action"
                    onClick={() => {
                      markReadMutation.mutate(notification.id, {
                        onSuccess: () => toast.success("Marked as read"),
                        onError: () => toast.error("Unable to mark as read"),
                      });
                    }}
                  >
                    Mark Read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="inline-actions">
        <button
          type="button"
          className="small-action"
          disabled={page <= 0}
          onClick={() => setPage((prev) => Math.max(0, prev - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="small-action"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </button>
        <span className="item-subtitle">
          Page {page + 1} / {totalPages}
        </span>
      </div>
    </section>
  );
}

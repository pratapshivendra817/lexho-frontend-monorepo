import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { ConfirmDialog } from "@lexho/ui";

import { NotificationBell } from "../components/NotificationBell";
import { useCustomerNotificationSocket } from "../hooks/useCustomerNotificationSocket";
import {
  useCustomerNotificationMutations,
  useCustomerNotificationsQuery,
  useCustomerUnreadCountQuery,
} from "../hooks/useCustomerNotifications";
import type { CustomerNotification } from "../types";

function getRedirectPath(notificationType: string) {
  const type = notificationType.toUpperCase();
  if (type === "BOOKING") return "/bookings";
  if (type === "PAYMENT") return "/payments";
  if (type === "OFFER") return "/offers";
  if (type === "REVIEW") return "/reviews";
  return "/";
}

export function CustomerNotificationsPage() {
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CustomerNotification | null>(null);
  const size = 10;

  const notificationsQuery = useCustomerNotificationsQuery(page, size);
  const unreadCountQuery = useCustomerUnreadCountQuery();
  const { deleteMutation, markReadMutation, invalidateAll } = useCustomerNotificationMutations();

  useCustomerNotificationSocket({
    onMessage: () => {
      void invalidateAll();
    },
  });

  const rows = notificationsQuery.data?.content ?? [];
  const unreadCount = unreadCountQuery.data ?? 0;
  const totalPages = notificationsQuery.data?.totalPages ?? 1;

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => Number(a.read) - Number(b.read)),
    [rows],
  );

  const openNotification = (notification: CustomerNotification) => {
    markReadMutation.mutate(notification.id, {
      onError: () => toast.error("Unable to mark as read"),
    });
    const path = getRedirectPath(notification.type);
    toast.success(`Redirecting to ${path}`);
    window.location.hash = path;
  };

  return (
    <section className="panel light-panel stack">
      <div className="panel-header">
        <div>
          <h2>Notification Center</h2>
          <p className="item-subtitle">Booking, payment, offers and review updates</p>
        </div>
        <NotificationBell unreadCount={unreadCount} items={sortedRows} onOpenItem={openNotification} />
      </div>

      {notificationsQuery.isLoading ? (
        <div className="stack">
          <div className="notify-skeleton" />
          <div className="notify-skeleton" />
          <div className="notify-skeleton" />
        </div>
      ) : notificationsQuery.isError ? (
        <div className="stack">
          <p className="error-text">Unable to load notifications</p>
          <button type="button" className="small-action" onClick={() => void notificationsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : sortedRows.length === 0 ? (
        <p className="item-subtitle">No notifications found</p>
      ) : (
        <div className="list">
          {sortedRows.map((notification) => (
            <div key={notification.id} className={`list-item light ${notification.read ? "" : "notify-unread"}`}>
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
                <button type="button" className="small-action" onClick={() => openNotification(notification)}>
                  Open
                </button>
                <button type="button" className="small-action" onClick={() => setDeleteTarget(notification)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="inline-actions">
        <button type="button" className="small-action" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Notification"
        description="This notification will be removed from your list."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Notification deleted");
              setDeleteTarget(null);
            },
            onError: () => toast.error("Unable to delete notification"),
          });
        }}
      />
    </section>
  );
}

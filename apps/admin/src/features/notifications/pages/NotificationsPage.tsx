import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ConfirmDialog, DataState, DataTable, Modal, Pagination, Skeleton } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { useAdminNotificationDetailsQuery, useAdminNotificationMutations, useAdminNotificationsQuery, useAdminNotificationStatsQuery } from "../hooks/useAdminNotifications";
import { useAdminNotificationSocket } from "../hooks/useAdminNotificationSocket";
import {
  NotificationStatsCards,
  NotificationStatusBadge,
  NotificationsFiltersBar,
} from "../components";
import type { AdminNotification, SendAdminNotificationPayload } from "../types";
import { sendNotificationSchema, type SendNotificationFormValues } from "../validation/notificationSchema";

const emptyStats = {
  totalSent: 0,
  totalFailed: 0,
  totalRead: 0,
  totalPending: 0,
  totalClicked: 0,
  channelWiseStats: [],
  trend: [],
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [userType, setUserType] = useState("");
  const [notificationType, setNotificationType] = useState("");
  const [channelType, setChannelType] = useState("");
  const [status, setStatus] = useState("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [retryTarget, setRetryTarget] = useState<AdminNotification | null>(null);

  const debouncedSearch = useDebounce(searchInput, 450);
  const statsQuery = useAdminNotificationStatsQuery();
  const listQuery = useAdminNotificationsQuery({
    page: page - 1,
    size: 10,
    search: debouncedSearch || undefined,
    userType: userType || undefined,
    notificationType: notificationType || undefined,
    channelType: channelType || undefined,
    status: status || undefined,
  });
  const detailsQuery = useAdminNotificationDetailsQuery(detailsId ?? undefined);
  const { retryMutation, sendMutation } = useAdminNotificationMutations();

  useAdminNotificationSocket({
    onMessage: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-notification-stats"] });
    },
  });

  const form = useForm<SendNotificationFormValues>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      title: "",
      message: "",
      notificationType: "BOOKING",
      channelType: "PUSH",
      userType: "ALL_USERS",
      city: "",
      service: "",
      scheduleTime: "",
    },
  });

  const stats = statsQuery.data ?? emptyStats;
  const rows = listQuery.data?.content ?? [];
  const total = listQuery.data?.totalElements ?? 0;

  const handleSend = (values: SendNotificationFormValues) => {
    const payload: SendAdminNotificationPayload = {
      ...values,
      city: values.city || undefined,
      service: values.service || undefined,
      scheduleTime: values.scheduleTime || undefined,
    };
    sendMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Notification queued successfully");
        setSendModalOpen(false);
        form.reset();
      },
      onError: (error) => toast.error(extractApiError(error, "Failed to send notification")),
    });
  };

  const rowsWithDate = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        displayDate: row.createdAt ? new Date(row.createdAt).toLocaleString() : "-",
      })),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Notification Management</h2>
          <p className="text-sm text-[var(--color-muted)]">Send campaigns, monitor status, and retry failures</p>
        </div>
        <button
          type="button"
          onClick={() => setSendModalOpen(true)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Send Notification
        </button>
      </div>

      <NotificationStatsCards stats={stats} />

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Channel Wise Stats</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <BarChart data={stats.channelWiseStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Notification Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <LineChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="#22c55e" />
                <Line type="monotone" dataKey="failed" stroke="#f43f5e" />
                <Line type="monotone" dataKey="read" stroke="#38bdf8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <NotificationsFiltersBar
        search={searchInput}
        userType={userType}
        notificationType={notificationType}
        channelType={channelType}
        status={status}
        onSearchChange={setSearchInput}
        onUserTypeChange={setUserType}
        onNotificationTypeChange={setNotificationType}
        onChannelTypeChange={setChannelType}
        onStatusChange={setStatus}
        onReset={() => {
          setSearchInput("");
          setUserType("");
          setNotificationType("");
          setChannelType("");
          setStatus("");
        }}
      />

      <DataState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading notifications..."
        errorText="Failed to fetch notifications"
        emptyText="No notifications found"
        onRetry={() => void listQuery.refetch()}
      >
        {listQuery.isFetching ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        <DataTable
          rows={rowsWithDate}
          rowKey={(row) => row.id}
          columns={[
            { key: "title", header: "Title", render: (row) => row.title || "-" },
            { key: "userType", header: "User Type", render: (row) => row.userType || "-" },
            { key: "type", header: "Type", render: (row) => row.notificationType || "-" },
            { key: "channel", header: "Channel", render: (row) => row.channelType || "-" },
            { key: "status", header: "Status", render: (row) => <NotificationStatusBadge status={row.status} /> },
            { key: "created", header: "Created", render: (row) => row.displayDate },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                    onClick={() => setDetailsId(row.id)}
                  >
                    Quick View
                  </button>
                  <Link to={`/notifications/${row.id}`} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                    Details Page
                  </Link>
                  {row.status === "FAILED" ? (
                    <button
                      type="button"
                      className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300"
                      onClick={() => setRetryTarget(row)}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
        <Pagination page={page} total={total} limit={10} onPageChange={setPage} />
      </DataState>

      <Modal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Notification"
        maxWidthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSendModalOpen(false)}
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={form.handleSubmit(handleSend)}
              disabled={sendMutation.isPending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {sendMutation.isPending ? "Sending..." : "Send"}
            </button>
          </div>
        }
      >
        <form className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Title</label>
            <input className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("title")} />
            {form.formState.errors.title ? <p className="mt-1 text-xs text-rose-300">{form.formState.errors.title.message}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Message</label>
            <textarea className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" rows={4} {...form.register("message")} />
            {form.formState.errors.message ? <p className="mt-1 text-xs text-rose-300">{form.formState.errors.message.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Notification Type</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("notificationType")}>
              <option value="BOOKING">Booking</option>
              <option value="PAYMENT">Payment</option>
              <option value="OFFER">Offer</option>
              <option value="REVIEW">Review</option>
              <option value="PROMOTION">Promotion</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Channel</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("channelType")}>
              <option value="PUSH">Push</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="IN_APP">In App</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Target User Type</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("userType")}>
              <option value="ALL_USERS">All Users</option>
              <option value="CUSTOMERS">Customers</option>
              <option value="PROVIDERS">Providers</option>
              <option value="CITY_USERS">City Specific Users</option>
              <option value="PREMIUM_USERS">Premium Users</option>
              <option value="INACTIVE_USERS">Inactive Users</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">City (optional)</label>
            <input className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("city")} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Service (optional)</label>
            <input className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("service")} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Schedule Time (optional)</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              {...form.register("scheduleTime")}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detailsId)}
        onClose={() => setDetailsId(null)}
        title="Notification Details"
        maxWidthClassName="max-w-2xl"
      >
        <DataState
          isLoading={detailsQuery.isLoading}
          isError={detailsQuery.isError}
          isEmpty={!detailsQuery.data}
          loadingText="Loading details..."
          errorText="Failed to load details"
          emptyText="Notification not found"
          onRetry={() => void detailsQuery.refetch()}
        >
          {detailsQuery.data ? (
            <div className="grid gap-2 text-sm text-[var(--color-text)]">
              <p><strong>Title:</strong> {detailsQuery.data.title || "-"}</p>
              <p><strong>User Type:</strong> {detailsQuery.data.userType || "-"}</p>
              <p><strong>Type:</strong> {detailsQuery.data.notificationType || "-"}</p>
              <p><strong>Channel:</strong> {detailsQuery.data.channelType || "-"}</p>
              <p><strong>Status:</strong> <NotificationStatusBadge status={detailsQuery.data.status} /></p>
              <p><strong>Created:</strong> {detailsQuery.data.createdAt || "-"}</p>
              <p><strong>Message:</strong> {detailsQuery.data.message || "-"}</p>
            </div>
          ) : null}
        </DataState>
      </Modal>

      <ConfirmDialog
        open={Boolean(retryTarget)}
        title="Retry Notification"
        description={retryTarget ? `Retry failed notification "${retryTarget.title}"?` : ""}
        confirmLabel="Retry"
        isLoading={retryMutation.isPending}
        onClose={() => setRetryTarget(null)}
        onConfirm={() => {
          if (!retryTarget) return;
          retryMutation.mutate(retryTarget.id, {
            onSuccess: () => {
              toast.success("Retry triggered");
              setRetryTarget(null);
            },
            onError: (error) => toast.error(extractApiError(error, "Retry failed")),
          });
        }}
      />
    </div>
  );
}

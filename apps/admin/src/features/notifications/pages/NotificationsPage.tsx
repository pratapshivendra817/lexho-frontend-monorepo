import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ConfirmDialog, DataState, DataTable, Modal, Pagination, Skeleton } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { initializeAdminPushNotifications } from "@/services/adminPushNotifications";
import { extractApiError } from "@/utils/apiError";
import { shareContent } from "@/utils/share";

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

const channelOptions = [
  { label: "In App", value: "IN_APP" },
  { label: "Push", value: "PUSH" },
  { label: "Email", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
] as const;

function parseUserIds(value?: string) {
  return String(value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

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

  const handleSocketMessage = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-notification-stats"] });
  }, [queryClient]);

  useAdminNotificationSocket({ onMessage: handleSocketMessage });

  const form = useForm<SendNotificationFormValues>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      title: "",
      message: "",
      notificationType: "BOOKING",
      priority: "MEDIUM",
      channels: ["IN_APP"],
      targetUserType: "CUSTOMER",
      userIds: "",
      referenceType: "",
      referenceId: "",
      redirectType: "",
      redirectValue: "",
      city: "",
      scheduledTime: "",
    },
  });

  const stats = statsQuery.data ?? emptyStats;
  const rows = listQuery.data?.content ?? [];
  const total = listQuery.data?.totalElements ?? 0;

  const handleSend = (values: SendNotificationFormValues) => {
    const userIds = parseUserIds(values.userIds);
    const payload: SendAdminNotificationPayload = {
      ...values,
      userIds: userIds.length > 0 ? userIds : undefined,
      referenceType: values.referenceType || undefined,
      referenceId: values.referenceId || undefined,
      redirectType: values.redirectType || undefined,
      redirectValue: values.redirectValue || undefined,
      city: values.city || undefined,
      scheduledTime: values.scheduledTime || undefined,
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

  const toggleChannel = (value: string) => {
    const current = form.getValues("channels") ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    form.setValue("channels", next, { shouldDirty: true, shouldValidate: true });
  };

  const rowsWithDate = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        displayDate: row.createdAt ? new Date(row.createdAt).toLocaleString() : "-",
      })),
    [rows],
  );
  const shareNotification = (notification: AdminNotification) => {
    void shareContent({
      title: notification.title || "Notification",
      text: `Type: ${notification.notificationType || "-"}\nChannel: ${notification.channelType || "-"}\nStatus: ${notification.status || "-"}\nMessage: ${notification.message || "-"}`,
      url: `${window.location.origin}/notifications/${notification.id}`,
      successMessage: "Notification details copied",
    });
  };
  const handleEnableBrowserPush = async () => {
    try {
      const enabled = await initializeAdminPushNotifications();
      if (enabled) {
        toast.success("Browser push enabled");
        return;
      }
      if ("Notification" in window && Notification.permission === "denied") {
        toast.error("Browser notification permission is blocked. Enable it from Chrome site settings.");
        return;
      }
      toast.error("Browser push could not be enabled. Check Firebase config and browser support.");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to enable browser push"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Notification Management</h2>
          <p className="text-sm text-[var(--color-muted)]">Send campaigns, monitor status, and retry failures</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleEnableBrowserPush}
            className="rounded border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
          >
            Enable Browser Push
          </button>
          <button
            type="button"
            onClick={() => setSendModalOpen(true)}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          >
            Send Notification
          </button>
        </div>
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
                  <button
                    type="button"
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                    onClick={() => shareNotification(row)}
                  >
                    Share
                  </button>
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
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Priority</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("priority")}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Channels</label>
            <div className="grid grid-cols-2 gap-2 rounded border border-[var(--color-border)] p-2">
              {channelOptions.map((option) => {
                const checked = (form.watch("channels") ?? []).includes(option.value);
                return (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChannel(option.value)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {form.formState.errors.channels ? <p className="mt-1 text-xs text-rose-300">{form.formState.errors.channels.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Target User Type</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("targetUserType")}>
              <option value="CUSTOMER">Customer</option>
              <option value="PARTNER">Partner</option>
              <option value="ADMIN">Admin</option>
              <option value="ALL_USERS">All Users</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">User IDs (optional)</label>
            <input
              placeholder="101, 102"
              className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              {...form.register("userIds")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Reference Type (optional)</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("referenceType")}>
              <option value="">None</option>
              <option value="BOOKING">Booking</option>
              <option value="PAYMENT">Payment</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="PROMOTION">Promotion</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Reference ID (optional)</label>
            <input className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("referenceId")} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Redirect Type (optional)</label>
            <select className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("redirectType")}>
              <option value="">None</option>
              <option value="BOOKING">Booking</option>
              <option value="PAYMENT">Payment</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="PROMOTION">Promotion</option>
              <option value="NOTIFICATIONS">Notifications</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Redirect Value (optional)</label>
            <input placeholder="123 or OFFER20" className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("redirectValue")} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">City (optional)</label>
            <input className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" {...form.register("city")} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Schedule Time (optional)</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              {...form.register("scheduledTime")}
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
              <div className="mb-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!detailsQuery.data) return;
                    shareNotification(detailsQuery.data);
                  }}
                  className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                >
                  Share
                </button>
              </div>
              <p><strong>Title:</strong> {detailsQuery.data.title || "-"}</p>
              <p><strong>User Type:</strong> {detailsQuery.data.userType || "-"}</p>
              <p><strong>Type:</strong> {detailsQuery.data.notificationType || "-"}</p>
              <p><strong>Channel:</strong> {detailsQuery.data.channelType || "-"}</p>
              <p><strong>Status:</strong> <NotificationStatusBadge status={detailsQuery.data.status} /></p>
              {detailsQuery.data.failureReason ? (
                <p><strong>Failure Reason:</strong> {detailsQuery.data.failureReason}</p>
              ) : null}
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



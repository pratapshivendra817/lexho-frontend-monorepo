import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DataState, DataTable, Modal, Pagination, Skeleton } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { RatingStars, ReviewStatusBadge, ReviewsFiltersBar, ReviewsStatsCards } from "../components";
import {
  useAdminReviewDetailsQuery,
  useAdminReviewMutations,
  useAdminReviewsQuery,
  useAdminReviewSettingsQuery,
  useAdminReviewStatsQuery,
  useReportedAdminReviewsQuery,
} from "../hooks/useAdminReviews";
import type {
  AdminReportedReviewRow,
  AdminReview,
  AdminReviewReportStatus,
  AdminReviewsStats,
  AdminReviewSettings,
  AdminReviewSortDir,
  AdminReviewStatus,
} from "../types";

type ActiveTab = "all" | "reported" | "settings";

type ModerationActionType =
  | "approve"
  | "reject"
  | "hide"
  | "unhide"
  | "dismiss-report"
  | "hide-from-report"
  | "reject-from-report";

type ModerationTarget =
  | { entity: "review"; type: ModerationActionType; review: AdminReview }
  | { entity: "report"; type: ModerationActionType; row: AdminReportedReviewRow }
  | null;

const emptyStats: AdminReviewsStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  hidden: 0,
  reported: 0,
  averageRating: 0,
  ratingDistribution: [],
};

const emptySettings: AdminReviewSettings = {
  reviewsEnabled: true,
  ratingEnabled: true,
  writtenReviewsEnabled: true,
  autoApproveReviews: false,
  services: [],
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function getModalCopy(target: ModerationTarget) {
  if (!target) return { title: "Confirm Action", description: "", reasonRequired: false, confirmLabel: "Confirm" };
  if (target.entity === "review") {
    switch (target.type) {
      case "approve":
        return {
          title: "Approve Review",
          description: `Approve review ${target.review.id}? You can optionally add a moderation reason.`,
          reasonRequired: false,
          confirmLabel: "Approve",
        };
      case "reject":
        return {
          title: "Reject Review",
          description: `Reject review ${target.review.id}? A reason is required for audit history.`,
          reasonRequired: true,
          confirmLabel: "Reject",
        };
      case "hide":
        return {
          title: "Hide Review",
          description: `Hide review ${target.review.id}? A reason is required for audit history.`,
          reasonRequired: true,
          confirmLabel: "Hide",
        };
      case "unhide":
        return {
          title: "Unhide Review",
          description: `Restore review ${target.review.id}? You can optionally add a restoration reason.`,
          reasonRequired: false,
          confirmLabel: "Unhide",
        };
      default:
        return { title: "Confirm Action", description: "", reasonRequired: false, confirmLabel: "Confirm" };
    }
  }
  switch (target.type) {
    case "dismiss-report":
      return {
        title: "Dismiss Report",
        description: `Dismiss report ${target.row.reportId}?`,
        reasonRequired: false,
        confirmLabel: "Dismiss",
      };
    case "hide-from-report":
      return {
        title: "Hide Review From Report",
        description: `Hide review ${target.row.review.id} from report ${target.row.reportId}?`,
        reasonRequired: false,
        confirmLabel: "Hide Review",
      };
    case "reject-from-report":
      return {
        title: "Reject Review From Report",
        description: `Reject review ${target.row.review.id} from report ${target.row.reportId}?`,
        reasonRequired: false,
        confirmLabel: "Reject Review",
      };
    default:
      return { title: "Confirm Action", description: "", reasonRequired: false, confirmLabel: "Confirm" };
  }
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<ActiveTab>("all");
  const [page, setPage] = useState(1);
  const [reportedPage, setReportedPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<AdminReviewStatus | "">("");
  const [reportedStatus, setReportedStatus] = useState<AdminReviewReportStatus | "">("");
  const [rating, setRating] = useState<number | "">("");
  const [providerId, setProviderId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<AdminReviewSortDir>("desc");
  const [reported, setReported] = useState<boolean | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionTarget, setActionTarget] = useState<ModerationTarget>(null);
  const [actionReason, setActionReason] = useState("");
  const [detailReviewId, setDetailReviewId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<AdminReviewSettings>(emptySettings);

  const debouncedSearch = useDebounce(searchInput, 450);
  const reviewsQuery = useAdminReviewsQuery({
    page: page - 1,
    size: 10,
    sortBy,
    sortDir,
    status,
    rating: rating === "" ? undefined : rating,
    providerId: providerId || undefined,
    serviceId: serviceId || undefined,
    search: debouncedSearch || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    reported,
  });
  const reportedQuery = useReportedAdminReviewsQuery({ page: reportedPage - 1, size: 10, status: reportedStatus });
  const statsQuery = useAdminReviewStatsQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    serviceId: serviceId || undefined,
    providerId: providerId || undefined,
  });
  const detailQuery = useAdminReviewDetailsQuery(detailReviewId ?? undefined);
  const settingsQuery = useAdminReviewSettingsQuery();

  const {
    approveMutation,
    rejectMutation,
    hideMutation,
    unhideMutation,
    dismissReportMutation,
    hideFromReportMutation,
    rejectFromReportMutation,
    saveSettingsMutation,
  } = useAdminReviewMutations();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, endDate, providerId, rating, reported, serviceId, sortBy, sortDir, startDate, status]);

  useEffect(() => {
    setReportedPage(1);
  }, [reportedStatus]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSettingsForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const rows = reviewsQuery.data?.content ?? [];
  const total = reviewsQuery.data?.totalElements ?? 0;
  const reportedRows = reportedQuery.data?.content ?? [];
  const reportedTotal = reportedQuery.data?.totalElements ?? 0;
  const stats = statsQuery.data ?? emptyStats;
  const modalCopy = getModalCopy(actionTarget);
  const settingsDirty = JSON.stringify(settingsForm) !== JSON.stringify(settingsQuery.data ?? emptySettings);
  const isActionLoading =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    hideMutation.isPending ||
    unhideMutation.isPending ||
    dismissReportMutation.isPending ||
    hideFromReportMutation.isPending ||
    rejectFromReportMutation.isPending;

  const ratingDistributionChart = useMemo(
    () =>
      [...stats.ratingDistribution]
        .sort((a, b) => a.rating - b.rating)
        .map((item) => ({ label: `${item.rating}★`, count: item.count })),
    [stats.ratingDistribution],
  );

  const closeActionModal = () => {
    setActionTarget(null);
    setActionReason("");
  };

  const handleActionConfirm = () => {
    if (!actionTarget) return;
    const reason = actionReason.trim();
    if (modalCopy.reasonRequired && !reason) {
      toast.error("Reason is required for this action.");
      return;
    }

    if (actionTarget.entity === "review") {
      const id = actionTarget.review.id;
      if (actionTarget.type === "approve") {
        approveMutation.mutate(
          { id, reason: reason || undefined },
          {
            onSuccess: () => {
              toast.success("Review approved");
              closeActionModal();
            },
            onError: (error) => toast.error(extractApiError(error, "Unable to approve review")),
          },
        );
        return;
      }
      if (actionTarget.type === "reject") {
        rejectMutation.mutate(
          { id, reason },
          {
            onSuccess: () => {
              toast.success("Review rejected");
              closeActionModal();
            },
            onError: (error) => toast.error(extractApiError(error, "Unable to reject review")),
          },
        );
        return;
      }
      if (actionTarget.type === "hide") {
        hideMutation.mutate(
          { id, reason },
          {
            onSuccess: () => {
              toast.success("Review hidden");
              closeActionModal();
            },
            onError: (error) => toast.error(extractApiError(error, "Unable to hide review")),
          },
        );
        return;
      }
      unhideMutation.mutate(
        { id, reason: reason || undefined },
        {
          onSuccess: () => {
            toast.success("Review restored");
            closeActionModal();
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to unhide review")),
        },
      );
      return;
    }

    const reportId = actionTarget.row.reportId;
    if (actionTarget.type === "dismiss-report") {
      dismissReportMutation.mutate(reportId, {
        onSuccess: () => {
          toast.success("Report dismissed");
          closeActionModal();
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to dismiss report")),
      });
      return;
    }
    if (actionTarget.type === "hide-from-report") {
      hideFromReportMutation.mutate(reportId, {
        onSuccess: () => {
          toast.success("Review hidden from report");
          closeActionModal();
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to hide review from report")),
      });
      return;
    }
    rejectFromReportMutation.mutate(reportId, {
      onSuccess: () => {
        toast.success("Review rejected from report");
        closeActionModal();
      },
      onError: (error) => toast.error(extractApiError(error, "Unable to reject review from report")),
    });
  };

  const reviewActions = (row: AdminReview) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => setDetailReviewId(row.id)}>
        View
      </button>
      {row.status !== "APPROVED" ? (
        <button type="button" className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300" onClick={() => setActionTarget({ entity: "review", type: "approve", review: row })}>
          Approve
        </button>
      ) : null}
      {row.status !== "REJECTED" ? (
        <button type="button" className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300" onClick={() => setActionTarget({ entity: "review", type: "reject", review: row })}>
          Reject
        </button>
      ) : null}
      {row.status !== "HIDDEN" ? (
        <button type="button" className="rounded border border-zinc-500/30 px-2 py-1 text-xs text-zinc-300" onClick={() => setActionTarget({ entity: "review", type: "hide", review: row })}>
          Hide
        </button>
      ) : (
        <button type="button" className="rounded border border-sky-500/30 px-2 py-1 text-xs text-sky-300" onClick={() => setActionTarget({ entity: "review", type: "unhide", review: row })}>
          Unhide
        </button>
      )}
    </div>
  );

  const reportedActions = (row: AdminReportedReviewRow) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => setDetailReviewId(row.review.id)}>
        View
      </button>
      <button type="button" className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300" onClick={() => setActionTarget({ entity: "report", type: "dismiss-report", row })}>
        Dismiss
      </button>
      <button type="button" className="rounded border border-zinc-500/30 px-2 py-1 text-xs text-zinc-300" onClick={() => setActionTarget({ entity: "report", type: "hide-from-report", row })}>
        Hide Review
      </button>
      <button type="button" className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300" onClick={() => setActionTarget({ entity: "report", type: "reject-from-report", row })}>
        Reject Review
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Review Management</h2>
          <p className="text-sm text-[var(--color-muted)]">Moderate, audit and analyze marketplace reviews</p>
        </div>
      </div>

      <ReviewsStatsCards stats={stats} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Rating Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <BarChart data={ratingDistributionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Stats Filter Scope</h3>
          <div className="space-y-2 text-sm text-[var(--color-muted)]">
            <p>Stats respect the current date/provider/service filters from the review list.</p>
            <p><strong className="text-[var(--color-text)]">Provider ID:</strong> {providerId || "-"}</p>
            <p><strong className="text-[var(--color-text)]">Service ID:</strong> {serviceId || "-"}</p>
            <p><strong className="text-[var(--color-text)]">From:</strong> {startDate || "-"}</p>
            <p><strong className="text-[var(--color-text)]">To:</strong> {endDate || "-"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab("all")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "all" ? "bg-blue-600 text-white" : "border border-[var(--color-border)]"}`}>
          All Reviews
        </button>
        <button type="button" onClick={() => setTab("reported")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "reported" ? "bg-blue-600 text-white" : "border border-[var(--color-border)]"}`}>
          Reported Reviews
        </button>
        <button type="button" onClick={() => setTab("settings")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "settings" ? "bg-blue-600 text-white" : "border border-[var(--color-border)]"}`}>
          Review Settings
        </button>
      </div>

      {tab === "all" ? (
        <>
          <ReviewsFiltersBar
            search={searchInput}
            status={status}
            rating={rating}
            providerId={providerId}
            serviceId={serviceId}
            sortBy={sortBy}
            sortDir={sortDir}
            reported={reported}
            startDate={startDate}
            endDate={endDate}
            onSearchChange={setSearchInput}
            onStatusChange={setStatus}
            onRatingChange={setRating}
            onProviderIdChange={setProviderId}
            onServiceIdChange={setServiceId}
            onSortByChange={setSortBy}
            onSortDirChange={setSortDir}
            onReportedChange={setReported}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => {
              setSearchInput("");
              setStatus("");
              setRating("");
              setProviderId("");
              setServiceId("");
              setSortBy("createdAt");
              setSortDir("desc");
              setReported("");
              setStartDate("");
              setEndDate("");
            }}
          />

          <DataState
            isLoading={reviewsQuery.isLoading}
            isError={reviewsQuery.isError}
            isEmpty={rows.length === 0}
            loadingText="Loading reviews..."
            errorText="Failed to load reviews"
            emptyText="No reviews found"
            onRetry={() => void reviewsQuery.refetch()}
          >
            {reviewsQuery.isFetching ? (
              <div className="grid gap-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : null}

            <DataTable
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: "booking",
                  header: "Booking",
                  render: (row) =>
                    row.bookingId ? (
                      <Link to={`/bookings/${row.bookingId}`} className="font-mono text-xs text-blue-300 hover:underline">
                        {row.bookingId}
                      </Link>
                    ) : (
                      "-"
                    ),
                },
                {
                  key: "customer",
                  header: "Customer",
                  render: (row) => (
                    <div>
                      <p>{row.customerName || "-"}</p>
                      {row.customerId ? <p className="font-mono text-[11px] text-[var(--color-muted)]">{row.customerId}</p> : null}
                    </div>
                  ),
                },
                {
                  key: "partner",
                  header: "Partner",
                  render: (row) => row.partnerName || row.partnerId || "-",
                },
                { key: "service", header: "Service", render: (row) => row.serviceName || "-" },
                { key: "rating", header: "Rating", render: (row) => <RatingStars rating={row.rating} /> },
                { key: "comment", header: "Comment", render: (row) => <span className="line-clamp-2 text-xs text-[var(--color-muted)]">{row.reviewText || row.comment || "-"}</span> },
                { key: "status", header: "Status", render: (row) => <ReviewStatusBadge status={row.status} /> },
                { key: "reports", header: "Reports", render: (row) => String(row.reportCount) },
                { key: "created", header: "Created", render: (row) => formatDateTime(row.createdAt) },
                { key: "actions", header: "Actions", render: reviewActions },
              ]}
            />

            <Pagination page={page} total={total} limit={10} onPageChange={setPage} />
          </DataState>
        </>
      ) : null}

      {tab === "reported" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <select
              value={reportedStatus}
              onChange={(event) => setReportedStatus(event.target.value as AdminReviewReportStatus | "")}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="">All report statuses</option>
              <option value="OPEN">Open</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ACTION_TAKEN">Action Taken</option>
            </select>
            <button type="button" onClick={() => setReportedStatus("")} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
              Reset
            </button>
          </div>

          <DataState
            isLoading={reportedQuery.isLoading}
            isError={reportedQuery.isError}
            isEmpty={reportedRows.length === 0}
            loadingText="Loading reported reviews..."
            errorText="Failed to load reported reviews"
            emptyText="No reported reviews"
            onRetry={() => void reportedQuery.refetch()}
          >
            <DataTable
              rows={reportedRows}
              rowKey={(row) => row.reportId}
              columns={[
                { key: "report", header: "Report ID", render: (row) => <span className="font-mono text-xs">{row.reportId}</span> },
                { key: "status", header: "Report Status", render: (row) => row.reportStatus },
                { key: "customer", header: "Customer", render: (row) => row.review.customerName || "-" },
                {
                  key: "booking",
                  header: "Booking",
                  render: (row) =>
                    row.review.bookingId ? (
                      <Link to={`/bookings/${row.review.bookingId}`} className="font-mono text-xs text-blue-300 hover:underline">
                        {row.review.bookingId}
                      </Link>
                    ) : (
                      "-"
                    ),
                },
                { key: "review", header: "Review", render: (row) => row.review.reviewText || row.review.comment || "-" },
                { key: "reason", header: "Report Reason", render: (row) => row.reportReason || "-" },
                { key: "reportedBy", header: "Reported By", render: (row) => row.reportedByCustomerName || "-" },
                { key: "actions", header: "Actions", render: reportedActions },
              ]}
            />

            <Pagination page={reportedPage} total={reportedTotal} limit={10} onPageChange={setReportedPage} />
          </DataState>
        </div>
      ) : null}

      {tab === "settings" ? (
        <DataState
          isLoading={settingsQuery.isLoading}
          isError={settingsQuery.isError}
          isEmpty={false}
          loadingText="Loading review settings..."
          errorText="Failed to load review settings"
          emptyText=""
          onRetry={() => void settingsQuery.refetch()}
        >
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["reviewsEnabled", "Reviews Enabled"],
                ["ratingEnabled", "Rating Enabled"],
                ["writtenReviewsEnabled", "Written Reviews Enabled"],
                ["autoApproveReviews", "Auto Approve Reviews"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-3 text-sm">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settingsForm[key as keyof AdminReviewSettings])}
                    onChange={(event) =>
                      setSettingsForm((previous) => ({
                        ...previous,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Service Overrides</h3>
                <button
                  type="button"
                  className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
                  onClick={() =>
                    setSettingsForm((previous) => ({
                      ...previous,
                      services: [...previous.services, { serviceId: 0, reviewEnabled: true }],
                    }))
                  }
                >
                  Add Service
                </button>
              </div>

              <div className="space-y-2">
                {settingsForm.services.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-sm text-[var(--color-muted)]">
                    No service-specific review overrides configured.
                  </p>
                ) : (
                  settingsForm.services.map((serviceRow, index) => (
                    <div key={`${serviceRow.serviceId}-${index}`} className="grid gap-2 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-[minmax(0,1fr)_160px_110px]">
                      <input
                        value={serviceRow.serviceId > 0 ? String(serviceRow.serviceId) : ""}
                        onChange={(event) => {
                          const nextId = Number(event.target.value.replace(/\D/g, "") || 0);
                          setSettingsForm((previous) => ({
                            ...previous,
                            services: previous.services.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, serviceId: nextId } : item,
                            ),
                          }));
                        }}
                        placeholder="Service ID"
                        className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                      />
                      <label className="flex items-center justify-between rounded border border-[var(--color-border)] px-3 py-2 text-sm">
                        <span>Review enabled</span>
                        <input
                          type="checkbox"
                          checked={serviceRow.reviewEnabled}
                          onChange={(event) =>
                            setSettingsForm((previous) => ({
                              ...previous,
                              services: previous.services.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, reviewEnabled: event.target.checked } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="rounded border border-rose-500/30 px-3 py-2 text-sm text-rose-300"
                        onClick={() =>
                          setSettingsForm((previous) => ({
                            ...previous,
                            services: previous.services.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
                onClick={() => setSettingsForm(settingsQuery.data ?? emptySettings)}
                disabled={!settingsDirty || saveSettingsMutation.isPending}
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                disabled={!settingsDirty || saveSettingsMutation.isPending}
                onClick={() => {
                  const cleanedPayload: AdminReviewSettings = {
                    ...settingsForm,
                    services: settingsForm.services.filter((row) => row.serviceId > 0),
                  };
                  saveSettingsMutation.mutate(cleanedPayload, {
                    onSuccess: () => toast.success("Review settings updated"),
                    onError: (error) => toast.error(extractApiError(error, "Unable to update review settings")),
                  });
                }}
              >
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </DataState>
      ) : null}

      <Modal open={Boolean(detailReviewId)} onClose={() => setDetailReviewId(null)} title="Review Details" maxWidthClassName="max-w-4xl">
        <DataState
          isLoading={detailQuery.isLoading}
          isError={detailQuery.isError}
          isEmpty={!detailQuery.data?.review}
          loadingText="Loading review details..."
          errorText="Failed to load review details"
          emptyText="Review not found"
          onRetry={() => void detailQuery.refetch()}
        >
          {detailQuery.data?.review ? (
            <div className="grid gap-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
                  <p><strong>Review ID:</strong> <span className="font-mono text-xs">{detailQuery.data.review.id}</span></p>
                  <p><strong>Booking:</strong> {detailQuery.data.review.bookingId ? <Link to={`/bookings/${detailQuery.data.review.bookingId}`} className="text-blue-300 hover:underline">{detailQuery.data.review.bookingId}</Link> : "-"}</p>
                  <p><strong>Customer:</strong> {detailQuery.data.review.customerName || "-"}</p>
                  <p><strong>Partner:</strong> {detailQuery.data.review.partnerName || "-"}</p>
                  <p><strong>Service:</strong> {detailQuery.data.review.serviceName || "-"}</p>
                  <p><strong>Status:</strong> <ReviewStatusBadge status={detailQuery.data.review.status} /></p>
                  <div className="flex items-center gap-2"><strong>Rating:</strong> <RatingStars rating={detailQuery.data.review.rating} /></div>
                  <p><strong>Created:</strong> {formatDateTime(detailQuery.data.review.createdAt)}</p>
                  <p><strong>Updated:</strong> {formatDateTime(detailQuery.data.review.updatedAt)}</p>
                  <p><strong>Moderation Reason:</strong> {detailQuery.data.review.moderationReason || "-"}</p>
                </div>

                <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Review Text</p>
                  <p className="mt-1 text-[var(--color-text)]">{detailQuery.data.review.reviewText || detailQuery.data.review.comment || "-"}</p>
                  <div className="mt-4 grid gap-2">
                    <p><strong>Request ID:</strong> <span className="font-mono text-xs">{detailQuery.data.review.requestId || "-"}</span></p>
                    <p><strong>Correlation ID:</strong> <span className="font-mono text-xs">{detailQuery.data.review.correlationId || "-"}</span></p>
                  </div>
                </div>
              </div>

              {detailQuery.data.review.images.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {detailQuery.data.review.images.map((url, index) => (
                    <img key={`${url}-${index}`} src={url} alt={`review-${index + 1}`} className="h-40 w-full rounded border border-[var(--color-border)] object-cover" />
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">Reports</p>
                  {detailQuery.data.reports.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">No reports found.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailQuery.data.reports.map((report) => (
                        <div key={report.id} className="rounded border border-[var(--color-border)] p-3 text-sm">
                          <p><strong>Report ID:</strong> <span className="font-mono text-xs">{report.id}</span></p>
                          <p><strong>Status:</strong> {report.status}</p>
                          <p><strong>Reason:</strong> {report.reason || "-"}</p>
                          <p><strong>Reported By:</strong> {report.reportedByCustomerName || report.reportedByCustomerId || "-"}</p>
                          <p><strong>Created:</strong> {formatDateTime(report.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">Moderation History</p>
                  {detailQuery.data.moderationHistory.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">No moderation history available.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailQuery.data.moderationHistory.map((entry) => (
                        <div key={entry.id} className="rounded border border-[var(--color-border)] p-3 text-sm">
                          <p><strong>Action:</strong> {entry.action || "-"}</p>
                          <p><strong>Actor:</strong> {entry.actorName || entry.actorId || "-"}</p>
                          <p><strong>Reason:</strong> {entry.reason || "-"}</p>
                          <p><strong>Created:</strong> {formatDateTime(entry.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DataState>
      </Modal>

      <Modal
        open={Boolean(actionTarget)}
        onClose={closeActionModal}
        title={modalCopy.title}
        maxWidthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeActionModal} className="rounded border border-[var(--color-border)] px-3 py-2 text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleActionConfirm} disabled={isActionLoading} className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-60">
              {isActionLoading ? "Saving..." : modalCopy.confirmLabel}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-muted)]">{modalCopy.description}</p>
          {actionTarget?.entity === "review" ? (
            <textarea
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value.slice(0, 500))}
              rows={4}
              placeholder={modalCopy.reasonRequired ? "Reason (required)" : "Reason (optional)"}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

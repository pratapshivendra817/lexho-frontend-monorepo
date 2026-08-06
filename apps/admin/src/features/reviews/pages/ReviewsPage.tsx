import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ConfirmDialog, DataState, DataTable, Modal, Pagination, Skeleton } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { RatingStars, ReviewStatusBadge, ReviewsFiltersBar, ReviewsStatsCards } from "../components";
import {
  useAdminReviewDetailsQuery,
  useAdminReviewMutations,
  useAdminReviewsQuery,
  useAdminReviewStatsQuery,
  useReportedAdminReviewsQuery,
} from "../hooks/useAdminReviews";
import type { AdminReview, AdminReviewStatus } from "../types";

type ActionState =
  | { type: "none" }
  | { type: "approve"; review: AdminReview }
  | { type: "reject"; review: AdminReview }
  | { type: "hide"; review: AdminReview };

type ActiveTab = "all" | "reported";

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<ActiveTab>("all");
  const [page, setPage] = useState(1);
  const [reportedPage, setReportedPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<AdminReviewStatus | "">("");
  const [rating, setRating] = useState<number | "">("");
  const [partner, setPartner] = useState("");
  const [customer, setCustomer] = useState("");
  const [service, setService] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionState, setActionState] = useState<ActionState>({ type: "none" });
  const [moderationReason, setModerationReason] = useState("");
  const [detailReviewId, setDetailReviewId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 450);

  const reviewsQuery = useAdminReviewsQuery({
    page: page - 1,
    size: 10,
    status,
    rating: rating === "" ? undefined : rating,
    partner: partner || undefined,
    customer: customer || undefined,
    service: service || undefined,
    search: debouncedSearch || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const reportedQuery = useReportedAdminReviewsQuery({ page: reportedPage - 1, size: 10 });
  const statsQuery = useAdminReviewStatsQuery();
  const detailQuery = useAdminReviewDetailsQuery(detailReviewId ?? undefined);

  const { approveMutation, rejectMutation, hideMutation } = useAdminReviewMutations();

  useEffect(() => {
    setPage(1);
  }, [customer, debouncedSearch, endDate, partner, rating, service, startDate, status]);

  const rows = reviewsQuery.data?.content ?? [];
  const total = reviewsQuery.data?.totalElements ?? 0;
  const reportedRows = reportedQuery.data?.content ?? [];
  const reportedTotal = reportedQuery.data?.totalElements ?? 0;
  const stats = statsQuery.data ?? {
    totalReviews: 0,
    averageRating: 0,
    hiddenReviews: 0,
    reportedReviews: 0,
    partnerWiseRatings: [],
    serviceWiseRatings: [],
  };

  const activeAction = actionState.type !== "none" ? actionState : null;

  const partnerChartData = useMemo(
    () => stats.partnerWiseRatings.map((item) => ({ name: item.name || "N/A", rating: item.value })),
    [stats.partnerWiseRatings],
  );
  const serviceChartData = useMemo(
    () => stats.serviceWiseRatings.map((item) => ({ name: item.name || "N/A", rating: item.value })),
    [stats.serviceWiseRatings],
  );

  const closeAction = () => {
    setActionState({ type: "none" });
    setModerationReason("");
  };

  const handleActionConfirm = () => {
    if (!activeAction) return;
    const id = activeAction.review.id;
    if (activeAction.type === "approve") {
      approveMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Review approved");
          closeAction();
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to approve review")),
      });
      return;
    }
    if (activeAction.type === "reject") {
      rejectMutation.mutate(
        { id, reason: moderationReason.trim() || undefined },
        {
          onSuccess: () => {
            toast.success("Review rejected");
            closeAction();
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to reject review")),
        },
      );
      return;
    }
    hideMutation.mutate(
      { id, reason: moderationReason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Review hidden");
          closeAction();
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to hide review")),
      },
    );
  };

  const actionButtons = (row: AdminReview) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" onClick={() => setDetailReviewId(row.id)}>
        View
      </button>
      <button type="button" className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300" onClick={() => setActionState({ type: "approve", review: row })}>
        Approve
      </button>
      <button type="button" className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300" onClick={() => setActionState({ type: "reject", review: row })}>
        Reject
      </button>
      <button type="button" className="rounded border border-zinc-500/30 px-2 py-1 text-xs text-zinc-300" onClick={() => setActionState({ type: "hide", review: row })}>
        Hide
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

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Partner Wise Ratings</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <BarChart data={partnerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="rating" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Service Wise Ratings</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <BarChart data={serviceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="rating" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("all")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "all" ? "bg-blue-600 text-white" : "border border-[var(--color-border)]"}`}>
          All Reviews
        </button>
        <button type="button" onClick={() => setTab("reported")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "reported" ? "bg-blue-600 text-white" : "border border-[var(--color-border)]"}`}>
          Reported Reviews
        </button>
      </div>

      {tab === "all" ? (
        <>
          <ReviewsFiltersBar
            search={searchInput}
            status={status}
            rating={rating}
            partner={partner}
            customer={customer}
            service={service}
            startDate={startDate}
            endDate={endDate}
            onSearchChange={setSearchInput}
            onStatusChange={setStatus}
            onRatingChange={setRating}
            onPartnerChange={setPartner}
            onCustomerChange={setCustomer}
            onServiceChange={setService}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => {
              setSearchInput("");
              setStatus("");
              setRating("");
              setPartner("");
              setCustomer("");
              setService("");
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
                  render: (row) => row.bookingId ? <Link to={`/bookings/${row.bookingId}`} className="font-mono text-xs text-blue-300 hover:underline">{row.bookingId}</Link> : "-",
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
                  render: (row) => row.partnerId ? <Link to={`/partners/${row.partnerId}`} className="text-blue-300 hover:underline">{row.partnerName || row.partnerId}</Link> : row.partnerName || "-",
                },
                { key: "service", header: "Service", render: (row) => row.serviceName || "-" },
                { key: "rating", header: "Rating", render: (row) => <RatingStars rating={row.rating} /> },
                { key: "comment", header: "Comment", render: (row) => <span className="line-clamp-2 text-xs text-[var(--color-muted)]">{row.reviewText || row.comment || "-"}</span> },
                { key: "status", header: "Status", render: (row) => <ReviewStatusBadge status={row.status} /> },
                { key: "reports", header: "Reports", render: (row) => String(row.reportCount) },
                { key: "created", header: "Created", render: (row) => formatDateTime(row.createdAt) },
                { key: "actions", header: "Actions", render: actionButtons },
              ]}
            />

            <Pagination page={page} total={total} limit={10} onPageChange={setPage} />
          </DataState>
        </>
      ) : (
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
            rowKey={(row) => row.id}
            columns={[
              { key: "customer", header: "Customer", render: (row) => row.customerName || "-" },
              {
                key: "booking",
                header: "Booking",
                render: (row) => row.bookingId ? <Link to={`/bookings/${row.bookingId}`} className="font-mono text-xs text-blue-300 hover:underline">{row.bookingId}</Link> : "-",
              },
              {
                key: "partner",
                header: "Partner",
                render: (row) => row.partnerId ? <Link to={`/partners/${row.partnerId}`} className="text-blue-300 hover:underline">{row.partnerName || row.partnerId}</Link> : row.partnerName || "-",
              },
              { key: "comment", header: "Comment", render: (row) => row.reviewText || row.comment || "-" },
              { key: "reportReason", header: "Report Reason", render: (row) => row.reportReason || "-" },
              { key: "reportCount", header: "Report Count", render: (row) => String(row.reportCount) },
              { key: "status", header: "Status", render: (row) => <ReviewStatusBadge status={row.status} /> },
              { key: "actions", header: "Actions", render: actionButtons },
            ]}
          />

          <Pagination page={reportedPage} total={reportedTotal} limit={10} onPageChange={setReportedPage} />
        </DataState>
      )}

      <Modal open={Boolean(detailReviewId)} onClose={() => setDetailReviewId(null)} title="Review Details" maxWidthClassName="max-w-3xl">
        <DataState
          isLoading={detailQuery.isLoading}
          isError={detailQuery.isError}
          isEmpty={!detailQuery.data}
          loadingText="Loading review details..."
          errorText="Failed to load review details"
          emptyText="Review not found"
          onRetry={() => void detailQuery.refetch()}
        >
          {detailQuery.data ? (
            <div className="grid gap-3">
              <div className="grid gap-1 text-sm">
                <p><strong>Customer:</strong> {detailQuery.data.customerName || "-"}</p>
                <p><strong>Customer ID:</strong> <span className="font-mono text-xs">{detailQuery.data.customerId || "-"}</span></p>
                <p><strong>Booking:</strong> {detailQuery.data.bookingId ? <Link to={`/bookings/${detailQuery.data.bookingId}`} className="text-blue-300 hover:underline">{detailQuery.data.bookingId}</Link> : "-"}</p>
                <p><strong>Partner:</strong> {detailQuery.data.partnerId ? <Link to={`/partners/${detailQuery.data.partnerId}`} className="text-blue-300 hover:underline">{detailQuery.data.partnerName || detailQuery.data.partnerId}</Link> : detailQuery.data.partnerName || "-"}</p>
                <p><strong>Service:</strong> {detailQuery.data.serviceName || "-"}</p>
                <p><strong>Status:</strong> <ReviewStatusBadge status={detailQuery.data.status} /></p>
                <div className="flex items-center gap-2"><strong>Rating:</strong> <RatingStars rating={detailQuery.data.rating} /></div>
                <p><strong>RequestId:</strong> <span className="font-mono text-xs">{detailQuery.data.requestId || "-"}</span></p>
                <p><strong>CorrelationId:</strong> <span className="font-mono text-xs">{detailQuery.data.correlationId || "-"}</span></p>
                <p><strong>Moderation Reason:</strong> {detailQuery.data.moderationReason || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Comment</p>
                <p className="mt-1 text-sm text-[var(--color-text)]">{detailQuery.data.reviewText || detailQuery.data.comment || "-"}</p>
              </div>
              {detailQuery.data.images.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {detailQuery.data.images.map((url, index) => (
                    <img key={`${url}-${index}`} src={url} alt={`review-${index + 1}`} className="h-40 w-full rounded border border-[var(--color-border)] object-cover" />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </DataState>
      </Modal>

      <ConfirmDialog
        open={Boolean(activeAction && activeAction.type === "approve")}
        title={activeAction ? `${activeAction.type[0].toUpperCase()}${activeAction.type.slice(1)} Review` : "Confirm Action"}
        description={activeAction ? `${activeAction.type.toUpperCase()} review ${activeAction.review.id}?` : ""}
        confirmLabel="Confirm"
        isLoading={approveMutation.isPending}
        onClose={closeAction}
        onConfirm={handleActionConfirm}
      />

      <Modal open={Boolean(activeAction && activeAction.type !== "approve")} onClose={closeAction} title={activeAction ? `${activeAction.type[0].toUpperCase()}${activeAction.type.slice(1)} Review` : "Moderate Review"} maxWidthClassName="max-w-lg">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-muted)]">
            {activeAction ? `${activeAction.type.toUpperCase()} review ${activeAction.review.id}? Add an admin reason for audit history.` : ""}
          </p>
          <textarea
            value={moderationReason}
            onChange={(event) => setModerationReason(event.target.value.slice(0, 500))}
            rows={4}
            placeholder="Moderation reason"
            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeAction} className="rounded border border-[var(--color-border)] px-3 py-2 text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleActionConfirm} disabled={rejectMutation.isPending || hideMutation.isPending} className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-60">
              {rejectMutation.isPending || hideMutation.isPending ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

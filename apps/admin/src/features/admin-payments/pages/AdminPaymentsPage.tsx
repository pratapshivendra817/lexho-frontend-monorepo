import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DataState, StatusBadge, TransactionTimeline } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  createAdminBookingRefund,
  fetchAdminBookingPaymentDetail,
  fetchAdminPaymentDashboard,
  fetchAdminPaymentTransactions,
  reconcileAdminBookingPayment,
} from "../api";
import type { AdminPaymentAttemptStatus } from "../types";

const STATUSES: Array<AdminPaymentAttemptStatus | ""> = ["", "CREATED", "PAID", "FAILED", "REFUNDED"];

const currency = (amount: number, code = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: code || "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(amount) ? amount : 0,
  );

const formatDate = (value: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const makeRefundIdempotencyKey = (bookingId: string) => {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `refund-booking-${bookingId}-${suffix}`;
};

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [bookingId, setBookingId] = useState("");
  const [status, setStatus] = useState<AdminPaymentAttemptStatus | "">("");
  const [page, setPage] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const transactionsParams = useMemo(() => ({ bookingId: bookingId.trim(), status, page, size: 20 }), [bookingId, page, status]);

  const dashboardQuery = useQuery({ queryKey: ["admin-payments-dashboard"], queryFn: fetchAdminPaymentDashboard, retry: false });
  const transactionsQuery = useQuery({
    queryKey: ["admin-payment-transactions", transactionsParams],
    queryFn: () => fetchAdminPaymentTransactions(transactionsParams),
    retry: false,
  });
  const detailQuery = useQuery({
    queryKey: ["admin-booking-payment-detail", selectedBookingId],
    queryFn: () => fetchAdminBookingPaymentDetail(selectedBookingId),
    enabled: selectedBookingId.trim().length > 0,
    retry: false,
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) => reconcileAdminBookingPayment(id),
    onSuccess: async (_data, id) => {
      toast.success("Payment reconciled");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payments-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-payment-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-booking-payment-detail", id] }),
      ]);
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to reconcile payment")),
  });

  const refundMutation = useMutation({
    mutationFn: (payload: { bookingId: string; amount: number; reason: string }) =>
      createAdminBookingRefund(payload.bookingId, {
        amount: payload.amount,
        reason: payload.reason,
        idempotencyKey: makeRefundIdempotencyKey(payload.bookingId),
      }),
    onSuccess: async (_data, payload) => {
      toast.success("Refund request created");
      setRefundAmount("");
      setRefundReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payments-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-payment-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-booking-payment-detail", payload.bookingId] }),
      ]);
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create refund")),
  });

  const dashboard = dashboardQuery.data;
  const transactions = transactionsQuery.data;
  const detail = detailQuery.data;

  const loadBooking = () => {
    const id = bookingId.trim();
    if (!id) {
      toast.error("Enter booking ID first");
      return;
    }
    setSelectedBookingId(id);
  };

  const submitRefund = () => {
    const id = selectedBookingId.trim();
    const amount = Number(refundAmount);
    if (!id) {
      toast.error("Load a booking first");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Refund reason is required");
      return;
    }
    refundMutation.mutate({ bookingId: id, amount, reason: refundReason.trim() });
  };

  return (
    <div className="space-y-5">
      <DataState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        isEmpty={!dashboard}
        loadingText="Loading payment dashboard..."
        errorText="Failed to load payment dashboard"
        onRetry={() => void dashboardQuery.refetch()}
      >
        {dashboard ? (
          <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Created", dashboard.createdAttempts],
              ["Paid", dashboard.paidAttempts],
              ["Failed", dashboard.failedAttempts],
              ["Refunded", dashboard.refundedAttempts],
              ["Paid Amount", currency(dashboard.paidAmount)],
              ["Refunded Amount", currency(dashboard.processedRefundAmount)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">{value}</p>
              </article>
            ))}
          </section>
        ) : null}
      </DataState>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Booking ID</span>
            <input
              value={bookingId}
              onChange={(event) => {
                setBookingId(event.target.value);
                setPage(0);
              }}
              className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3 text-[var(--color-text)]"
              placeholder="78"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AdminPaymentAttemptStatus | "");
                setPage(0);
              }}
              className="h-10 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)]"
            >
              {STATUSES.map((item) => (
                <option key={item || "ALL"} value={item}>
                  {item || "ALL"}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void transactionsQuery.refetch()} className="inline-flex h-10 items-center gap-2 rounded border border-[var(--color-border)] px-3 text-sm">
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" onClick={loadBooking} className="inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-3 text-sm text-white">
            <Search size={15} /> Load Booking Payment
          </button>
        </div>

        <DataState
          isLoading={transactionsQuery.isLoading}
          isError={transactionsQuery.isError}
          isEmpty={!transactions || transactions.content.length === 0}
          loadingText="Loading payment transactions..."
          errorText="Failed to load payment transactions"
          emptyText="No payment transactions found"
          onRetry={() => void transactionsQuery.refetch()}
        >
          {transactions ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                    <tr>
                      <th className="px-3 py-2">Booking</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Order ID</th>
                      <th className="px-3 py-2">Payment ID</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.content.map((row) => (
                      <tr key={`${row.id}-${row.bookingId}-${row.razorpayPaymentId}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => setSelectedBookingId(row.bookingId)} className="font-medium text-blue-300 hover:underline">
                            {row.bookingId || "N/A"}
                          </button>
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                        <td className="px-3 py-2">{currency(row.amount, row.currency)}</td>
                        <td className="px-3 py-2">{row.razorpayOrderId || "N/A"}</td>
                        <td className="px-3 py-2">{row.razorpayPaymentId || "N/A"}</td>
                        <td className="px-3 py-2">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
                <span>
                  Page {transactions.pageNumber + 1} of {transactions.totalPages} | {transactions.totalElements} records
                </span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-50">
                    Previous
                  </button>
                  <button type="button" disabled={page + 1 >= transactions.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-50">
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </DataState>
      </section>

      {selectedBookingId ? (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Booking Payment Detail</h2>
              <p className="text-sm text-[var(--color-muted)]">Booking #{selectedBookingId}</p>
            </div>
            <button type="button" onClick={() => reconcileMutation.mutate(selectedBookingId)} disabled={reconcileMutation.isPending} className="inline-flex items-center gap-2 rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60">
              <RotateCcw size={15} /> Reconcile Latest Razorpay Payment
            </button>
          </div>

          <DataState
            isLoading={detailQuery.isLoading}
            isError={detailQuery.isError}
            isEmpty={!detail}
            loadingText="Loading booking payment..."
            errorText="Failed to load booking payment"
            onRetry={() => void detailQuery.refetch()}
          >
            {detail ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div><span className="text-[var(--color-muted)]">Status:</span> <div className="mt-1"><StatusBadge status={detail.paymentStatus} /></div></div>
                  <p><span className="text-[var(--color-muted)]">Amount:</span> {currency(detail.amount, detail.currency)}</p>
                  <p><span className="text-[var(--color-muted)]">Order:</span> {detail.razorpayOrderId || "N/A"}</p>
                  <p><span className="text-[var(--color-muted)]">Payment:</span> {detail.razorpayPaymentId || "N/A"}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
                  <input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" placeholder="Refund amount" />
                  <input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" placeholder="Refund reason" />
                  <button type="button" onClick={submitRefund} disabled={refundMutation.isPending} className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-60">
                    Create Refund
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Payment Timeline</h3>
                    <TransactionTimeline
                      items={detail.attempts.map((attempt) => ({
                        id: `${attempt.id}-${attempt.razorpayPaymentId}`,
                        title: `${currency(attempt.amount, attempt.currency)} payment`,
                        status: attempt.status,
                        at: attempt.createdAt,
                        description: attempt.razorpayPaymentId || attempt.razorpayOrderId || "No Razorpay ID",
                      }))}
                    />
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Refund Timeline</h3>
                    <TransactionTimeline
                      items={detail.refunds.map((refund) => ({
                        id: `${refund.id}-${refund.razorpayRefundId}`,
                        title: `${currency(refund.amount, detail.currency)} refund`,
                        status: refund.status || "REFUNDED",
                        at: refund.processedAt || refund.createdAt,
                        description: refund.reason || refund.razorpayRefundId || "No reason",
                      }))}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </DataState>
        </section>
      ) : null}
    </div>
  );
}

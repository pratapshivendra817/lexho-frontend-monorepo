import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchPaymentReconciliation, fetchPayouts, updatePaymentStatus, upsertBookingPayout } from "@/api/admin";
import { shareContent } from "@/utils/share";
import { PayoutTable, StatCard } from "../components";

export default function PayoutsPage() {
  const [bookingId, setBookingId] = useState("");
  const [paymentStatusValue, setPaymentStatusValue] = useState("PENDING");
  const [paymentStatusReason, setPaymentStatusReason] = useState("");
  const [providerId, setProviderId] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("PENDING");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payouts"],
    queryFn: fetchPayouts,
    retry: false,
  });
  const reconciliationQuery = useQuery({
    queryKey: ["admin-booking-payment-reconciliation", bookingId],
    queryFn: () => fetchPaymentReconciliation(bookingId),
    enabled: bookingId.trim().length > 0,
    retry: false,
  });
  const paymentStatusMutation = useMutation({
    mutationFn: (payload: { bookingId: string; status: string; reason: string }) =>
      updatePaymentStatus(payload.bookingId, payload.status, payload.reason),
    onSuccess: async () => {
      await reconciliationQuery.refetch();
    },
  });
  const payoutMutation = useMutation({
    mutationFn: (payload: { bookingId: string; providerId: number; amount: number; status: string }) =>
      upsertBookingPayout(payload.bookingId, { providerId: payload.providerId, amount: payload.amount, status: payload.status }),
    onSuccess: async () => {
      await reconciliationQuery.refetch();
    },
  });

  const payouts = data ?? [];

  const total = payouts.reduce((sum, p) => sum + p.finalPayout, 0);
  const pending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.finalPayout, 0);
  const failed = payouts.filter((p) => p.status === "FAILED").length;

  const exportCSV = () => {
    const headers = ["Partner", "Earnings", "Platform Fee", "Final Payout", "Status"];

    const rows = payouts.map((p) => [p.partnerName ?? p.providerName, p.earnings, p.platformFee, p.finalPayout, p.status]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "payouts.csv";
    link.click();
  };

  return (
    <div className="p-6 text-white bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Partner Payouts</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void shareContent({
                title: "Partner Payout Summary",
                text: `Total Payout: INR ${total}\nPending Payout: INR ${pending}\nFailed Transactions: ${failed}`,
                url: window.location.href,
                successMessage: "Payout summary copied",
              });
            }}
            className="border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm"
          >
            Share Summary
          </button>
          <button onClick={exportCSV} className="bg-green-600 px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm lg:grid-cols-4">
        <input value={bookingId} onChange={(event) => setBookingId(event.target.value)} placeholder="Booking ID" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2" />
        <select value={paymentStatusValue} onChange={(event) => setPaymentStatusValue(event.target.value)} className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2">
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input value={paymentStatusReason} onChange={(event) => setPaymentStatusReason(event.target.value)} placeholder="Reason required" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2" />
        <button type="button" onClick={() => void reconciliationQuery.refetch()} className="rounded bg-blue-600 px-3 py-2 text-white">Fetch Reconciliation</button>
        <button
          type="button"
          onClick={() => bookingId && paymentStatusReason.trim() && paymentStatusMutation.mutate({ bookingId, status: paymentStatusValue, reason: paymentStatusReason.trim() })}
          className="rounded bg-amber-600 px-3 py-2 text-white"
        >
          Update Payment Status
        </button>
        <input value={providerId} onChange={(event) => setProviderId(event.target.value)} placeholder="Provider ID" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2" />
        <input value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} placeholder="Payout Amount" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2" />
        <input value={payoutStatus} onChange={(event) => setPayoutStatus(event.target.value)} placeholder="Payout Status (PENDING/PAID...)" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2" />
        <button
          type="button"
          onClick={() => {
            const pid = Number(providerId);
            const amt = Number(payoutAmount);
            if (!bookingId || Number.isNaN(pid) || Number.isNaN(amt)) return;
            payoutMutation.mutate({ bookingId, providerId: pid, amount: amt, status: payoutStatus || "PENDING" });
          }}
          className="rounded bg-emerald-600 px-3 py-2 text-white"
        >
          Upsert Payout
        </button>
        <div className="lg:col-span-4 text-xs text-[var(--color-muted)]">
          {reconciliationQuery.data
            ? `Booking ${reconciliationQuery.data.bookingId} | Amount ${reconciliationQuery.data.amount} | Payment ${reconciliationQuery.data.paymentStatus} | Payout ${reconciliationQuery.data.payout?.status ?? "N/A"}`
            : "Enter booking id to load reconciliation details."}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-300">Loading payouts...</div>
      ) : isError ? (
        <div className="space-y-3">
          <div className="text-red-300">Failed to load payouts.</div>
          <button type="button" onClick={() => void refetch()} className="px-3 py-1 bg-red-600 rounded">
            Retry
          </button>
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-gray-400">No payouts found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Payout" value={`INR ${total}`} />
            <StatCard title="Pending Payout" value={`INR ${pending}`} />
            <StatCard title="Failed Transactions" value={`${failed}`} />
          </div>

          <PayoutTable data={payouts} />
        </>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DataState, DataTable, Pagination } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";

import { getAdminSubscriptions } from "../api/subscriptionsApi";
import type { AdminSubscriptionStatus } from "../types";

const statusOptions: Array<"" | AdminSubscriptionStatus> = [
  "",
  "PENDING_ADMIN_REVIEW",
  "UNDER_REVIEW",
  "PENDING_PARTNER_ASSIGNMENT",
  "PENDING_PARTNER_ACCEPTANCE",
  "CONFIRMED",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const classes =
    normalized === "ACTIVE" || normalized === "CONFIRMED" || normalized === "COMPLETED"
      ? "bg-emerald-500/20 text-emerald-300"
      : normalized === "REJECTED" || normalized === "CANCELLED"
        ? "bg-rose-500/20 text-rose-300"
        : normalized === "PENDING_ADMIN_REVIEW" || normalized === "UNDER_REVIEW" || normalized === "PENDING_PARTNER_ASSIGNMENT" || normalized === "PENDING_PARTNER_ACCEPTANCE"
          ? "bg-amber-500/20 text-amber-300"
          : normalized === "PAUSED"
            ? "bg-violet-500/20 text-violet-300"
            : "bg-blue-500/20 text-blue-300";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}

export default function SubscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const status = (searchParams.get("status") ?? "") as "" | AdminSubscriptionStatus;
  const customerId = searchParams.get("customerId") ?? "";
  const [customerInput, setCustomerInput] = useState(customerId);
  const debouncedCustomerId = useDebounce(customerInput, 450);

  useEffect(() => {
    setCustomerInput(customerId);
  }, [customerId]);

  useEffect(() => {
    if (debouncedCustomerId === customerId) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedCustomerId) next.set("customerId", debouncedCustomerId);
    else next.delete("customerId");
    next.set("page", "0");
    setSearchParams(next);
  }, [customerId, debouncedCustomerId, searchParams, setSearchParams]);

  const updateParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (resetPage) next.set("page", "0");
    setSearchParams(next);
  };

  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscriptions", { page, status, customerId }],
    queryFn: () => getAdminSubscriptions({ page, size: 20, status, customerId }),
    retry: false,
  });

  const rows = subscriptionsQuery.data?.content ?? [];
  const total = subscriptionsQuery.data?.totalElements ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Subscription Management</h2>
        <p className="text-sm text-[var(--color-muted)]">Monitor recurring bookings, visits and partner assignments</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <input
          value={customerInput}
          onChange={(event) => setCustomerInput(event.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Customer ID"
          className="w-40 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none"
        />
        <select
          value={status}
          onChange={(event) => updateParams({ status: event.target.value || undefined })}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          {statusOptions.map((option) => (
            <option key={option || "ALL"} value={option}>
              {option || "All Status"}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setCustomerInput("");
            setSearchParams(new URLSearchParams({ page: "0" }));
          }}
          className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Reset
        </button>
      </div>

      <DataState
        isLoading={subscriptionsQuery.isLoading}
        isError={subscriptionsQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading subscriptions..."
        errorText="Failed to load subscriptions"
        emptyText="No subscriptions found"
        onRetry={() => void subscriptionsQuery.refetch()}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "id", header: "ID", render: (row) => row.id },
            {
              key: "customer",
              header: "Customer",
              render: (row) => row.customerName || (row.customerId ? `Customer #${row.customerId}` : "-"),
            },
            { key: "service", header: "Service", render: (row) => row.serviceName || row.serviceId || "-" },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "frequency", header: "Frequency", render: (row) => row.frequency || "-" },
            {
              key: "period",
              header: "Period",
              render: (row) => `${row.startDate || "-"} to ${row.endDate || "-"}`,
            },
            {
              key: "visit",
              header: "Visit Plan",
              render: (row) => `${row.visits ?? "-"} visits | ${row.durationHours ?? "-"} hrs | ${row.timeSlot || "-"}`,
            },
            { key: "partner", header: "Partner", render: (row) => row.partnerName || "-" },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Link className="rounded border border-[var(--color-border)] px-2 py-1 text-xs" to={`/subscriptions/${row.id}`}>
                  View
                </Link>
              ),
            },
          ]}
        />

        <Pagination
          page={page + 1}
          total={total}
          limit={20}
          onPageChange={(nextPage) => updateParams({ page: String(Math.max(0, nextPage - 1)) }, false)}
        />
      </DataState>
    </div>
  );
}

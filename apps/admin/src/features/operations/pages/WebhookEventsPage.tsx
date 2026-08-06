import { useQuery } from "@tanstack/react-query";
import { Eye, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DataState, Skeleton, StatusBadge } from "@/components/admin";

import { fetchWebhookEvents } from "../api";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export default function WebhookEventsPage() {
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const params = useMemo(() => ({ search: search.trim(), eventType, status }), [eventType, search, status]);

  const query = useQuery({
    queryKey: ["razorpay-webhooks", params],
    queryFn: () => fetchWebhookEvents(params),
    retry: false,
  });

  const rows = query.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
        <label className="flex h-10 items-center gap-2 rounded border border-[var(--color-border)] px-3">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payment ID or event" className="w-full bg-transparent outline-none" />
        </label>
        <input value={eventType} onChange={(event) => setEventType(event.target.value)} placeholder="Event type" className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
          <option value="">All Status</option>
          <option value="PENDING">PENDING</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="RETRYING">RETRYING</option>
        </select>
        <button type="button" onClick={() => void query.refetch()} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-blue-600 px-3 text-sm text-white">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-4">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
        </div>
      ) : null}

      {!query.isLoading ? (
        <DataState isLoading={false} isError={query.isError} isEmpty={rows.length === 0} errorText="Failed to load webhook events" emptyText="No webhook events found" onRetry={() => void query.refetch()}>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-hover)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Event Type</th>
                  <th className="px-3 py-2">Payment ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Processed Time</th>
                  <th className="px-3 py-2">Retry Count</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 font-medium">{row.eventType || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.paymentId || "-"}</td>
                    <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2">{formatDate(row.processedAt)}</td>
                    <td className="px-3 py-2">{row.retryCount}</td>
                    <td className="px-3 py-2">
                      <Link to={`/webhooks/${row.id}`} className="inline-flex items-center gap-2 rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                        <Eye size={14} /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      ) : null}
    </div>
  );
}

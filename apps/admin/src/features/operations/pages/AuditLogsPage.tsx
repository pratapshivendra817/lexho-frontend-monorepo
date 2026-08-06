import { useQuery } from "@tanstack/react-query";
import { Eye, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DataState } from "@/components/admin";

import { fetchAuditLogs } from "../api";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export default function AuditLogsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [role, setRole] = useState("");
  const params = useMemo(() => ({ startDate, endDate, action: action.trim(), user: user.trim(), role }), [action, endDate, role, startDate, user]);

  const query = useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
    retry: false,
  });

  const rows = query.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-[160px_160px_1fr_1fr_180px_auto]">
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" />
        <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action" className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" />
        <input value={user} onChange={(event) => setUser(event.target.value)} placeholder="User" className="h-10 rounded border border-[var(--color-border)] bg-transparent px-3" />
        <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="SUPPORT">SUPPORT</option>
          <option value="OPERATIONS">OPERATIONS</option>
        </select>
        <button type="button" onClick={() => void query.refetch()} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-blue-600 px-3 text-sm text-white">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <DataState isLoading={query.isLoading} isError={query.isError} isEmpty={rows.length === 0} loadingText="Loading audit logs..." errorText="Failed to load audit logs" emptyText="No audit logs found" onRetry={() => void query.refetch()}>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-hover)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity Type</th>
                <th className="px-3 py-2">Entity Id</th>
                <th className="px-3 py-2">RequestId</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2">{formatDate(row.date)}</td>
                  <td className="px-3 py-2">{row.user || "-"}</td>
                  <td className="px-3 py-2">{row.role || "-"}</td>
                  <td className="px-3 py-2">{row.action || "-"}</td>
                  <td className="px-3 py-2">{row.entityType || "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.entityId || "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.requestId || "-"}</td>
                  <td className="px-3 py-2">
                    <Link to={`/audit-logs/${row.id}`} className="inline-flex items-center gap-2 rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                      <Eye size={14} /> Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}

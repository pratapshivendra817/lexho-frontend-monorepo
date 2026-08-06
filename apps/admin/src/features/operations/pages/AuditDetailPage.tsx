import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { DataState, TransactionTimeline } from "@/components/admin";

import { fetchAuditLogDetail } from "../api";

export default function AuditDetailPage() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["audit-log-detail", id],
    queryFn: () => fetchAuditLogDetail(id),
    enabled: id.length > 0,
    retry: false,
  });
  const detail = query.data;

  return (
    <DataState isLoading={query.isLoading} isError={query.isError} isEmpty={!detail} loadingText="Loading audit detail..." errorText="Failed to load audit detail" onRetry={() => void query.refetch()}>
      {detail ? (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4 md:grid-cols-3">
            {[
              ["User", detail.user],
              ["Role", detail.role],
              ["Action", detail.action],
              ["Entity Type", detail.entityType],
              ["Entity Id", detail.entityId],
              ["RequestId", detail.requestId],
              ["CorrelationId", detail.correlationId],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
                <p className="mt-1 break-all font-mono text-xs">{value || "-"}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <JsonBlock title="Old Value" value={detail.oldValue} />
            <JsonBlock title="New Value" value={detail.newValue} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Change History</h2>
            <TransactionTimeline
              items={detail.changeHistory.map((item) => ({
                id: item.id,
                title: item.field || "Record changed",
                status: "COMPLETED",
                at: item.changedAt,
                description: `${JSON.stringify(item.oldValue ?? null)} -> ${JSON.stringify(item.newValue ?? null)}`,
              }))}
            />
          </section>
        </div>
      ) : null}
    </DataState>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">{title}</h2>
      <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--color-border)] bg-black/20 p-3 text-xs">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}

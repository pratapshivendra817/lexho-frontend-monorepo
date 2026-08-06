import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { DataState, StatusBadge, TransactionTimeline } from "@/components/admin";

import { fetchWebhookEventDetail } from "../api";

export default function WebhookDetailPage() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["razorpay-webhook-detail", id],
    queryFn: () => fetchWebhookEventDetail(id),
    enabled: id.length > 0,
    retry: false,
  });

  const detail = query.data;

  return (
    <DataState isLoading={query.isLoading} isError={query.isError} isEmpty={!detail} loadingText="Loading webhook detail..." errorText="Failed to load webhook detail" onRetry={() => void query.refetch()}>
      {detail ? (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Event Type</p>
              <p className="mt-1 font-semibold">{detail.eventType || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Payment ID</p>
              <p className="mt-1 break-all font-mono text-xs">{detail.paymentId || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Retry Status</p>
              <div className="mt-1"><StatusBadge status={detail.retryStatus || detail.status} /></div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Retry Count</p>
              <p className="mt-1 font-semibold">{detail.retryCount}</p>
            </div>
          </section>

          {detail.errorMessage ? (
            <section className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="font-semibold">Error Message</p>
              <p className="mt-1">{detail.errorMessage}</p>
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Processing History</h2>
              <TransactionTimeline items={detail.history.map((item) => ({ id: item.id, title: item.message || "Webhook processing", status: item.status, at: item.processedAt }))} />
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Event Payload</h2>
              <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--color-border)] bg-black/20 p-3 text-xs">
                {JSON.stringify(detail.payload, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      ) : null}
    </DataState>
  );
}

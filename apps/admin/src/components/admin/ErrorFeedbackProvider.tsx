import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import type { NormalizedApiError } from "@/utils/apiError";
import { subscribeApiErrors } from "@/utils/apiErrorBus";

export function ErrorFeedbackProvider({ children }: { children: ReactNode }) {
  const [activeError, setActiveError] = useState<NormalizedApiError | null>(null);

  useEffect(() => {
    return subscribeApiErrors((error) => {
      toast.error(error.message);
      if (error.requestId || error.correlationId || error.technicalMessage) {
        setActiveError(error);
      }
    });
  }, []);

  return (
    <>
      {children}
      {activeError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Request failed</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{activeError.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveError(null)}
                className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)]"
              >
                Close
              </button>
            </div>

            <dl className="mt-4 grid gap-2 rounded border border-[var(--color-border)] bg-black/10 p-3 text-xs">
              <Row label="Code" value={activeError.code} />
              <Row label="HTTP" value={activeError.httpStatus?.toString()} />
              <Row label="RequestId" value={activeError.requestId} />
              <Row label="CorrelationId" value={activeError.correlationId} />
              <Row label="Detail" value={activeError.technicalMessage} />
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="break-all font-mono text-[var(--color-text)]">{value || "-"}</dd>
    </div>
  );
}

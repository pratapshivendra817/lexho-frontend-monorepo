import { useEffect, useState } from "react";

import { getApiRequestLogs, subscribeApiRequestLogs, type ApiRequestLogEntry } from "@/utils/apiRequestLog";

function formatBody(value: unknown) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ApiDebugPanel({ visible }: { visible: boolean }) {
  const [logs, setLogs] = useState<ApiRequestLogEntry[]>(() => getApiRequestLogs());

  useEffect(() => subscribeApiRequestLogs(setLogs), []);

  if (!visible) {
    return null;
  }

  return (
    <details className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text)]">
        Developer API Logs
      </summary>
      <div className="mt-3 max-h-80 overflow-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No API requests captured yet.</p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="text-[var(--color-muted)]">
              <tr>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Request</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">RequestId</th>
                <th className="px-2 py-2">CorrelationId</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--color-border)]">
                  <td className="px-2 py-2">{new Date(log.createdAt).toLocaleTimeString()}</td>
                  <td className="max-w-[360px] truncate px-2 py-2 font-mono">
                    {log.method} {log.url}
                    {log.errorMessage ? <div className="text-red-300">{log.errorMessage}</div> : null}
                    {log.requestBody != null ? (
                      <details className="mt-2 whitespace-normal text-[11px] text-[var(--color-muted)]">
                        <summary className="cursor-pointer">Request body</summary>
                        <pre className="mt-1 overflow-auto rounded bg-black/20 p-2">{formatBody(log.requestBody)}</pre>
                      </details>
                    ) : null}
                    {log.responseBody != null ? (
                      <details className="mt-2 whitespace-normal text-[11px] text-[var(--color-muted)]">
                        <summary className="cursor-pointer">Response body</summary>
                        <pre className="mt-1 overflow-auto rounded bg-black/20 p-2">{formatBody(log.responseBody)}</pre>
                      </details>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">{log.status ?? "ERR"} / {log.durationMs ?? 0}ms</td>
                  <td className="px-2 py-2 font-mono">{log.requestId ?? "-"}</td>
                  <td className="px-2 py-2 font-mono">{log.correlationId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}

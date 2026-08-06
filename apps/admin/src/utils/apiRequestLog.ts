export type ApiRequestLogEntry = {
  id: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  requestId?: string;
  correlationId?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
  createdAt: string;
};

type Listener = (entries: ApiRequestLogEntry[]) => void;

const listeners = new Set<Listener>();
const entries: ApiRequestLogEntry[] = [];
const MAX_ENTRIES = 100;

export function addApiRequestLog(entry: ApiRequestLogEntry) {
  entries.unshift(entry);
  entries.splice(MAX_ENTRIES);
  listeners.forEach((listener) => listener([...entries]));
}

export function getApiRequestLogs() {
  return [...entries];
}

export function subscribeApiRequestLogs(listener: Listener) {
  listeners.add(listener);
  listener([...entries]);
  return () => {
    listeners.delete(listener);
  };
}

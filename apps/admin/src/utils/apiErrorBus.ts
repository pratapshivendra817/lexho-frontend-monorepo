import type { NormalizedApiError } from "./apiError";

type Listener = (error: NormalizedApiError) => void;

const listeners = new Set<Listener>();

export function publishApiError(error: NormalizedApiError) {
  listeners.forEach((listener) => listener(error));
}

export function subscribeApiErrors(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

type BusModule = typeof import("@/utils/apiErrorBus");

async function loadBus(): Promise<BusModule> {
  vi.resetModules();
  return import("@/utils/apiErrorBus");
}

describe("apiErrorBus", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("publishes errors to active subscribers", async () => {
    const { publishApiError, subscribeApiErrors } = await loadBus();
    const listener = vi.fn();

    subscribeApiErrors(listener);
    publishApiError({ message: "Boom", retryable: true });

    expect(listener).toHaveBeenCalledWith({ message: "Boom", retryable: true });
  });

  it("supports multiple subscribers and duplicate publish calls", async () => {
    const { publishApiError, subscribeApiErrors } = await loadBus();
    const first = vi.fn();
    const second = vi.fn();

    subscribeApiErrors(first);
    subscribeApiErrors(second);

    publishApiError({ message: "First", retryable: false });
    publishApiError({ message: "Second", retryable: true, code: "RATE_LIMIT_EXCEEDED" });

    expect(first).toHaveBeenNthCalledWith(1, { message: "First", retryable: false });
    expect(first).toHaveBeenNthCalledWith(2, {
      message: "Second",
      retryable: true,
      code: "RATE_LIMIT_EXCEEDED",
    });
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("stops publishing after unsubscribe and safely ignores repeated unsubscribe calls", async () => {
    const { publishApiError, subscribeApiErrors } = await loadBus();
    const listener = vi.fn();

    const unsubscribe = subscribeApiErrors(listener);
    unsubscribe();
    unsubscribe();

    publishApiError({ message: "Ignored", retryable: false });

    expect(listener).not.toHaveBeenCalled();
  });
});

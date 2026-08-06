import { beforeEach, describe, expect, it, vi } from "vitest";

type LogModule = typeof import("@/utils/apiRequestLog");

async function loadLogModule(): Promise<LogModule> {
  vi.resetModules();
  return import("@/utils/apiRequestLog");
}

describe("apiRequestLog", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("starts empty and returns defensive copies", async () => {
    const { addApiRequestLog, getApiRequestLogs } = await loadLogModule();

    expect(getApiRequestLogs()).toEqual([]);

    addApiRequestLog({
      id: "1",
      method: "GET",
      url: "/health",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const firstSnapshot = getApiRequestLogs();
    const secondSnapshot = getApiRequestLogs();

    expect(firstSnapshot).toEqual(secondSnapshot);
    expect(firstSnapshot).not.toBe(secondSnapshot);

    firstSnapshot.push({
      id: "mutated",
      method: "POST",
      url: "/ignored",
      createdAt: "2026-01-01T00:00:01.000Z",
    });

    expect(getApiRequestLogs()).toHaveLength(1);
  });

  it("notifies subscribers immediately and on future updates", async () => {
    const { addApiRequestLog, subscribeApiRequestLogs } = await loadLogModule();
    const listener = vi.fn();

    const unsubscribe = subscribeApiRequestLogs(listener);
    expect(listener).toHaveBeenCalledWith([]);

    addApiRequestLog({
      id: "2",
      method: "POST",
      url: "/orders",
      status: 201,
      requestBody: { ok: true },
      createdAt: "2026-01-01T00:00:02.000Z",
    });

    expect(listener).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: "2",
        method: "POST",
        url: "/orders",
        status: 201,
      }),
    ]);

    unsubscribe();
    addApiRequestLog({
      id: "3",
      method: "DELETE",
      url: "/orders/1",
      createdAt: "2026-01-01T00:00:03.000Z",
    });

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps only the newest 100 entries in reverse chronological insertion order", async () => {
    const { addApiRequestLog, getApiRequestLogs } = await loadLogModule();

    for (let index = 1; index <= 105; index += 1) {
      addApiRequestLog({
        id: String(index),
        method: "GET",
        url: `/items/${index}`,
        durationMs: index,
        createdAt: `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
      });
    }

    const logs = getApiRequestLogs();
    expect(logs).toHaveLength(100);
    expect(logs[0]).toEqual(expect.objectContaining({ id: "105" }));
    expect(logs.at(-1)).toEqual(expect.objectContaining({ id: "6" }));
    expect(logs.some((entry) => entry.id === "5")).toBe(false);
  });
});

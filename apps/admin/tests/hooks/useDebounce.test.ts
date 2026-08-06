import { clearTimeout as nodeClearTimeout, setTimeout as nodeSetTimeout } from "node:timers";
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.stubGlobal("setTimeout", nodeSetTimeout);
    vi.stubGlobal("clearTimeout", nodeClearTimeout);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the initial value immediately and uses the default delay", () => {
    const { result } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "initial search" },
    });

    expect(result.current).toBe("initial search");

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current).toBe("initial search");
  });

  it("updates only after the debounce delay and supports custom delays", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "draft", delay: 200 },
      },
    );

    rerender({ value: "published", delay: 200 });

    expect(result.current).toBe("draft");

    act(() => {
      vi.advanceTimersByTime(199);
    });

    expect(result.current).toBe("draft");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe("published");
  });

  it("clears the previous timeout on rapid updates and keeps only the last value", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "a", delay: 300 },
      },
    );

    rerender({ value: "ab", delay: 300 });
    rerender({ value: "abc", delay: 300 });
    rerender({ value: "abcd", delay: 300 });

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe("abcd");
  });

  it("handles zero delay and same-value rerenders without unexpected behavior", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "", delay: 0 },
      },
    );

    expect(result.current).toBe("");

    rerender({ value: "ready", delay: 0 });
    expect(result.current).toBe("");

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe("ready");

    rerender({ value: "ready", delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe("ready");
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("cleans up pending timeouts on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "start", delay: 400 },
      },
    );

    rerender({ value: "end", delay: 400 });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

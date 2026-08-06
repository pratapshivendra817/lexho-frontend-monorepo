import { act, renderHook } from "@testing-library/react-native";
import { useDebouncedValue } from "../src/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the initial value immediately and the next value after delay", async () => {
    const { result, rerender } = await renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "first", delay: 100 } },
    );

    expect(result.current).toBe("first");
    await rerender({ value: "second", delay: 100 });
    expect(result.current).toBe("first");

    await act(async () => {
      jest.advanceTimersByTime(99);
    });
    expect(result.current).toBe("first");

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  });

  it("uses the default delay and cancels stale updates", async () => {
    const { result, rerender } = await renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "a" } },
    );

    await rerender({ value: "b" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: "c" });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe("c");
  });

  it("supports null, undefined, empty, zero-delay, and unmount cleanup", async () => {
    const clearSpy = jest.spyOn(globalThis, "clearTimeout");
    const { result, rerender, unmount } = await renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: null, delay: 0 } },
    );

    expect(result.current).toBeNull();
    await rerender({ value: undefined, delay: 0 });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(result.current).toBeUndefined();

    await rerender({ value: "", delay: 50 });
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});

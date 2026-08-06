import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";

const mockGetHomeSections = jest.fn();
const realSetTimeout = globalThis.setTimeout;

jest.mock("../src/modules/home/api", () => ({
  getHomeSections: () => mockGetHomeSections(),
}));

import { useHomeSections } from "../src/modules/home/useHomeSections";

const CACHE_KEY = "@customer_home_sections_cache_v1";

const sectionBuilder = (id = 1) => ({
  id,
  type: "TRUST" as const,
  title: `Section ${id}`,
  subtitle: null,
  icon: null,
  color: null,
  borderColor: null,
  backgroundColor: null,
  iconColor: null,
  priority: id,
  active: true,
  createdAt: null,
  items: [],
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useHomeSections", () => {
  beforeEach(async () => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.spyOn(globalThis, "setTimeout").mockImplementation(
      ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
        if (delay === 7000) return 1 as any;
        return realSetTimeout(callback, delay, ...args);
      }) as typeof setTimeout,
    );
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("loads live sections on mount and writes them to cache", async () => {
    const sections = [sectionBuilder()];
    const pending = deferred<typeof sections>();
    mockGetHomeSections.mockReturnValue(pending.promise);

    const { result } = await renderHook(() => useHomeSections());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.sections).toEqual([]);

    await act(async () => {
      pending.resolve(sections);
      await pending.promise;
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sections).toEqual(sections);
    expect(result.current.error).toBeNull();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      CACHE_KEY,
      JSON.stringify(sections),
    );
  });

  it("reloads data and clears a previous error", async () => {
    mockGetHomeSections
      .mockRejectedValueOnce(new Error("Initial failure"))
      .mockResolvedValueOnce([sectionBuilder(2)]);

    const { result } = await renderHook(() => useHomeSections());

    await waitFor(() =>
      expect(result.current.error).toBe("Initial failure"),
    );

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.sections).toEqual([sectionBuilder(2)]);
    expect(mockGetHomeSections).toHaveBeenCalledTimes(2);
  });

  it("falls back to a valid cached array when live loading fails", async () => {
    const cached = [sectionBuilder(3)];
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    jest.clearAllMocks();
    mockGetHomeSections.mockRejectedValue(new Error("Network unavailable"));

    const { result } = await renderHook(() => useHomeSections());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sections).toEqual(cached);
    expect(result.current.error).toBe(
      "Showing last updated home sections. Live refresh failed.",
    );
  });

  it.each([
    [null],
    ["not-json"],
    [JSON.stringify({ invalid: true })],
  ])("ignores unusable cached data %p", async cachedValue => {
    if (cachedValue !== null) {
      await AsyncStorage.setItem(CACHE_KEY, cachedValue);
    }
    jest.clearAllMocks();
    mockGetHomeSections.mockRejectedValue({});

    const { result } = await renderHook(() => useHomeSections());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sections).toEqual([]);
    expect(result.current.error).toBe("Unable to load home sections");
  });

  it("ignores cache read failures and reports the live error", async () => {
    mockGetHomeSections.mockRejectedValue(new Error("Live failed"));
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error("Storage failed"),
    );

    const { result } = await renderHook(() => useHomeSections());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sections).toEqual([]);
    expect(result.current.error).toBe("Live failed");
  });

  it("keeps successful live data when the cache write fails", async () => {
    const sections = [sectionBuilder(4)];
    mockGetHomeSections.mockResolvedValue(sections);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error("Storage full"),
    );

    const { result } = await renderHook(() => useHomeSections());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sections).toEqual(sections);
    expect(result.current.error).toBeNull();
  });

  it("times out after seven seconds and uses cached data", async () => {
    jest.restoreAllMocks();
    jest.useFakeTimers();
    const cached = [sectionBuilder(5)];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(cached),
    );
    mockGetHomeSections.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useHomeSections());

    await act(async () => {
      jest.advanceTimersByTime(7000);
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.sections).toEqual(cached);
    expect(result.current.error).toBe(
      "Showing last updated home sections. Live refresh failed.",
    );
  });

  it("starts only once across rerenders and supports safe unmount", async () => {
    mockGetHomeSections.mockResolvedValue([sectionBuilder(6)]);

    const { rerender, unmount } = await renderHook(() => useHomeSections());
    await rerender({});

    await waitFor(() => expect(mockGetHomeSections).toHaveBeenCalledTimes(1));

    expect(() => unmount()).not.toThrow();
  });
});

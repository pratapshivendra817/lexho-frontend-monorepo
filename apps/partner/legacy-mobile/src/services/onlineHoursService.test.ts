import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockApiPost = jest.fn();
const mockTrackEvent = jest.fn();
const mockRemoveAppStateListener = jest.fn();
let appStateListener: ((state: string) => void) | null = null;

jest.mock("./api", () => ({
  __esModule: true,
  default: {
    post: jest.fn((...args) => mockApiPost(...args)),
  },
}));

jest.mock("./firebaseAnalytics", () => ({
  PARTNER_ANALYTICS_EVENTS: {
    onlineHoursSynced: "partner_online_hours_synced",
  },
  trackEvent: jest.fn((...args) => mockTrackEvent(...args)),
}));

import {
  attachOnlineHoursLifecycle,
  beginOnlineSession,
  endOnlineSession,
  getOnlineHoursSnapshot,
  syncOnlineHoursToBackend,
} from "./onlineHoursService";

const asyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("onlineHoursService", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-08T10:00:00.000Z"));
    jest.clearAllMocks();
    appStateListener = null;
    mockApiPost.mockResolvedValue(undefined);
    mockTrackEvent.mockResolvedValue(undefined);
    await asyncStorageMock.clear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type: any, listener: any) => {
      appStateListener = listener;
      return { remove: mockRemoveAppStateListener } as any;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("returns the initial snapshot when storage is empty or invalid", async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce(null);

    await expect(getOnlineHoursSnapshot()).resolves.toEqual({
      activeSessionStartedAt: null,
      totalForegroundMsToday: 0,
      totalForegroundMsWeek: 0,
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      lastBackgroundAt: null,
    });

    asyncStorageMock.getItem.mockResolvedValueOnce("{bad-json");

    await expect(getOnlineHoursSnapshot()).resolves.toEqual({
      activeSessionStartedAt: null,
      totalForegroundMsToday: 0,
      totalForegroundMsWeek: 0,
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      lastBackgroundAt: null,
    });

    jest.setSystemTime(new Date("2026-07-12T10:00:00.000Z"));
    asyncStorageMock.getItem.mockResolvedValueOnce(null);

    await expect(getOnlineHoursSnapshot()).resolves.toEqual({
      activeSessionStartedAt: null,
      totalForegroundMsToday: 0,
      totalForegroundMsWeek: 0,
      dayBucket: "2026-07-12",
      weekBucket: "2026-W28",
      lastBackgroundAt: null,
    });
  });

  it("begins a new online session and rolls stale day and week buckets", async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 7200000,
        totalForegroundMsWeek: 14400000,
        dayBucket: "2026-07-01",
        weekBucket: "2026-W27",
        lastBackgroundAt: 100,
      }),
    );

    const snapshot = await beginOnlineSession(1000);

    expect(snapshot).toEqual({
      activeSessionStartedAt: 1000,
      totalForegroundMsToday: 0,
      totalForegroundMsWeek: 0,
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      lastBackgroundAt: null,
    });
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith(
      "partner_online_hours_v1",
      JSON.stringify(snapshot),
    );
  });

  it("preserves an existing active session start time when begin is called again", async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: 400,
        totalForegroundMsToday: 500,
        totalForegroundMsWeek: 600,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: 300,
      }),
    );

    const snapshot = await beginOnlineSession(1000);

    expect(snapshot.activeSessionStartedAt).toBe(400);
    expect(snapshot.lastBackgroundAt).toBeNull();
  });

  it("returns the existing snapshot when ending without an active session", async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 10,
        totalForegroundMsWeek: 20,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: null,
      }),
    );

    const snapshot = await endOnlineSession(1200);

    expect(snapshot).toEqual({
      activeSessionStartedAt: null,
      totalForegroundMsToday: 10,
      totalForegroundMsWeek: 20,
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      lastBackgroundAt: null,
    });
    expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("ends an active session, records elapsed time, and clamps negative deltas to zero", async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: 5000,
        totalForegroundMsToday: 100,
        totalForegroundMsWeek: 200,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: null,
      }),
    );

    const negativeDeltaSnapshot = await endOnlineSession(3000);

    expect(negativeDeltaSnapshot).toEqual({
      activeSessionStartedAt: null,
      totalForegroundMsToday: 100,
      totalForegroundMsWeek: 200,
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      lastBackgroundAt: 3000,
    });

    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: 1000,
        totalForegroundMsToday: 100,
        totalForegroundMsWeek: 200,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: null,
      }),
    );

    const snapshot = await endOnlineSession(2500);

    expect(snapshot).toEqual({
      activeSessionStartedAt: null,
      totalForegroundMsToday: 1600,
      totalForegroundMsWeek: 1700,
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      lastBackgroundAt: 2500,
    });
  });

  it("syncs online hours to the primary endpoint and tracks analytics", async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 5400000,
        totalForegroundMsWeek: 12600000,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: null,
      }),
    );

    const payload = await syncOnlineHoursToBackend();

    expect(payload).toEqual({
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      dailyOnlineHours: 1.5,
      weeklyOnlineHours: 3.5,
    });
    expect(mockApiPost).toHaveBeenCalledWith("/api/v1/partner/online-hours", payload);
    expect(mockTrackEvent).toHaveBeenCalledWith("partner_online_hours_synced", payload);
  });

  it("falls back to the secondary endpoint and returns payload without analytics if both requests fail", async () => {
    asyncStorageMock.getItem.mockResolvedValue(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 3600000,
        totalForegroundMsWeek: 7200000,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: null,
      }),
    );

    mockApiPost.mockRejectedValueOnce(new Error("primary down")).mockResolvedValueOnce(undefined);

    const payload = await syncOnlineHoursToBackend();

    expect(mockApiPost).toHaveBeenNthCalledWith(1, "/api/v1/partner/online-hours", payload);
    expect(mockApiPost).toHaveBeenNthCalledWith(2, "/api/partner/online-hours", payload);
    expect(mockTrackEvent).toHaveBeenCalledWith("partner_online_hours_synced", payload);

    mockApiPost.mockReset();
    mockTrackEvent.mockReset();
    mockApiPost.mockRejectedValueOnce(new Error("primary down")).mockRejectedValueOnce(new Error("secondary down"));

    const fallbackPayload = await syncOnlineHoursToBackend();

    expect(fallbackPayload).toEqual({
      dayBucket: "2026-07-08",
      weekBucket: "2026-W28",
      dailyOnlineHours: 1,
      weeklyOnlineHours: 2,
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("attaches app state lifecycle listeners and cleans them up", async () => {
    const unsubscribe = attachOnlineHoursLifecycle(() => true);

    expect(AppState.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(appStateListener).toBeTruthy();

    await appStateListener?.("active");
    await Promise.resolve();
    expect(asyncStorageMock.setItem).toHaveBeenCalled();

    asyncStorageMock.setItem.mockClear();
    asyncStorageMock.getItem.mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: 1000,
        totalForegroundMsToday: 100,
        totalForegroundMsWeek: 200,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: null,
      }),
    );
    jest.spyOn(Date, "now").mockReturnValue(2500);

    await appStateListener?.("background");
    await Promise.resolve();

    expect(asyncStorageMock.setItem).toHaveBeenCalledWith(
      "partner_online_hours_v1",
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 1600,
        totalForegroundMsWeek: 1700,
        dayBucket: "2026-07-08",
        weekBucket: "2026-W28",
        lastBackgroundAt: 2500,
      }),
    );

    unsubscribe();
    expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
  });

  it("ignores lifecycle transitions when tracking is disabled", async () => {
    attachOnlineHoursLifecycle(() => false);

    await appStateListener?.("active");
    await appStateListener?.("background");
    await Promise.resolve();

    expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
  });
});

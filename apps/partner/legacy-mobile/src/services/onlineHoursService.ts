import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

import API from "./api";
import { trackEvent, PARTNER_ANALYTICS_EVENTS } from "./firebaseAnalytics";

const ONLINE_HOURS_KEY = "partner_online_hours_v1";

export type OnlineHoursSnapshot = {
  activeSessionStartedAt: number | null;
  totalForegroundMsToday: number;
  totalForegroundMsWeek: number;
  dayBucket: string;
  weekBucket: string;
  lastBackgroundAt: number | null;
};

function getDayBucket(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getWeekBucket(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const initialSnapshot = (): OnlineHoursSnapshot => ({
  activeSessionStartedAt: null,
  totalForegroundMsToday: 0,
  totalForegroundMsWeek: 0,
  dayBucket: getDayBucket(),
  weekBucket: getWeekBucket(),
  lastBackgroundAt: null,
});

export async function getOnlineHoursSnapshot() {
  const raw = await AsyncStorage.getItem(ONLINE_HOURS_KEY);
  if (!raw) return initialSnapshot();
  try {
    const parsed = JSON.parse(raw) as OnlineHoursSnapshot;
    return parsed;
  } catch {
    return initialSnapshot();
  }
}

async function saveOnlineHoursSnapshot(snapshot: OnlineHoursSnapshot) {
  await AsyncStorage.setItem(ONLINE_HOURS_KEY, JSON.stringify(snapshot));
}

function rollBuckets(snapshot: OnlineHoursSnapshot) {
  const nextDayBucket = getDayBucket();
  const nextWeekBucket = getWeekBucket();
  return {
    ...snapshot,
    totalForegroundMsToday: snapshot.dayBucket === nextDayBucket ? snapshot.totalForegroundMsToday : 0,
    totalForegroundMsWeek: snapshot.weekBucket === nextWeekBucket ? snapshot.totalForegroundMsWeek : 0,
    dayBucket: nextDayBucket,
    weekBucket: nextWeekBucket,
  };
}

export async function beginOnlineSession(startedAt = Date.now()) {
  const snapshot = rollBuckets(await getOnlineHoursSnapshot());
  const next = {
    ...snapshot,
    activeSessionStartedAt: snapshot.activeSessionStartedAt ?? startedAt,
    lastBackgroundAt: null,
  };
  await saveOnlineHoursSnapshot(next);
  return next;
}

export async function endOnlineSession(endedAt = Date.now()) {
  const snapshot = rollBuckets(await getOnlineHoursSnapshot());
  if (!snapshot.activeSessionStartedAt) {
    return snapshot;
  }
  const delta = Math.max(0, endedAt - snapshot.activeSessionStartedAt);
  const next = {
    ...snapshot,
    activeSessionStartedAt: null,
    lastBackgroundAt: endedAt,
    totalForegroundMsToday: snapshot.totalForegroundMsToday + delta,
    totalForegroundMsWeek: snapshot.totalForegroundMsWeek + delta,
  };
  await saveOnlineHoursSnapshot(next);
  return next;
}

export async function syncOnlineHoursToBackend() {
  const snapshot = await getOnlineHoursSnapshot();
  const payload = {
    dayBucket: snapshot.dayBucket,
    weekBucket: snapshot.weekBucket,
    dailyOnlineHours: Number((snapshot.totalForegroundMsToday / 3600000).toFixed(2)),
    weeklyOnlineHours: Number((snapshot.totalForegroundMsWeek / 3600000).toFixed(2)),
  };
  try {
    await API.post("/api/v1/partner/online-hours", payload);
  } catch {
    try {
      await API.post("/api/partner/online-hours", payload);
    } catch {
      return payload;
    }
  }
  await trackEvent(PARTNER_ANALYTICS_EVENTS.onlineHoursSynced, payload);
  return payload;
}

export function attachOnlineHoursLifecycle(enabled: () => boolean) {
  const sub = AppState.addEventListener("change", (state) => {
    if (!enabled()) return;
    if (state === "active") {
      void beginOnlineSession();
    } else {
      void endOnlineSession();
    }
  });
  return () => sub.remove();
}


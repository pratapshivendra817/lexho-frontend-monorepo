import AsyncStorage from "@react-native-async-storage/async-storage";

import { SHIFT_STORAGE_KEYS, SHIFT_TRACKING } from "./constants";
import type { ShiftHistoryItem, ShiftStateSnapshot } from "./types";

export async function saveShiftState(state: ShiftStateSnapshot) {
  await AsyncStorage.setItem(SHIFT_STORAGE_KEYS.state, JSON.stringify(state));
}

export async function getShiftState(): Promise<ShiftStateSnapshot | null> {
  const raw = await AsyncStorage.getItem(SHIFT_STORAGE_KEYS.state);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ShiftStateSnapshot;
  } catch {
    return null;
  }
}

export async function clearShiftState() {
  await AsyncStorage.removeItem(SHIFT_STORAGE_KEYS.state);
}

export async function getShiftHistory(): Promise<ShiftHistoryItem[]> {
  const raw = await AsyncStorage.getItem(SHIFT_STORAGE_KEYS.history);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ShiftHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addShiftHistory(item: ShiftHistoryItem) {
  const history = await getShiftHistory();
  const next = [item, ...history].slice(0, SHIFT_TRACKING.historyLimit);
  await AsyncStorage.setItem(SHIFT_STORAGE_KEYS.history, JSON.stringify(next));
}

export async function replaceShiftHistory(items: ShiftHistoryItem[]) {
  const next = items.slice(0, SHIFT_TRACKING.historyLimit);
  await AsyncStorage.setItem(SHIFT_STORAGE_KEYS.history, JSON.stringify(next));
}

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  addShiftHistory,
  clearShiftState,
  getShiftHistory,
  getShiftState,
  replaceShiftHistory,
  saveShiftState,
} from "./shiftStorage";
import { SHIFT_STORAGE_KEYS, SHIFT_TRACKING } from "./constants";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("shiftStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveShiftState", () => {
    it("writes the serialized shift state", async () => {
      const snapshot = { shiftStarted: true, online: false, locationEnabled: true, startedAt: 123 };

      await saveShiftState(snapshot);

      expect(mockStorage.setItem).toHaveBeenCalledWith(SHIFT_STORAGE_KEYS.state, JSON.stringify(snapshot));
    });
  });

  describe("getShiftState", () => {
    it("returns null when the saved state is missing", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      await expect(getShiftState()).resolves.toBeNull();
    });

    it("returns the parsed snapshot when the stored JSON is valid", async () => {
      const snapshot = { shiftStarted: true, online: true, locationEnabled: false, startedAt: 222 };
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(snapshot));

      await expect(getShiftState()).resolves.toEqual(snapshot);
    });

    it("returns null when the stored JSON is invalid", async () => {
      mockStorage.getItem.mockResolvedValueOnce("{broken");

      await expect(getShiftState()).resolves.toBeNull();
    });
  });

  describe("clearShiftState", () => {
    it("removes the saved state key", async () => {
      await clearShiftState();

      expect(mockStorage.removeItem).toHaveBeenCalledWith(SHIFT_STORAGE_KEYS.state);
    });
  });

  describe("getShiftHistory", () => {
    it("returns an empty array when history is missing", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      await expect(getShiftHistory()).resolves.toEqual([]);
    });

    it("returns an empty array when history is not an array", async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify({}));

      await expect(getShiftHistory()).resolves.toEqual([]);
    });

    it("returns an empty array when history JSON is invalid", async () => {
      mockStorage.getItem.mockResolvedValueOnce("{oops");

      await expect(getShiftHistory()).resolves.toEqual([]);
    });

    it("returns the parsed history when JSON is valid", async () => {
      const history = [{ id: "1", startedAt: 1, endedAt: 2, durationSeconds: 1 }];
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(history));

      await expect(getShiftHistory()).resolves.toEqual(history);
    });
  });

  describe("addShiftHistory", () => {
    it("prepends the new item and enforces the history limit", async () => {
      const existing = Array.from({ length: SHIFT_TRACKING.historyLimit }, (_, index) => ({
        id: `old-${index}`,
        startedAt: index,
        endedAt: index + 1,
        durationSeconds: 1,
      }));
      const nextItem = { id: "new", startedAt: 100, endedAt: 200, durationSeconds: 100 };
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(existing));

      await addShiftHistory(nextItem);

      const savedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string);
      expect(savedHistory).toHaveLength(SHIFT_TRACKING.historyLimit);
      expect(savedHistory[0]).toEqual(nextItem);
      expect(savedHistory.at(-1)?.id).toBe(`old-${SHIFT_TRACKING.historyLimit - 2}`);
    });
  });

  describe("replaceShiftHistory", () => {
    it("replaces the history and trims extra items", async () => {
      const items = Array.from({ length: SHIFT_TRACKING.historyLimit + 3 }, (_, index) => ({
        id: `item-${index}`,
        startedAt: index,
        endedAt: index + 10,
        durationSeconds: 10,
      }));

      await replaceShiftHistory(items);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        SHIFT_STORAGE_KEYS.history,
        JSON.stringify(items.slice(0, SHIFT_TRACKING.historyLimit)),
      );
    });
  });
});

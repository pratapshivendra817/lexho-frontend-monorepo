import AsyncStorage from "@react-native-async-storage/async-storage";

import { SHIFT_STORAGE_KEYS, SHIFT_TRACKING } from "./constants";
import { enqueueLocation, flushLocationQueue } from "./locationQueue";
import { sendPartnerLocationApi } from "./shiftApi";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock("./shiftApi", () => ({
  sendPartnerLocationApi: jest.fn(),
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSendPartnerLocationApi = sendPartnerLocationApi as jest.MockedFunction<typeof sendPartnerLocationApi>;

describe("locationQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("enqueueLocation", () => {
    it("appends a location payload to the queue", async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
      const payload = { latitude: 1, longitude: 2, capturedAt: 3 };

      await enqueueLocation(payload);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        SHIFT_STORAGE_KEYS.locationQueue,
        JSON.stringify([payload]),
      );
    });

    it("drops the oldest items when the queue exceeds the max size", async () => {
      const queue = Array.from({ length: SHIFT_TRACKING.maxQueueSize }, (_, index) => ({
        latitude: index,
        longitude: index,
        capturedAt: index,
      }));
      const payload = { latitude: 999, longitude: 999, capturedAt: 999 };
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(queue));

      await enqueueLocation(payload);

      const savedQueue = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string);
      expect(savedQueue).toHaveLength(SHIFT_TRACKING.maxQueueSize);
      expect(savedQueue.at(-1)).toEqual(payload);
      expect(savedQueue[0].capturedAt).toBe(1);
    });
  });

  describe("flushLocationQueue", () => {
    it("returns early when the queue is empty", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      await expect(flushLocationQueue()).resolves.toBeUndefined();
      expect(mockSendPartnerLocationApi).not.toHaveBeenCalled();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it("sends every queued location and clears successful items", async () => {
      const queue = [
        { latitude: 1, longitude: 2, capturedAt: 3 },
        { latitude: 4, longitude: 5, capturedAt: 6 },
      ];
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(queue));
      mockSendPartnerLocationApi.mockResolvedValue(undefined as any);

      await flushLocationQueue();

      expect(mockSendPartnerLocationApi).toHaveBeenNthCalledWith(1, queue[0]);
      expect(mockSendPartnerLocationApi).toHaveBeenNthCalledWith(2, queue[1]);
      expect(mockStorage.setItem).toHaveBeenCalledWith(SHIFT_STORAGE_KEYS.locationQueue, JSON.stringify([]));
    });

    it("retains failed queue items after a partial flush failure", async () => {
      const queue = [
        { latitude: 1, longitude: 2, capturedAt: 3 },
        { latitude: 4, longitude: 5, capturedAt: 6 },
      ];
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(queue));
      mockSendPartnerLocationApi
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error("network unavailable"));

      await flushLocationQueue();

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        SHIFT_STORAGE_KEYS.locationQueue,
        JSON.stringify([queue[1]]),
      );
    });

    it("treats invalid stored queue JSON as an empty queue", async () => {
      mockStorage.getItem.mockResolvedValueOnce("{bad");

      await flushLocationQueue();

      expect(mockSendPartnerLocationApi).not.toHaveBeenCalled();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it("treats a parsed non-array queue value as empty", async () => {
      mockStorage.getItem.mockResolvedValueOnce(JSON.stringify({ items: [] }));

      await flushLocationQueue();

      expect(mockSendPartnerLocationApi).not.toHaveBeenCalled();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });
  });
});

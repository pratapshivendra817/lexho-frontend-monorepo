import { SHIFT_STORAGE_KEYS, SHIFT_TRACKING } from "./constants";

describe("constants", () => {
  describe("SHIFT_STORAGE_KEYS", () => {
    it("exposes the expected storage keys", () => {
      expect(SHIFT_STORAGE_KEYS).toEqual({
        state: "partner_shift_state_v1",
        history: "partner_shift_history_v1",
        locationQueue: "partner_shift_location_queue_v1",
      });
    });
  });

  describe("SHIFT_TRACKING", () => {
    it("exposes the expected tracking values", () => {
      expect(SHIFT_TRACKING.minDistanceMeters).toBe(50);
      expect(SHIFT_TRACKING.minIntervalMs).toBe(25_000);
      expect(SHIFT_TRACKING.maxQueueSize).toBe(200);
      expect(SHIFT_TRACKING.historyLimit).toBe(30);
    });
  });
});

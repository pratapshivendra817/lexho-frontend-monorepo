export const SHIFT_STORAGE_KEYS = {
  state: "partner_shift_state_v1",
  history: "partner_shift_history_v1",
  locationQueue: "partner_shift_location_queue_v1",
} as const;

export const SHIFT_TRACKING = {
  minDistanceMeters: 50,
  minIntervalMs: 25_000,
  maxQueueSize: 200,
  historyLimit: 30,
} as const;

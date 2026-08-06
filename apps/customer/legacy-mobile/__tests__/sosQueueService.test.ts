const mockStorage = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null), setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }), removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }) }));
import { getQueuedSOSEvents, queueSOSEvent, removeQueuedSOSEvents } from "../src/modules/sos/services/SOSQueueService";

const event = { eventId: "e1", eventType: "ACTIVATE" as const, location: { latitude: 1, longitude: 2, accuracy: 5, capturedAt: "2026-01-01T00:00:00.000Z" }, createdAt: "2026-01-01T00:00:00.000Z" };
describe("SOSQueueService", () => {
  beforeEach(() => mockStorage.clear());
  it("queues idempotently and removes delivered events", async () => { await queueSOSEvent(event); await queueSOSEvent(event); expect(await getQueuedSOSEvents()).toHaveLength(1); await removeQueuedSOSEvents(1); expect(await getQueuedSOSEvents()).toEqual([]); });
  it("recovers from malformed persisted data", async () => { mockStorage.set("@lexho/customer/sos-queue", "bad-json"); expect(await getQueuedSOSEvents()).toEqual([]); });
});

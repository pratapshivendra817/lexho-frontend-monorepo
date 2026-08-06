jest.mock("@react-native-community/netinfo", () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock("../src/api/client", () => ({ api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() } }));
jest.mock("../src/modules/sos/services/SOSQueueService", () => ({ getQueuedSOSEvents: jest.fn(async () => []), queueSOSEvent: jest.fn(), removeQueuedSOSEvents: jest.fn() }));
import { createEmergencyContact, deleteEmergencyContact, flushSOSQueue, getEmergencyContacts, sendSOSEvent } from "../src/modules/sos/services/SOSApiService";
const mockFetch = require("@react-native-community/netinfo").default.fetch as jest.Mock;
const { api: mockApi } = require("../src/api/client");
const mockPost = mockApi.post as jest.Mock; const mockGet = mockApi.get as jest.Mock; const mockDelete = mockApi.delete as jest.Mock;
const mockQueue = require("../src/modules/sos/services/SOSQueueService").queueSOSEvent as jest.Mock;
const mockQueueModule = require("../src/modules/sos/services/SOSQueueService");

const event = { eventId: "e1", eventType: "ACTIVATE" as const, location: { latitude: 1, longitude: 2, accuracy: 5, capturedAt: "now" }, createdAt: "now" };
describe("SOSApiService", () => {
  beforeEach(() => jest.clearAllMocks());
  it("queues immediately while offline", async () => { mockFetch.mockResolvedValue({ isConnected: false }); await expect(sendSOSEvent(event)).resolves.toEqual({ queued: true }); expect(mockQueue).toHaveBeenCalledWith(event); expect(mockPost).not.toHaveBeenCalled(); });
  it("sends while online and queues network failures", async () => { mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true }); mockPost.mockResolvedValueOnce({}); await expect(sendSOSEvent(event)).resolves.toEqual({ queued: false }); mockPost.mockRejectedValueOnce(new Error("network")); await expect(sendSOSEvent(event)).resolves.toEqual({ queued: true }); });
  it("maps contacts and deletes by encoded id", async () => { mockGet.mockResolvedValue({ data: { data: [{ id: 1, name: "Home", phone: "112", primary: true }] } }); await expect(getEmergencyContacts()).resolves.toEqual([{ id: "1", name: "Home", phone: "112", relationship: undefined, primary: true }]); await deleteEmergencyContact("a/b"); expect(mockDelete).toHaveBeenCalledWith("/api/v1/customer/emergency-contacts/a%2Fb"); });
  it("creates contacts and flushes queued SOS events in order", async () => { mockPost.mockResolvedValue({ data: { data: { id: "c1" } } }); await expect(createEmergencyContact({ name: "Home", phone: "112" })).resolves.toEqual({ id: "c1" }); mockQueueModule.getQueuedSOSEvents.mockResolvedValueOnce([event, { ...event, eventId: "e2" }]); await expect(flushSOSQueue()).resolves.toBe(2); expect(mockQueueModule.removeQueuedSOSEvents).toHaveBeenCalledWith(2); });
  it("does not queue backend validation failures", async () => { mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true }); const error = { response: { status: 400 } }; mockPost.mockRejectedValueOnce(error); await expect(sendSOSEvent(event)).rejects.toBe(error); expect(mockQueue).not.toHaveBeenCalled(); });
});

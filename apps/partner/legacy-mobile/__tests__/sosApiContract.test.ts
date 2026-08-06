jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock("../src/services/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock("../src/modules/sos/services/SOSQueueService", () => ({
  getQueuedSOSRequests: jest.fn(async () => []),
  queueSOSRequest: jest.fn(),
  removeQueuedSOSRequests: jest.fn(),
  cacheEmergencyContact: jest.fn(),
  getCachedEmergencyContacts: jest.fn(async () => []),
}));

import {
  addEmergencyContact,
  flushSOSQueue,
  getEmergencyContacts,
  getSOSHistory,
  triggerSOS,
} from "../src/modules/sos/services/SOSApiService";

const mockNetInfoFetch = require("@react-native-community/netinfo").default.fetch as jest.Mock;
const mockApi = require("../src/services/api").default;
const mockQueueService = require("../src/modules/sos/services/SOSQueueService");

describe("partner emergency SOS API contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  });

  it("sends only the payload fields to the trigger endpoint on success", async () => {
    const payload = {
      latitude: 28.6139,
      longitude: 77.209,
      accuracyMeters: 5.2,
      address: "Connaught Place, New Delhi",
      message: "Unsafe situation",
    };
    mockApi.post.mockResolvedValue({ data: { data: { eventId: "sos-1", status: "TRIGGERED", ...payload } } });

    const result = await triggerSOS(payload);

    expect(mockApi.post).toHaveBeenCalledWith("/api/v1/emergency/sos", payload);
    expect(result).toEqual({
      queued: false,
      incident: expect.objectContaining({ eventId: "sos-1", status: "TRIGGERED" }),
    });
  });

  it("queues SOS requests when the device is offline or internet is unreachable", async () => {
    const payload = { latitude: 1, longitude: 2, message: "help" };
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });

    await expect(triggerSOS(payload as any)).resolves.toEqual({ queued: true, incident: null });
    expect(mockQueueService.queueSOSRequest).toHaveBeenCalledWith(payload);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("queues SOS requests for network failures without an HTTP response", async () => {
    const payload = { latitude: 3, longitude: 4 };
    mockApi.post.mockRejectedValueOnce(new Error("Network down"));

    await expect(triggerSOS(payload as any)).resolves.toEqual({ queued: true, incident: null });
    expect(mockQueueService.queueSOSRequest).toHaveBeenCalledWith(payload);
  });

  it("rethrows server-side SOS failures that include an HTTP response", async () => {
    const error = { response: { status: 500 }, message: "server failed" };
    mockApi.post.mockRejectedValueOnce(error);

    await expect(triggerSOS({ latitude: 9, longitude: 8 } as any)).rejects.toBe(error);
    expect(mockQueueService.queueSOSRequest).not.toHaveBeenCalled();
  });

  it("flushes queued SOS requests, removes delivered rows, and stops at the first failure", async () => {
    const queue = [
      { latitude: 1, longitude: 1, message: "first" },
      { latitude: 2, longitude: 2, message: "second" },
      { latitude: 3, longitude: 3, message: "third" },
    ];
    mockQueueService.getQueuedSOSRequests.mockResolvedValueOnce(queue);
    mockApi.post
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new Error("still offline"));

    await expect(flushSOSQueue()).resolves.toBe(2);
    expect(mockApi.post).toHaveBeenNthCalledWith(1, "/api/v1/emergency/sos", queue[0]);
    expect(mockApi.post).toHaveBeenNthCalledWith(2, "/api/v1/emergency/sos", queue[1]);
    expect(mockQueueService.removeQueuedSOSRequests).toHaveBeenCalledWith(2);
  });

  it("maps SOS history from multiple backend response envelopes", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        content: [
          {
            id: 7,
            status: "resolved",
            location: { latitude: "12.4", longitude: "77.8" },
            accuracy: 14,
            address: "MG Road",
            message: "Resolved case",
            createdAt: "2026-07-14T08:00:00.000Z",
            acknowledgedAt: "2026-07-14T08:05:00.000Z",
            resolvedAt: "2026-07-14T08:10:00.000Z",
          },
        ],
      },
    });

    await expect(getSOSHistory()).resolves.toEqual([
      {
        eventId: "7",
        status: "RESOLVED",
        latitude: 12.4,
        longitude: 77.8,
        accuracyMeters: 14,
        address: "MG Road",
        message: "Resolved case",
        createdAt: "2026-07-14T08:00:00.000Z",
        acknowledgedAt: "2026-07-14T08:05:00.000Z",
        resolvedAt: "2026-07-14T08:10:00.000Z",
      },
    ]);
  });

  it("returns an empty history array when the backend payload is not an array", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { notContent: true } } });

    await expect(getSOSHistory()).resolves.toEqual([]);
  });

  it("adds emergency contacts, caches the normalized record, and maps cached contacts", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123456);
    const payload = {
      name: "Amit Kumar",
      phoneNumber: "9999999999",
      relationship: "Brother",
      email: "amit@example.com",
      primaryContact: true,
    };
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          contactId: 42,
          name: payload.name,
          phone: payload.phoneNumber,
          relationship: payload.relationship,
          email: payload.email,
          primary: true,
        },
      },
    });
    mockQueueService.getCachedEmergencyContacts.mockResolvedValueOnce([
      { id: 1, name: "Neha", phoneNumber: "8888888888", primaryContact: false },
      { name: "Fallback", phone: "7777777777", primary: true },
    ]);

    const created = await addEmergencyContact(payload);
    const contacts = await getEmergencyContacts();

    expect(mockApi.post).toHaveBeenCalledWith("/api/v1/emergency/contact", payload);
    expect(created).toEqual({
      id: "42",
      name: "Amit Kumar",
      phoneNumber: "9999999999",
      relationship: "Brother",
      email: "amit@example.com",
      primaryContact: true,
    });
    expect(mockQueueService.cacheEmergencyContact).toHaveBeenCalledWith(created);
    expect(contacts).toEqual([
      {
        id: "1",
        name: "Neha",
        phoneNumber: "8888888888",
        relationship: undefined,
        email: undefined,
        primaryContact: false,
      },
      {
        id: "123456",
        name: "Fallback",
        phoneNumber: "7777777777",
        relationship: undefined,
        email: undefined,
        primaryContact: true,
      },
    ]);
  });
});

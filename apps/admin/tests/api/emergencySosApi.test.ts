import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock("@/api/axios", () => ({ api: { get: mocks.get, patch: mocks.patch } }));
import { acknowledgeEmergencyIncident, fetchEmergencyIncident, fetchEmergencyIncidents, resolveEmergencyIncident } from "@/features/emergency-sos/api/emergencySosApi";

describe("emergencySosApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists and maps emergency incidents with filters", async () => {
    mocks.get.mockResolvedValue({ data: { data: { content: [{ eventId: "e1", partnerId: 7, status: "TRIGGERED", latitude: 28.6, longitude: 77.2 }], totalElements: 1, totalPages: 1 } } });
    const result = await fetchEmergencyIncidents({ page: 1, limit: 20, status: "TRIGGERED", partnerId: "7" });
    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/emergency/incidents", { params: { page: 1, limit: 20, status: "TRIGGERED", partnerId: "7" } });
    expect(result.content[0]).toMatchObject({ eventId: "e1", partnerId: 7, status: "TRIGGERED" });
  });

  it("maps fallback list payload shapes and default values", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 12,
            partner: { id: "44", name: "Asha", phone: "8888" },
            status: "acknowledged",
            location: { latitude: "10.5", longitude: "20.25", accuracyMeters: 8, address: "Sector 5" },
            triggeredAt: "2026-05-02T10:00:00.000Z",
            acknowledgeNote: "Handled",
            resolveNote: "Resolved",
            requestId: "req-2",
            correlationId: "corr-2",
          },
        ],
        number: "3",
        size: "5",
        total: "1",
      },
    });
    mocks.get.mockResolvedValueOnce({
      data: [
        {
          eventId: "row-2",
          partnerId: "bad-number",
          status: undefined,
          latitude: undefined,
          longitude: undefined,
          accuracy: 12,
        },
      ],
    });

    const first = await fetchEmergencyIncidents({ page: 2, limit: 5, status: "", partnerId: "" });
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/v1/admin/emergency/incidents", {
      params: { page: 2, limit: 5, status: undefined, partnerId: undefined },
    });
    expect(first).toEqual({
      content: [
        expect.objectContaining({
          eventId: "12",
          partnerId: 44,
          partnerName: "Asha",
          partnerPhone: "8888",
          status: "ACKNOWLEDGED",
          latitude: 10.5,
          longitude: 20.25,
          accuracyMeters: 8,
          address: "Sector 5",
          acknowledgementNote: "Handled",
          resolutionNote: "Resolved",
          createdAt: "2026-05-02T10:00:00.000Z",
        }),
      ],
      page: 3,
      limit: 5,
      totalElements: 1,
      totalPages: 1,
    });

    const second = await fetchEmergencyIncidents({ page: 4, limit: 10, status: "", partnerId: "" });
    expect(second).toEqual({
      content: [
        expect.objectContaining({
          eventId: "row-2",
          partnerId: undefined,
          status: "TRIGGERED",
          latitude: 0,
          longitude: 0,
          accuracyMeters: 12,
        }),
      ],
      page: 4,
      limit: 10,
      totalElements: 1,
      totalPages: 1,
    });
  });

  it("loads, acknowledges and resolves an incident", async () => {
    mocks.get.mockResolvedValue({ data: { eventId: "e/1", status: "TRIGGERED", latitude: 1, longitude: 2 } });
    mocks.patch.mockResolvedValue({ data: { eventId: "e/1", status: "ACKNOWLEDGED", latitude: 1, longitude: 2 } });
    await fetchEmergencyIncident("e/1");
    await acknowledgeEmergencyIncident("e/1", "Ops team engaged");
    await resolveEmergencyIncident("e/1", "Partner confirmed safe");
    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/emergency/incidents/e%2F1");
    expect(mocks.patch).toHaveBeenNthCalledWith(1, "/api/v1/admin/emergency/incidents/e%2F1/acknowledge", { note: "Ops team engaged" });
    expect(mocks.patch).toHaveBeenNthCalledWith(2, "/api/v1/admin/emergency/incidents/e%2F1/resolve", { note: "Partner confirmed safe" });
  });

  it("maps single incident responses with partner and accuracy fallbacks", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          id: "e-2",
          partner: { id: "21", name: "Dev", phone: "7777" },
          status: "resolved",
          latitude: "1.25",
          longitude: "2.75",
          accuracy: 14,
          location: { address: "Jaipur" },
        },
      },
    });
    mocks.patch.mockResolvedValue({
      data: {
        data: {
          id: "e-2",
          partner: { id: "21" },
          status: "resolved",
          latitude: 1,
          longitude: 2,
        },
      },
    });

    await expect(fetchEmergencyIncident("e-2")).resolves.toMatchObject({
      eventId: "e-2",
      partnerId: 21,
      partnerName: "Dev",
      partnerPhone: "7777",
      status: "RESOLVED",
      accuracyMeters: 14,
      address: "Jaipur",
    });
    await expect(acknowledgeEmergencyIncident("e-2", "done")).resolves.toMatchObject({ eventId: "e-2" });
    await expect(resolveEmergencyIncident("e-2", "closed")).resolves.toMatchObject({ eventId: "e-2" });
  });

  it("falls back for empty payloads and non-array incident rows", async () => {
    mocks.get.mockResolvedValueOnce({ data: undefined });
    mocks.get.mockResolvedValueOnce({ data: { data: { content: "bad-payload", totalElements: undefined } } });
    mocks.get.mockResolvedValueOnce({ data: undefined });

    await expect(fetchEmergencyIncidents({ page: 6, limit: 3 })).resolves.toEqual({
      content: [],
      page: 6,
      limit: 3,
      totalElements: 0,
      totalPages: 0,
    });
    await expect(fetchEmergencyIncidents({ page: 7, limit: 4 })).resolves.toEqual({
      content: [],
      page: 7,
      limit: 4,
      totalElements: 11,
      totalPages: 3,
    });
    await expect(fetchEmergencyIncident("missing")).resolves.toMatchObject({
      eventId: "",
      partnerId: undefined,
      status: "TRIGGERED",
      latitude: 0,
      longitude: 0,
      accuracyMeters: null,
    });
  });
});

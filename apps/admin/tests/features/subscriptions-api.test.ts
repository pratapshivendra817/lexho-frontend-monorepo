import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    patch: mocks.patch,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
  },
}));

import {
  assignAdminSubscriptionPartner,
  assignAdminSubscriptionVisitPartner,
  getAdminSubscriptionAssignment,
  getAdminSubscriptionCalendar,
  getAdminSubscriptionDetail,
  getAdminSubscriptionEligiblePartners,
  getAdminSubscriptions,
  replaceAdminSubscriptionPartner,
  updateAdminSubscriptionStatus,
  updateAdminSubscriptionVisitStatus,
} from "@/features/subscriptions/api/subscriptionsApi";
import {
  createAdminCookSubscriptionPricing,
  createAdminSubscriptionPricing,
  deleteAdminCookSubscriptionPricing,
  deleteAdminSubscriptionPricing,
  getAdminCookSubscriptionPricing,
  getAdminSubscriptionPricing,
  updateAdminCookSubscriptionPricing,
  updateAdminSubscriptionPricing,
} from "@/features/subscriptions/api/subscriptionPricingApi";

describe("subscriptions api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps subscription list, details, calendar, and assignments", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                subscriptionId: "15",
                customer: { id: "9", name: "Neha" },
                service: { id: "3", name: "Cook" },
                partner: { name: "Ravi" },
                totalVisits: "12",
                totalAmount: "1999",
              },
            ],
            total: "1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 15,
            customerName: "Neha",
            addressDetails: { fullAddress: "Sector 18" },
            samePartnerPreferred: "true",
            replacementPartnerAllowed: 1,
            autoRenewal: false,
            trialVisit: "yes",
            serviceInstructions: "Ring bell",
            addOns: ["Apron"],
            visits: [{ visitId: "1", slot: "10-11", partner: { name: "Ravi" } }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: { calendar: [{ id: "2", scheduledDate: "2026-07-20", status: "DONE" }] },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptionId: "15",
            partnerId: "7",
            replacementPartnerId: "8",
            visitAssignments: [{ id: "1", visitId: "2", partnerId: "7", status: "ASSIGNED" }],
          },
        },
      });

    await expect(getAdminSubscriptions({ page: 1, size: 10, customerId: "", status: "" })).resolves.toEqual({
      content: [
        expect.objectContaining({
          id: 15,
          customerId: 9,
          customerName: "Neha",
          serviceId: 3,
          serviceName: "Cook",
          visits: 12,
          finalAmount: 1999,
          partnerName: "Ravi",
        }),
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 1,
    });

    await expect(getAdminSubscriptionDetail("15")).resolves.toMatchObject({
      id: 15,
      address: "Sector 18",
      samePartnerPreferred: true,
      replacementPartnerAllowed: true,
      autoRenewal: false,
      trialVisit: true,
      instructions: "Ring bell",
      addOns: ["Apron"],
      visitsList: [expect.objectContaining({ id: 1, timeSlot: "10-11", partnerName: "Ravi" })],
    });

    await expect(getAdminSubscriptionCalendar("15")).resolves.toEqual([
      expect.objectContaining({ id: 2, visitDate: "2026-07-20", status: "DONE" }),
    ]);

    await expect(getAdminSubscriptionAssignment("15")).resolves.toEqual({
      subscriptionId: 15,
      partnerId: 7,
      partnerName: null,
      status: undefined,
      replacementPartnerId: 8,
      replacementPartnerName: null,
      replacementReason: null,
      assignedAt: null,
      replacedAt: null,
      visitAssignments: [
        {
          id: 1,
          visitId: 2,
          partnerId: 7,
          partnerName: undefined,
          status: "ASSIGNED",
          reason: undefined,
          assignedAt: undefined,
        },
      ],
    });
  });

  it("uses the canonical admin subscription change-request endpoint consistently", async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });
    mocks.patch.mockResolvedValue({ data: { ok: true } });

    await expect(import("@/features/subscriptions/api/subscriptionsApi").then(({ getAdminSubscriptionChangeRequests }) =>
      getAdminSubscriptionChangeRequests("15"),
    )).resolves.toEqual([]);
    await expect(import("@/features/subscriptions/api/subscriptionsApi").then(({ reviewAdminSubscriptionChangeRequest }) =>
      reviewAdminSubscriptionChangeRequest(101, { status: "APPROVED", reason: "Looks good" }),
    )).resolves.toEqual({ ok: true });

    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledWith("/api/subscriptions/change-requests/admin");
    expect(mocks.patch).toHaveBeenCalledTimes(1);
    expect(mocks.patch).toHaveBeenCalledWith("/api/subscriptions/change-requests/101/review", {
      status: "APPROVED",
      reason: "Looks good",
    });
  });

  it("calls subscription mutation endpoints with exact payloads", async () => {
    mocks.patch.mockResolvedValue({ data: { ok: true } });
    mocks.post.mockResolvedValue({ data: { data: { subscriptionId: 15, partnerId: 9 } } });

    await expect(updateAdminSubscriptionStatus("15", "PAUSED")).resolves.toEqual({ ok: true });
    await expect(updateAdminSubscriptionStatus("15", "active" as never)).resolves.toEqual({ ok: true });
    await expect(updateAdminSubscriptionStatus("15", "NOT_A_STATUS" as never)).rejects.toThrow(
      "Invalid subscription status",
    );
    await expect(updateAdminSubscriptionVisitStatus("15", 3, "COMPLETED")).resolves.toEqual({ ok: true });
    await expect(assignAdminSubscriptionPartner("15", { partnerId: 9, reason: "best fit" })).resolves.toMatchObject({
      subscriptionId: 15,
      partnerId: 9,
    });
    await expect(replaceAdminSubscriptionPartner("15", { partnerId: 10, reason: "reassign" })).resolves.toMatchObject({
      subscriptionId: 15,
    });
    await expect(assignAdminSubscriptionVisitPartner("15", 7, { partnerId: 10, reason: "visit" })).resolves.toEqual({
      ok: true,
    });

    expect(mocks.patch).toHaveBeenNthCalledWith(1, "/api/admin/subscriptions/15/status", { status: "PAUSED" });
    expect(mocks.patch).toHaveBeenNthCalledWith(2, "/api/admin/subscriptions/15/status", { status: "ACTIVE" });
    expect(mocks.patch).toHaveBeenNthCalledWith(3, "/api/admin/subscriptions/15/visits/3/status", { status: "COMPLETED" });
    expect(mocks.post).toHaveBeenNthCalledWith(1, "/api/admin/subscriptions/15/assign-partner", { partnerId: 9, reason: "best fit" });
    expect(mocks.post).toHaveBeenNthCalledWith(2, "/api/admin/subscriptions/15/replacement-partner", { partnerId: 10, reason: "reassign" });
    expect(mocks.patch).toHaveBeenNthCalledWith(4, "/api/admin/subscriptions/15/visits/7/assign-partner", {
      partnerId: 10,
      reason: "visit",
    });
  });

  it("loads only the backend-provided eligible subscription partners", async () => {
    mocks.get.mockResolvedValue({ data: { data: [{ partnerId: 5, partnerName: "Approved partner" }] } });

    await expect(getAdminSubscriptionEligiblePartners("22")).resolves.toEqual([
      { partnerId: 5, partnerName: "Approved partner" },
    ]);
    expect(mocks.get).toHaveBeenCalledWith("/api/admin/subscriptions/22/eligible-partners");
  });

  it("maps pricing payloads, sorting, defaults, and delete messages", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: 2, serviceId: 3, durationHours: 4, perVisitPrice: 900, active: "active" },
            { id: 1, serviceId: 2, durationHours: 2, perVisitPrice: "450", active: 0 },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: [
          { id: 2, serviceId: 3, familySize: "xlarge", perVisitPrice: "1200", active: "yes" },
          { id: 1, serviceId: 2, familySize: "unknown", pricePerVisit: 800, active: false },
        ],
      });
    mocks.post.mockResolvedValue({ data: { data: { id: 5, serviceId: 2, familySize: "SMALL", perVisitPrice: 300 } } });
    mocks.put.mockResolvedValue({ data: { id: 7, serviceId: 4, durationHours: 3, perVisitPrice: 700 } });
    mocks.delete.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({ data: { message: "Cook deleted" } });

    await expect(getAdminSubscriptionPricing()).resolves.toEqual([
      { id: 1, serviceId: 2, durationHours: 2, perVisitPrice: 450, active: false },
      { id: 2, serviceId: 3, durationHours: 4, perVisitPrice: 900, active: true },
    ]);

    await expect(getAdminCookSubscriptionPricing()).resolves.toEqual([
      { id: 1, serviceId: 2, familySize: "MEDIUM", familySizeLabel: "3-4 Members", pricePerVisit: 800, active: false },
      { id: 2, serviceId: 3, familySize: "XLARGE", familySizeLabel: "6-8 Members", pricePerVisit: 1200, active: true },
    ]);

    await expect(createAdminSubscriptionPricing({ serviceId: 2 } as never)).resolves.toMatchObject({ id: 5 });
    await expect(updateAdminSubscriptionPricing(7, { serviceId: 4 } as never)).resolves.toEqual({
      id: 7,
      serviceId: 4,
      durationHours: 3,
      perVisitPrice: 700,
      active: true,
    });
    await expect(deleteAdminSubscriptionPricing(7)).resolves.toEqual({
      message: "Subscription duration price deleted successfully",
    });
    await expect(createAdminCookSubscriptionPricing({ serviceId: 2 } as never)).resolves.toMatchObject({
      familySize: "SMALL",
      familySizeLabel: "1-2 Members",
    });
    await expect(updateAdminCookSubscriptionPricing(8, { serviceId: 2 } as never)).resolves.toMatchObject({
      familySize: "MEDIUM",
    });
    await expect(deleteAdminCookSubscriptionPricing(8)).resolves.toEqual({ message: "Cook deleted" });
  });
});

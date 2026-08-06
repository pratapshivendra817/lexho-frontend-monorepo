import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    put: mocks.putMock,
    delete: mocks.deleteMock,
    patch: mocks.patchMock,
  },
}));

import {
  approvePartner,
  blockPartner,
  deletePartner,
  downloadPartnerDocument,
  forcePartnerAvailability,
  getPartnerDashboardStats,
  getPartnerDetails,
  getPartners,
  getPartnerSettlements,
  getPartnerStats,
  partnerServiceTypes,
  rejectPartner,
  reviewPartnerKycDocument,
  runPartnerRiskAction,
  unblockPartner,
  updatePartnerAvailability,
  updatePartnerSkillsGovernance,
  updateSettlementStatus,
} from "@/features/providers/api/providersApi";

describe("providersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps stats and list responses through legacy fallbacks", async () => {
    mocks.getMock
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { pending: "5", approved: "2", rejected: "1", blocked: "0" } })
      .mockRejectedValueOnce({ response: { status: 405 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            content: [
              {
                partnerId: "prv-1",
                fullName: "Rahul",
                phoneNumber: 9999999999,
                serviceCategoryName: "weird",
                city: "Delhi",
                created_on: "2026-05-01",
                verificationStatus: "mystery",
              },
            ],
            total: "1",
            totalPages: "3",
            page: "2",
          },
        },
      });

    const stats = await getPartnerStats();
    const list = await getPartners({
      page: 2,
      size: 10,
      status: "",
      serviceType: "",
      city: "",
      search: "",
      sortBy: "",
      sortDir: "desc",
    });

    expect(stats).toEqual({ pending: 5, approved: 2, rejected: 1, blocked: 0 });
    expect(list).toEqual({
      content: [
        {
          id: "prv-1",
          name: "Rahul",
          phone: "9999999999",
          serviceType: "weird",
          city: "Delhi",
          appliedDate: "2026-05-01",
          status: "PENDING",
        },
      ],
      totalElements: 1,
      totalPages: 3,
      pageNumber: 2,
    });
  });

  it("maps details, actions, settlements and governance endpoints", async () => {
    mocks.getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            id: "prv-11",
            name: "Vikram",
            mobile: "8888888888",
            category: "COOK",
            city: "Indore",
            onboardingStatus: "APPROVED",
            email: "vikram@test.com",
            dateOfBirth: "1995-10-01",
            fullAddress: "street 1",
            experienceYears: "5",
            online: "true",
            serviceAreas: ["A", "B"],
            workingDays: ["Mon"],
            accountNumberMasked: "****1234",
            ifscCode: "IFSC0001",
            documents: [
              {
                documentId: "doc-1",
                fileName: "Pan Card",
                documentType: "PAN",
                mimeType: "image/png",
                url: "http://localhost:8082/api/admin/file/doc-1?x=1",
                createdAt: "2026-05-02",
              },
            ],
            statusHistory: [
              {
                status: "BLOCKED",
                reason: "audit",
                createdAt: "2026-05-03",
                changedBy: "admin",
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: { bankAccountNumber: "1234567890" } } })
      .mockResolvedValueOnce({ data: { todayEarning: "400", completedOrders: "8", newOrders: "2" } })
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                id: "po-1",
                providerId: "prv-11",
                amount: "999",
                status: "settled",
                referenceBookingId: "bk-1",
                remarks: "paid",
                processedAt: "2026-05-04",
                createdAt: "2026-05-01",
              },
            ],
            totalElements: "1",
            totalPages: "2",
            page: "0",
            size: "10",
          },
        },
      });
    mocks.putMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});
    mocks.patchMock.mockResolvedValue({});

    const details = await getPartnerDetails("prv-11");
    const dashboard = await getPartnerDashboardStats("prv-11");
    const settlements = await getPartnerSettlements({ page: 0, size: 10, search: "po", status: "SETTLED" });
    await approvePartner("prv-11");
    await rejectPartner("prv-11", "bad docs");
    await blockPartner("prv-11", "fraud");
    await unblockPartner("prv-11");
    await deletePartner("prv-11");
    await updateSettlementStatus("po-1", "SETTLED", "done");
    await reviewPartnerKycDocument("prv-11", "doc-1", "APPROVED", "clear");
    await forcePartnerAvailability("prv-11", { online: false, lockMinutes: 60, reason: "audit" });
    await runPartnerRiskAction("prv-11", { action: "FLAG_FRAUD", reason: "duplicate" });

    expect(details).toEqual(
      expect.objectContaining({
        id: "prv-11",
        phone: "8888888888",
        serviceType: "COOK",
        status: "APPROVED",
        online: true,
        accountNumber: "1234567890",
        accountNumberMasked: "****1234",
        documents: [
          expect.objectContaining({
            id: "doc-1",
            previewUrl: "/api/admin/file/doc-1?x=1",
          }),
        ],
        statusHistory: [
          expect.objectContaining({
            status: "BLOCKED",
            reason: "audit",
            changedBy: "admin",
          }),
        ],
      }),
    );
    expect(dashboard).toEqual({ todayEarnings: 400, totalCompletedOrders: 8, pendingOrders: 2 });
    expect(settlements).toEqual({
      items: [
        {
          id: "po-1",
          providerId: "prv-11",
          amount: 999,
          status: "SETTLED",
          referenceBookingId: "bk-1",
          remarks: "paid",
          processedAt: "2026-05-04",
          createdAt: "2026-05-01",
        },
      ],
      totalElements: 1,
      totalPages: 2,
      page: 0,
      size: 10,
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/approve");
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/reject", { reason: "bad docs" });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/block", { reason: "fraud" });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/unblock");
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/partners/prv-11");
    expect(mocks.patchMock).toHaveBeenCalledWith("/api/v1/admin/partners/settlements/po-1/status", { status: "SETTLED", remarks: "done" });
    expect(mocks.patchMock).toHaveBeenCalledWith("/api/v1/admin/partners/prv-11/kyc/documents/doc-1/review", { decision: "APPROVED", reason: "clear" });
    expect(mocks.patchMock).toHaveBeenCalledWith("/api/v1/admin/partners/prv-11/availability/force", { online: false, lockMinutes: 60, reason: "audit" });
    expect(mocks.patchMock).toHaveBeenCalledWith("/api/v1/admin/partners/prv-11/risk/action", { action: "FLAG_FRAUD", reason: "duplicate" });
    expect(partnerServiceTypes).toEqual(["", "COOK", "CLEANING"]);
  });

  it("handles availability and skills fallbacks plus direct and blob document downloads", async () => {
    mocks.putMock
      .mockRejectedValueOnce({ response: { status: 405 } })
      .mockRejectedValueOnce({ response: { status: 404 } });
    mocks.patchMock.mockResolvedValueOnce({ data: { ok: true } });

    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild");
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        const anchor = originalCreate("a");
        anchor.click = click;
        anchor.remove = remove;
        return anchor;
      }
      return originalCreate(tag);
    }) as typeof document.createElement);
    const createObjectURL = vi.fn(() => "blob:providers");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });

    await expect(updatePartnerAvailability("prv-20", true)).resolves.toEqual({ ok: true });

    mocks.putMock.mockReset();
    mocks.putMock.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({});
    await updatePartnerSkillsGovernance("21", { categoryIds: [1], subServiceIds: [2] });

    await downloadPartnerDocument("prv-20", "doc-1", "https://example.com/doc.pdf");
    mocks.getMock.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({
      data: "blob-data",
      headers: { "content-type": "application/pdf" },
    });
    await downloadPartnerDocument("prv-20", "doc-2");

    expect(mocks.patchMock).toHaveBeenCalledWith("/api/admin/partners/prv-20/availability", {
      online: true,
      isOnline: true,
      available: true,
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/v1/admin/partners/skills", {
      partnerId: 21,
      categoryIds: [1],
      subServiceIds: [2],
    });
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:providers");
  });

  it("surfaces document download errors from blob, object, string and default payloads", async () => {
    const jsonBlob = new Blob([JSON.stringify({ message: "blob failed" })], { type: "application/json" });
    (jsonBlob as Blob & { text: () => Promise<string> }).text = async () => JSON.stringify({ message: "blob failed" });
    mocks.getMock.mockRejectedValueOnce({ response: { status: 500, data: jsonBlob } });
    await expect(downloadPartnerDocument("prv-1", "doc-a")).rejects.toThrow('{"message":"blob failed"}');

    mocks.getMock.mockRejectedValueOnce({ response: { status: 500, data: { message: "object failed" } } });
    await expect(downloadPartnerDocument("prv-1", "doc-b")).rejects.toThrow("object failed");

    mocks.getMock.mockRejectedValueOnce({ response: { status: 500, data: "string failed" } });
    await expect(downloadPartnerDocument("prv-1", "doc-c")).rejects.toThrow("string failed");

    mocks.getMock.mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }))
      .mockImplementationOnce(() => Promise.reject({ message: "network failed" }));
    await expect(downloadPartnerDocument("prv-1", "doc-d")).rejects.toThrow("network failed");
  });

  it("returns null details and falls back to octet-stream when blob headers are absent", async () => {
    mocks.getMock
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ data: "blob-data", headers: {} });

    const click = vi.fn();
    const remove = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        const anchor = originalCreate("a");
        anchor.click = click;
        anchor.remove = remove;
        return anchor;
      }
      return originalCreate(tag);
    }) as typeof document.createElement);
    const createObjectURL = vi.fn(() => "blob:no-header");
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), writable: true });

    const details = await getPartnerDetails("missing");
    await downloadPartnerDocument("prv-1", "doc-z");

    expect(details).toBeNull();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  it("rethrows non-fallback availability and skills errors", async () => {
    mocks.putMock
      .mockRejectedValueOnce({ response: { status: 500 }, message: "availability hard fail" })
      .mockRejectedValueOnce({ response: { status: 500 }, message: "skills hard fail" });

    await expect(updatePartnerAvailability("prv-hard", false)).rejects.toEqual(
      expect.objectContaining({ message: "availability hard fail" }),
    );
    await expect(
      updatePartnerSkillsGovernance("99", { categoryIds: [9], subServiceIds: [99] }),
    ).rejects.toEqual(expect.objectContaining({ message: "skills hard fail" }));
  });

  it("covers fallback number parsing, raw preview urls, normalized statuses and availability success data", async () => {
    mocks.getMock
      .mockResolvedValueOnce({
        data: {
          partners: [
            {
              id: "prv-r",
              name: "Rejected One",
              mobile: "900",
              category: "CLEANING",
              city: "Pune",
              createdAt: "2026-05-05",
              onboardingStatus: "REJECTED",
            },
            {
              id: "prv-b",
              name: "Blocked One",
              phone: "901",
              serviceType: "COOK",
              city: "Jaipur",
              createdAt: "2026-05-06",
              status: "BLOCKED",
            },
          ],
          totalElements: "oops",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "prv-raw",
          name: "Raw Url",
          phone: "777",
          serviceType: "CLEANING",
          city: "Goa",
          verificationStatus: "BLOCKED",
          online: 1,
          documents: [
            {
              id: "doc-raw",
              name: "Passport",
              documentType: "PASSPORT",
              previewUrl: "/relative/doc.png",
            },
          ],
          statusHistory: [{ verificationStatus: "REJECTED" }],
        },
      })
      .mockResolvedValueOnce(null);
    mocks.putMock.mockResolvedValueOnce({ data: { updated: true } });

    const list = await getPartners({
      page: 0,
      size: 10,
      status: "",
      serviceType: "",
      city: "",
      search: "",
      sortBy: "createdAt",
      sortDir: "desc",
    });
    const details = await getPartnerDetails("prv-raw");
    const availability = await updatePartnerAvailability("prv-ok", false);

    expect(list).toEqual({
      content: [
        {
          id: "prv-r",
          name: "Rejected One",
          phone: "900",
          serviceType: "CLEANING",
          city: "Pune",
          appliedDate: "2026-05-05",
          status: "REJECTED",
        },
        {
          id: "prv-b",
          name: "Blocked One",
          phone: "901",
          serviceType: "COOK",
          city: "Jaipur",
          appliedDate: "2026-05-06",
          status: "BLOCKED",
        },
      ],
      totalElements: 2,
      totalPages: 1,
      pageNumber: 0,
    });
    expect(details).toEqual(
      expect.objectContaining({
        id: "prv-raw",
        online: true,
        status: "BLOCKED",
        documents: [expect.objectContaining({ previewUrl: "/relative/doc.png" })],
        statusHistory: [expect.objectContaining({ status: "REJECTED" })],
      }),
    );
    expect(availability).toEqual({ updated: true });
  });
});

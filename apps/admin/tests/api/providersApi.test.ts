import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    put: mocks.putMock,
    delete: mocks.deleteMock,
  },
}));

import {
  approvePartner,
  blockPartner,
  deletePartner,
  getPartnerDetails,
  getPartners,
  getPartnerStats,
  rejectPartner,
  unblockPartner,
} from "@/features/partners/api/partnersApi";

describe("partnersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps partner stats response", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          pending: 11,
          approved: 22,
          rejected: 3,
          blocked: 4,
        },
      },
    });

    const result = await getPartnerStats();

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/partners/stats");
    expect(result).toEqual({
      pending: 11,
      approved: 22,
      rejected: 3,
      blocked: 4,
    });
  });

  it("maps partners list and forwards filters", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        content: [
          {
            id: "prv-1",
            name: "Rahul",
            phone: "9999999999",
            serviceType: "COOK",
            city: "Delhi",
            appliedDate: "2026-04-26",
            status: "PENDING",
          },
        ],
        totalElements: 7,
        totalPages: 1,
        pageNumber: 0,
      },
    });

    const result = await getPartners({
      page: 0,
      size: 10,
      status: "PENDING",
      serviceType: "COOK",
      city: "Delhi",
      search: "Rahul",
      sortBy: "createdAt",
      sortDir: "desc",
    });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/partners", {
      params: {
        page: 0,
        size: 10,
        status: "PENDING",
        serviceType: "COOK",
        city: "Delhi",
        search: "Rahul",
        sortBy: "createdAt",
        sortDir: "desc",
      },
    });

    expect(result).toEqual({
      content: [
        {
          id: "prv-1",
          name: "Rahul",
          phone: "9999999999",
          serviceType: "COOK",
          city: "Delhi",
          appliedDate: "2026-04-26",
          status: "PENDING",
        },
      ],
      totalElements: 7,
      totalPages: 1,
      pageNumber: 0,
    });
  });

  it("maps partner details and hits admin action endpoints", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          id: "prv-11",
          name: "Vikram",
          phone: "8888888888",
          serviceType: "CLEANING",
          city: "Indore",
          status: "PENDING",
          documents: [
            {
              id: "doc-1",
              documentType: "PAN",
              contentType: "image/jpeg",
              previewUrl: "https://example.com/pan.jpg",
            },
          ],
          statusHistory: [
            {
              status: "PENDING",
              reason: "Submitted",
              changedAt: "2026-04-26",
            },
          ],
        },
      },
    });
    mocks.putMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});

    const details = await getPartnerDetails("prv-11");
    await approvePartner("prv-11");
    await rejectPartner("prv-11", "Invalid documents");
    await blockPartner("prv-11", "Fraud activity");
    await unblockPartner("prv-11");
    await deletePartner("prv-11");

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/partners/prv-11");
    expect(details?.id).toBe("prv-11");
    expect(details?.documents[0].id).toBe("doc-1");
    expect(details?.statusHistory[0].status).toBe("PENDING");

    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/approve");
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/reject", {
      reason: "Invalid documents",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/block", {
      reason: "Fraud activity",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/partners/prv-11/unblock");
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/partners/prv-11");
  });
});



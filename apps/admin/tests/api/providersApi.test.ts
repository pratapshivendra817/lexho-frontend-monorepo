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
  approveProvider,
  blockProvider,
  deleteProvider,
  getProviderDetails,
  getProviders,
  getProviderStats,
  rejectProvider,
  unblockProvider,
} from "@/features/providers/api/providersApi";

describe("providersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps provider stats response", async () => {
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

    const result = await getProviderStats();

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/providers/stats");
    expect(result).toEqual({
      pending: 11,
      approved: 22,
      rejected: 3,
      blocked: 4,
    });
  });

  it("maps providers list and forwards filters", async () => {
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

    const result = await getProviders({
      page: 0,
      size: 10,
      status: "PENDING",
      serviceType: "COOK",
      city: "Delhi",
      search: "Rahul",
      sortBy: "createdAt",
      sortDir: "desc",
    });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/providers", {
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

  it("maps provider details and hits admin action endpoints", async () => {
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

    const details = await getProviderDetails("prv-11");
    await approveProvider("prv-11");
    await rejectProvider("prv-11", "Invalid documents");
    await blockProvider("prv-11", "Fraud activity");
    await unblockProvider("prv-11");
    await deleteProvider("prv-11");

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/providers/prv-11");
    expect(details?.id).toBe("prv-11");
    expect(details?.documents[0].id).toBe("doc-1");
    expect(details?.statusHistory[0].status).toBe("PENDING");

    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/providers/prv-11/approve");
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/providers/prv-11/reject", {
      reason: "Invalid documents",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/providers/prv-11/block", {
      reason: "Fraud activity",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/providers/prv-11/unblock");
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/providers/prv-11");
  });
});

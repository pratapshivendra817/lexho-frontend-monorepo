import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
    patch: mocks.patchMock,
    delete: mocks.deleteMock,
  },
}));

import {
  createCategory,
  createService,
  deleteCategory,
  getServiceSummary,
  getServices,
  uploadAdminImage,
  updateCategory,
} from "@/services/lexhoAdminApi";

describe("lexhoAdminApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps dashboard service summary payload", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          totalServices: 20,
          activeServices: 15,
          inactiveServices: 5,
          totalBookings: 245,
          totalRevenue: 500000,
        },
      },
    });

    const result = await getServiceSummary();

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/dashboard/service-summary");
    expect(result).toEqual({
      totalServices: 20,
      activeServices: 15,
      inactiveServices: 5,
      totalBookings: 245,
      totalRevenue: 500000,
    });
  });

  it("maps services list and forwards query params", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: [
          {
            id: "svc-1",
            name: "AC Repair",
            description: "AC repair service",
            price: "799",
            service_type: "HOME_CLEANING",
            active: true,
            details: [],
          },
        ],
        total: 1,
      },
    });

    const result = await getServices({
      page: 1,
      limit: 10,
      search: "ac",
      category: "cat-9",
      status: "active",
      sort: "topBookings",
    });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/services", {
      params: {
        page: 1,
        limit: 10,
        search: "ac",
        category: "cat-9",
        status: "active",
        sort: "topBookings",
      },
    });

    expect(result).toEqual({
      items: [
        {
          id: "svc-1",
          name: "AC Repair",
          serviceType: "HOME_CLEANING",
          description: "AC repair service",
          price: 799,
          active: true,
          details: [],
        },
      ],
      total: 1,
    });
  });

  it("hits category/service mutation endpoints", async () => {
    mocks.postMock.mockResolvedValue({});
    mocks.putMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});

    await createCategory({ name: "Salon", iconUrl: "https://example.com/icon.png", active: true });
    await updateCategory("cat-1", {
      name: "Home Cleaning",
      iconUrl: "https://example.com/clean.png",
      active: false,
    });
    await deleteCategory("cat-1");
    await createService({
      name: "Plumbing",
      description: "Pipe repair",
      price: 500,
      service_type: "HOME_CLEANING",
    });

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/categories", {
      name: "Salon",
      iconUrl: "https://example.com/icon.png",
      active: true,
      status: "ACTIVE",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/categories/cat-1", {
      name: "Home Cleaning",
      iconUrl: "https://example.com/clean.png",
      active: false,
      status: "INACTIVE",
    });
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/categories/cat-1");
    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/services", {
      name: "Plumbing",
      description: "Pipe repair",
      price: 500,
      service_type: "HOME_CLEANING",
    });
  });

  it("uploads image via multipart form and maps returned URL", async () => {
    mocks.postMock.mockResolvedValue({
      data: {
        data: {
          url: "/uploads/services/ac.jpg",
        },
      },
    });

    const file = new File(["image"], "ac.jpg", { type: "image/jpeg" });
    const imageUrl = await uploadAdminImage(file);

    expect(mocks.postMock).toHaveBeenCalledWith(
      "/api/admin/upload/image",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(imageUrl).toContain("/uploads/services/ac.jpg");
  });
});

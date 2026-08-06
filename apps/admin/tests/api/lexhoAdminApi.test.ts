import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
  appConfig: {
    apiBaseUrl: "http://api.lexho.test",
    adminImageUploadEndpoint: "/api/admin/upload/image",
  },
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

vi.mock("@/config", () => ({
  appConfig: mocks.appConfig,
}));

import {
  addServiceDetails,
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  deleteServiceDetail,
  getCategories,
  getServiceAnalytics,
  getServiceById,
  getServiceSummary,
  getServices,
  getTopServices,
  toggleServiceStatus,
  updateCategory,
  updateCategoryStatus,
  updateService,
  updateServiceDetail,
  uploadAdminImage,
} from "@/services/lexhoAdminApi";

function createApiError(status?: number, serverMessage?: string, message?: string) {
  return {
    response: status
      ? {
          status,
          data: serverMessage ? { message: serverMessage } : {},
        }
      : undefined,
    message,
  };
}

function createServiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "svc-1",
    name: "AC Repair",
    description: "AC repair service",
    price: "799",
    service_type: "HOME_CLEANING",
    categoryId: "cat-1",
    categoryName: "Cleaning",
    rating: "4.5",
    imageUrl: "/uploads/ac.jpg",
    active: true,
    details: [],
    ...overrides,
  };
}

function expectErrorMessage(error: unknown, message: string) {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(message);
}

describe("lexhoAdminApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appConfig.apiBaseUrl = "http://api.lexho.test";
    mocks.appConfig.adminImageUploadEndpoint = "/api/admin/upload/image";
  });

  it("maps dashboard summary, top services, and analytics payloads with defaults", async () => {
    mocks.getMock
      .mockResolvedValueOnce({
        data: {
          summary: {
            totalServices: "20",
            activeServices: 15,
            inactiveServices: "5",
            totalBookings: 245,
            totalRevenue: "500000",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            { id: "top-1", name: "Deep Cleaning", bookings: "12", revenue: "1500" },
            {},
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          analytics: [
            { month: "Jan", bookings: "8", revenue: "900" },
            {},
          ],
        },
      });

    await expect(getServiceSummary()).resolves.toEqual({
      totalServices: 20,
      activeServices: 15,
      inactiveServices: 5,
      totalBookings: 245,
      totalRevenue: 500000,
    });
    await expect(getTopServices(5)).resolves.toEqual([
      { serviceId: "top-1", serviceName: "Deep Cleaning", bookings: 12, revenue: 1500 },
      { serviceId: "svc-2", serviceName: "Unknown Service", bookings: 0, revenue: 0 },
    ]);
    await expect(getServiceAnalytics()).resolves.toEqual([
      { label: "Jan", bookings: 8, revenue: 900 },
      { label: "Point 2", bookings: 0, revenue: 0 },
    ]);

    expect(mocks.getMock).toHaveBeenNthCalledWith(1, "/api/admin/dashboard/service-summary");
    expect(mocks.getMock).toHaveBeenNthCalledWith(2, "/api/admin/dashboard/top-services", { params: { limit: 5 } });
    expect(mocks.getMock).toHaveBeenNthCalledWith(3, "/api/admin/dashboard/service-analytics");
  });

  it("supports direct-array payloads and relative api origins", async () => {
    mocks.appConfig.apiBaseUrl = "/api";
    mocks.getMock
      .mockResolvedValueOnce({
        data: {
          totalServices: "3",
          activeServices: "2",
          inactiveServices: "1",
          totalBookings: "9",
          totalRevenue: "1200",
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "cat-9",
            name: "Painting",
            iconUrl: "icons/paint.png",
            active: "enabled",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ serviceId: "svc-4", serviceName: "Pest Control", bookings: "4", revenue: "200" }],
      });

    await expect(getServiceSummary()).resolves.toEqual({
      totalServices: 3,
      activeServices: 2,
      inactiveServices: 1,
      totalBookings: 9,
      totalRevenue: 1200,
    });
    await expect(getCategories({ page: 1, limit: 5 })).resolves.toEqual({
      items: [
        {
          id: "cat-9",
          name: "Painting",
          iconUrl: `${window.location.origin}/icons/paint.png`,
          active: true,
          displayOrder: undefined,
        },
      ],
      total: 1,
    });
    await expect(getTopServices()).resolves.toEqual([
      { serviceId: "svc-4", serviceName: "Pest Control", bookings: 4, revenue: 200 },
    ]);
  });

  it("maps categories with origin-aware icon URLs and status fallbacks", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        items: [
          {
            categoryId: "cat-7",
            name: "Salon",
            imageUrl: "http://localhost:8082/uploads/salon.png",
            status: "ACTIVE",
            order: "4",
          },
          {
            id: "cat-8",
            name: "Spa",
            iconUrl: "icons/spa.png",
            isActive: 0,
          },
        ],
        totalElements: "12",
      },
    });

    const result = await getCategories({ page: 2, limit: 25, search: "sa" });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/categories", {
      params: { page: 2, limit: 25, search: "sa" },
    });
    expect(result).toEqual({
      items: [
        {
          id: "cat-7",
          name: "Salon",
          iconUrl: "http://api.lexho.test:8082/uploads/salon.png",
          active: true,
          displayOrder: 4,
        },
        {
          id: "cat-8",
          name: "Spa",
          iconUrl: "http://api.lexho.test/icons/spa.png",
          active: false,
          displayOrder: undefined,
        },
      ],
      total: 12,
    });
  });

  it("creates, updates, toggles, and deletes categories with normalized payloads", async () => {
    mocks.postMock.mockResolvedValue({});
    mocks.putMock.mockResolvedValue({});
    mocks.patchMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});

    await createCategory({
      name: "Salon",
      iconUrl: "https://assets.lexho.test/icons/salon.png",
      displayOrder: Number.NaN,
      active: true,
    });
    await updateCategory("cat-1", {
      name: "Home Cleaning",
      iconUrl: " /icons/clean.png ",
      displayOrder: 3,
      active: false,
    });
    await updateCategoryStatus("cat-1", false);
    await deleteCategory("cat-1");

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/categories", {
      name: "Salon",
      iconUrl: "/icons/salon.png",
      displayOrder: undefined,
      priority: undefined,
      active: true,
      status: "ACTIVE",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/categories/cat-1", {
      name: "Home Cleaning",
      iconUrl: "/icons/clean.png",
      displayOrder: 3,
      priority: 3,
      active: false,
      status: "INACTIVE",
    });
    expect(mocks.patchMock).toHaveBeenCalledWith("/api/admin/categories/cat-1/status", {
      active: false,
      isActive: false,
      status: "INACTIVE",
    });
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/categories/cat-1");
  });

  it("maps services with detail fallbacks and request params", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        results: [
          createServiceRow({
            id: "svc-1",
            active: undefined,
            imageUrl: "http://localhost:8082/uploads/ac.jpg",
            status: "inactive",
            included: [" Checklist item "],
            excluded: ["Spare parts"],
            faqs: ["Q1. What is included? Q2. Is gas covered?"],
            instructions: ['"Keep area clear."'],
            details: [],
          }),
          createServiceRow({
            id: "svc-2",
            name: "Painter",
            categoryId: undefined,
            categoryName: undefined,
            category: { id: "cat-2", name: "Painting" },
            price: undefined,
            basePrice: "1200",
            imageUrl: undefined,
            thumbnailUrl: "thumb.png",
            active: "yes",
            details: [{ detailId: "dt-1", type: "faq", itemName: "How long?" }],
          }),
        ],
        total: 2,
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
          categoryId: "cat-1",
          categoryName: "Cleaning",
          description: "AC repair service",
          price: 799,
          rating: 4.5,
          imageUrl: "http://api.lexho.test:8082/uploads/ac.jpg",
          active: false,
          details: [
            { id: "INCLUDED- Checklist item ", type: "INCLUDED", itemName: " Checklist item " },
            { id: "EXCLUDED-Spare parts", type: "EXCLUDED", itemName: "Spare parts" },
            {
              id: "FAQ-Q1. What is included? Q2. Is gas covered?",
              type: "FAQ",
              itemName: "Q1. What is included? Q2. Is gas covered?",
            },
            { id: 'INSTRUCTION-"Keep area clear."', type: "INSTRUCTION", itemName: '"Keep area clear."' },
          ],
        },
        {
          id: "svc-2",
          name: "Painter",
          serviceType: "HOME_CLEANING",
          categoryId: "cat-2",
          categoryName: "Painting",
          description: "AC repair service",
          price: 1200,
          rating: 4.5,
          imageUrl: "http://api.lexho.test/thumb.png",
          active: true,
          details: [{ id: "dt-1", type: "FAQ", itemName: "How long?" }],
        },
      ],
      total: 2,
    });
  });

  it("wraps service list failures with normalized errors", async () => {
    mocks.getMock.mockRejectedValue(createApiError(500, "Backend exploded"));

    await expect(getServices({ page: 1, limit: 10 })).rejects.toThrow("Backend exploded");

    mocks.getMock.mockRejectedValueOnce(createApiError(undefined, undefined, "timeout exceeded"));
    await expect(getServices({ page: 1, limit: 10 })).rejects.toThrow("timeout exceeded");
  });

  it("maps service by id and returns null when payload is empty", async () => {
    mocks.getMock
      .mockResolvedValueOnce({
        data: {
          service: createServiceRow({
            _id: "svc-9",
            id: undefined,
            name: undefined,
            serviceName: "Deep Cleaning",
            service_type: undefined,
            serviceType: "HOME_SERVICE",
            categoryId: undefined,
            categoryName: undefined,
            category: { id: "cat-3", name: "Cleaning Plus" },
            imageUrl: undefined,
            iconUrl: "http://localhost:8082/media/deep.png",
            isActive: 1,
            details: [{ itemId: "faq-1", type: "invalid", value: "Bring bucket" }],
          }),
        },
      })
      .mockResolvedValueOnce({ data: null });

    await expect(getServiceById("svc-9")).resolves.toEqual({
      id: "svc-9",
      name: "Deep Cleaning",
      serviceType: "HOME_SERVICE",
      categoryId: "cat-3",
      categoryName: "Cleaning Plus",
      description: "AC repair service",
      price: 799,
      rating: 4.5,
      imageUrl: "http://api.lexho.test:8082/media/deep.png",
      active: true,
      details: [{ id: "faq-1", type: "INCLUDED", itemName: "Bring bucket" }],
    });
    await expect(getServiceById("missing")).resolves.toBeNull();
  });

  it("normalizes service-by-id errors with fallback messages", async () => {
    mocks.getMock.mockRejectedValue(createApiError(404, undefined, undefined));

    try {
      await getServiceById("svc-404");
    } catch (error) {
      expectErrorMessage(error, "Failed to load service details");
    }
  });

  it("uses fallback error messages when service mutations fail without response details", async () => {
    mocks.postMock.mockRejectedValueOnce({});
    mocks.putMock.mockRejectedValueOnce({});
    mocks.patchMock.mockRejectedValueOnce({});
    mocks.deleteMock.mockRejectedValueOnce({});

    await expect(
      createService({ name: "A", description: "", price: 1, service_type: "HOME_CLEANING" }),
    ).rejects.toThrow("Unable to create service");
    await expect(
      updateService("svc-1", { name: "A", description: "", price: 1, service_type: "HOME_CLEANING" }),
    ).rejects.toThrow("Unable to update service");
    await expect(toggleServiceStatus("svc-1")).rejects.toThrow("Unable to update service status");
    await expect(deleteService("svc-1")).rejects.toThrow("Unable to delete service");
  });

  it("creates and updates services with normalized image URLs and id extraction", async () => {
    mocks.postMock
      .mockResolvedValueOnce({ data: { result: { serviceId: "svc-99" } } })
      .mockResolvedValueOnce({ data: {} });
    mocks.putMock.mockResolvedValue({});

    await expect(
      createService({
        name: "Plumbing",
        description: "Pipe repair",
        price: 500,
        service_type: "HOME_CLEANING",
        imageUrl: "https://cdn.lexho.test/uploads/plumbing.png",
      }),
    ).resolves.toEqual({ id: "svc-99" });

    await expect(
      createService({
        name: "Painting",
        description: "Wall care",
        price: 250,
        service_type: "HOME_CLEANING",
      }),
    ).resolves.toBeNull();

    await updateService("svc-99", {
      name: "Plumbing",
      description: "Pipe repair",
      price: 500,
      service_type: "HOME_CLEANING",
      imageUrl: " /uploads/plumbing.png ",
    });

    expect(mocks.postMock).toHaveBeenNthCalledWith(1, "/api/admin/services", {
      name: "Plumbing",
      description: "Pipe repair",
      price: 500,
      service_type: "HOME_CLEANING",
      imageUrl: "/uploads/plumbing.png",
    });
    expect(mocks.postMock).toHaveBeenNthCalledWith(2, "/api/admin/services", {
      name: "Painting",
      description: "Wall care",
      price: 250,
      service_type: "HOME_CLEANING",
      imageUrl: undefined,
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/services/svc-99", {
      name: "Plumbing",
      description: "Pipe repair",
      price: 500,
      service_type: "HOME_CLEANING",
      imageUrl: "/uploads/plumbing.png",
    });
  });

  it.each([
    ["createService", () => createService({ name: "A", description: "", price: 1, service_type: "HOME_CLEANING" }), "Unable to create service", "create failed"],
    ["updateService", () => updateService("svc-1", { name: "A", description: "", price: 1, service_type: "HOME_CLEANING" }), "Unable to update service", "update failed"],
    ["toggleServiceStatus", () => toggleServiceStatus("svc-1"), "Unable to update service status", "status failed"],
    ["deleteService", () => deleteService("svc-1"), "Unable to delete service", "delete failed"],
    ["updateServiceDetail", () => updateServiceDetail("svc-1", "detail-1", { type: "FAQ", itemName: "Hello" }), "Unable to update service detail", "detail update failed"],
    ["deleteServiceDetail", () => deleteServiceDetail("svc-1", "detail-1"), "Unable to delete service detail", "detail delete failed"],
  ])("normalizes %s failures", async (_label, call, fallback, serverMessage) => {
    const error = createApiError(500, serverMessage);

    if (fallback.includes("create")) {
      mocks.postMock.mockRejectedValueOnce(error);
    } else if (fallback.includes("update service status")) {
      mocks.patchMock.mockRejectedValueOnce(error);
    } else if (fallback.includes("delete")) {
      mocks.deleteMock.mockRejectedValueOnce(error);
    } else {
      mocks.putMock.mockRejectedValueOnce(error);
    }

    await expect(call()).rejects.toThrow(serverMessage);
  });

  it.each([
    [400, "bad request"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not found"],
    [409, "conflict"],
    [422, "unprocessable"],
    [500, "server error"],
  ])("normalizes API status %s from service detail mutation errors", async (status, message) => {
    mocks.putMock.mockRejectedValueOnce(createApiError(status, message));
    await expect(updateServiceDetail("svc-1", "detail-1", { type: "FAQ", itemName: "Hello" })).rejects.toThrow(message);
  });

  it("calls mutation endpoints for service status and detail updates", async () => {
    mocks.patchMock.mockResolvedValue({});
    mocks.putMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});

    await toggleServiceStatus("svc-1");
    await updateServiceDetail("svc-1", "detail-1", { type: "FAQ", itemName: "Bring tools" });
    await deleteServiceDetail("svc-1", "detail-1");

    expect(mocks.patchMock).toHaveBeenCalledWith("/api/admin/services/svc-1/toggle-status");
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details/detail-1", {
      type: "FAQ",
      itemName: "Bring tools",
    });
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details/detail-1");
  });

  it("adds service details with normalized item cleanup and chunking", async () => {
    mocks.postMock.mockResolvedValue({});
    const longWord = "x".repeat(260);

    await addServiceDetails("svc-1", {
      type: "INSTRUCTION",
      items: ['"Line one\\nLine two"', "Q1. Keep pets away Q2. Empty the room", longWord],
    });

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details", {
      type: "INSTRUCTION",
      items: [
        "Line one Line two",
        "Q1. Keep pets away Q2. Empty the room",
        "x".repeat(255),
        "xxxxx",
      ],
    });
  });

  it("splits long FAQ detail text by sentences before chunk fallback", async () => {
    mocks.postMock.mockResolvedValue({});
    const longSentence = `${"a".repeat(130)}. ${"b".repeat(130)}.`;

    await addServiceDetails("svc-1", {
      type: "FAQ",
      items: [longSentence],
    });

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details", {
      type: "FAQ",
      items: [`${"a".repeat(130)}.`, `${"b".repeat(130)}.`],
    });
  });

  it("splits long numbered detail text before sentence and chunk fallbacks", async () => {
    mocks.postMock.mockResolvedValue({});
    const numberedText = `Q1. ${"a".repeat(130)} Q2. ${"b".repeat(130)}`;

    await addServiceDetails("svc-1", {
      type: "FAQ",
      items: [numberedText],
    });

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details", {
      type: "FAQ",
      items: [`Q1. ${"a".repeat(130)}`, `Q2. ${"b".repeat(130)}`],
    });
  });

  it("chunks long included detail text across normal word boundaries", async () => {
    mocks.postMock.mockResolvedValue({});
    const firstChunk = `${"word ".repeat(50).trim()} tail`;
    const overflowChunk = "tail ".repeat(14).trim();
    const combined = `${firstChunk} ${overflowChunk}`;

    await addServiceDetails("svc-1", {
      type: "INCLUDED",
      items: [combined],
    });

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details", {
      type: "INCLUDED",
      items: [firstChunk, overflowChunk],
    });
  });

  it("chunks around oversized included detail words and preserves trailing text", async () => {
    mocks.postMock.mockResolvedValue({});
    const hugeWord = "z".repeat(260);

    await addServiceDetails("svc-1", {
      type: "INCLUDED",
      items: [`alpha ${hugeWord} omega`],
    });

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/services/svc-1/details", {
      type: "INCLUDED",
      items: ["alpha", "z".repeat(255), "zzzzz omega"],
    });
  });

  it("rejects empty service detail payloads", async () => {
    await expect(addServiceDetails("svc-1", { type: "FAQ", items: ["   ", ""] })).rejects.toThrow(
      "At least one detail item is required",
    );
  });

  it("retries detail saves item-by-item after server errors and succeeds when each retry passes", async () => {
    mocks.postMock
      .mockRejectedValueOnce(createApiError(500, "too long"))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await expect(
      addServiceDetails("svc-1", {
        type: "FAQ",
        items: ["Question one?", "Question two?"],
      }),
    ).resolves.toBeUndefined();

    expect(mocks.postMock).toHaveBeenNthCalledWith(2, "/api/admin/services/svc-1/details", {
      type: "FAQ",
      items: ["Question one?"],
    });
    expect(mocks.postMock).toHaveBeenNthCalledWith(3, "/api/admin/services/svc-1/details", {
      type: "FAQ",
      items: ["Question two?"],
    });
  });

  it("surfaces partial retry failures when some detail items still fail", async () => {
    mocks.postMock
      .mockRejectedValueOnce(createApiError(500, "too long"))
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("still broken"));

    await expect(
      addServiceDetails("svc-1", {
        type: "FAQ",
        items: ["Question one?", "Question two?"],
      }),
    ).rejects.toThrow("Some items failed to save (1/2). Please try shorter/plain-text phrasing.");
  });

  it("normalizes detail save errors when retry conditions are not met", async () => {
    mocks.postMock.mockRejectedValue(createApiError(400, undefined, "Bad request"));

    await expect(addServiceDetails("svc-1", { type: "FAQ", items: ["Only one item"] })).rejects.toThrow("Bad request");
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not found"],
    [409, "conflict"],
    [422, "unprocessable"],
  ])("passes through addServiceDetails API errors for status %s", async (status, message) => {
    mocks.postMock.mockRejectedValue(createApiError(status, message));

    await expect(addServiceDetails("svc-1", { type: "FAQ", items: ["Only one item"] })).rejects.toThrow(message);
  });

  it("maps object-style excluded detail rows and empty service arrays", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: [
          createServiceRow({
            id: "svc-3",
            details: [],
            included: [],
            excluded: [{ itemName: "  " }, { name: "Shoes rack" }],
            faqs: [],
            instructions: [],
          }),
        ],
      },
    });

    await expect(getServices({ page: 1, limit: 1 })).resolves.toEqual({
      items: [
        {
          id: "svc-3",
          name: "AC Repair",
          serviceType: "HOME_CLEANING",
          categoryId: "cat-1",
          categoryName: "Cleaning",
          description: "AC repair service",
          price: 799,
          rating: 4.5,
          imageUrl: "http://api.lexho.test/uploads/ac.jpg",
          active: true,
          details: [{ id: "EXCLUDED-Shoes rack", type: "EXCLUDED", itemName: "Shoes rack" }],
        },
      ],
      total: 1,
    });
  });

  it("maps object-style included detail rows when detail arrays are absent", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: [
          createServiceRow({
            id: "svc-4",
            details: [],
            included: [{ value: "Bring ladder" }],
            excluded: [],
            faqs: [],
            instructions: [],
          }),
        ],
      },
    });

    await expect(getServices({ page: 1, limit: 1 })).resolves.toEqual({
      items: [
        {
          id: "svc-4",
          name: "AC Repair",
          serviceType: "HOME_CLEANING",
          categoryId: "cat-1",
          categoryName: "Cleaning",
          description: "AC repair service",
          price: 799,
          rating: 4.5,
          imageUrl: "http://api.lexho.test/uploads/ac.jpg",
          active: true,
          details: [{ id: "INCLUDED-Bring ladder", type: "INCLUDED", itemName: "Bring ladder" }],
        },
      ],
      total: 1,
    });
  });

  it("uploads admin images with validated files and parsed response URLs", async () => {
    mocks.postMock
      .mockResolvedValueOnce({
        data: {
          data: {
            url: "/uploads/services/ac.jpg",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          result: {
            url: "   ",
            imageUrl: "http://localhost:8082/uploads/services/ac2.jpg",
          },
        },
      });

    const file = new File(["image"], "ac.jpg", { type: "image/jpeg" });
    const firstUrl = await uploadAdminImage(file);
    const secondUrl = await uploadAdminImage(file);

    const firstPayload = mocks.postMock.mock.calls[0]?.[1] as FormData;
    expect(mocks.postMock).toHaveBeenNthCalledWith(1, "/api/admin/upload/image", expect.any(FormData));
    expect(firstPayload.get("file")).toBeInstanceOf(File);
    expect((firstPayload.get("file") as File).name).toBe(file.name);
    expect(firstUrl).toBe("http://api.lexho.test/uploads/services/ac.jpg");
    expect(secondUrl).toBe("http://api.lexho.test:8082/uploads/services/ac2.jpg");
  });

  it.each([
    ["invalid file object", {} as File, "Selected upload is not a valid file"],
    ["missing filename", new File([""], ""), "Selected file name is missing"],
  ])("rejects upload for %s", async (_label, value, message) => {
    await expect(uploadAdminImage(value)).rejects.toThrow(message);
  });

  it("throws when the upload response is missing a usable URL", async () => {
    mocks.postMock.mockResolvedValue({ data: { data: {} } });

    await expect(uploadAdminImage(new File(["img"], "photo.png"))).rejects.toThrow(
      "Image upload succeeded but response URL is missing",
    );
  });

  it("falls back to nested upload path values when earlier candidates are blank", async () => {
    mocks.postMock.mockResolvedValue({
      data: {
        imageUrl: "   ",
        url: "",
        fileUrl: " ",
        location: null,
        path: undefined,
        result: {
          imageUrl: " ",
          url: "",
          fileUrl: "   ",
          location: "/uploads/from-location.jpg",
        },
      },
    });

    await expect(uploadAdminImage(new File(["img"], "photo.png"))).resolves.toBe(
      "http://api.lexho.test/uploads/from-location.jpg",
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api/axios";
import {
  createPopularService,
  deletePopularService,
  getCategoryOptions,
  getDeletedPopularServicesByCategory,
  getPopularServicesByCategory,
  getServicesByCategory,
  restorePopularService,
} from "@/features/popular-services/api/popularServicesApi";

vi.mock("@/api/axios", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("popularServicesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps category options from nested API payloads", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: { items: [{ categoryId: 7, categoryName: "Cleaning" }] } },
    });

    await expect(getCategoryOptions()).resolves.toEqual([{ id: "7", name: "Cleaning" }]);
    expect(api.get).toHaveBeenCalledWith("/api/admin/categories", { params: { page: 1, limit: 200 } });
  });

  it("returns empty category options when the payload has no row arrays", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { message: "no rows here" } });

    await expect(getCategoryOptions()).resolves.toEqual([]);
  });

  it("loads services by category and filters mismatched fallback rows", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [{ id: 1, name: "Mismatch", categoryId: 9, price: "99", rating: "4.5" }] } })
      .mockResolvedValueOnce({ data: { content: [{ serviceId: 2, serviceName: "Deep Clean", category: { id: 5, name: "Cleaning" }, basePrice: 100 }] } });

    await expect(getServicesByCategory("5")).resolves.toEqual([
      {
        id: "2",
        name: "Deep Clean",
        imageUrl: "",
        price: 100,
        rating: 0,
        categoryId: "5",
        categoryName: "Cleaning",
      },
    ]);
  });

  it("returns empty services when backend never returns matching category rows", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 1, name: "Other", categoryId: 1 }] } });
    await expect(getServicesByCategory("99")).resolves.toEqual([]);
  });

  it("loads active and deleted popular services through endpoint fallback", async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { results: [{ popularServiceId: "p1", service: { id: 2, name: "Cook" }, category: { id: 8 }, priority: "3" }] } })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [{ id: "p2", serviceId: 3, serviceName: "Mop", categoryId: 8, priority: 4, deletedAt: "2026-01-01" }] });

    await expect(getPopularServicesByCategory("8")).resolves.toEqual([
      { id: "p1", serviceId: "2", serviceName: "Cook", categoryId: "8", priority: 3, deletedAt: "" },
    ]);
    await expect(getDeletedPopularServicesByCategory("8")).resolves.toEqual([
      { id: "p2", serviceId: "3", serviceName: "Mop", categoryId: "8", priority: 4, deletedAt: "2026-01-01" },
    ]);
  });

  it("throws get fallback errors for non-404 failures and when every endpoint 404s", async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 500, data: { message: "popular exploded" } } });
    await expect(getPopularServicesByCategory("8")).rejects.toEqual({
      response: { status: 500, data: { message: "popular exploded" } },
    });

    vi.clearAllMocks();
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 404 } });

    await expect(getDeletedPopularServicesByCategory("8")).rejects.toEqual({ response: { status: 404 } });
  });

  it("creates popular services, retries duplicate priorities, restores deleted duplicates, and throws for true duplicates", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: "p1" } });
    await expect(createPopularService({ serviceId: 1, categoryId: 2, priority: 1 })).resolves.toEqual({ id: "p1" });

    vi.clearAllMocks();
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 400, data: { message: "priority already exists" } } })
      .mockResolvedValueOnce({ data: { id: "p2" } });
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [{ id: "existing-1", serviceId: "8", serviceName: "Other", categoryId: "2", priority: 1 }] })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [] });

    await expect(createPopularService({ serviceId: 9, categoryId: 2, priority: 1 })).resolves.toEqual({ id: "p2" });
    expect(api.post).toHaveBeenLastCalledWith("/api/admin/popular-services", { serviceId: 9, categoryId: 2, priority: 2 });

    vi.clearAllMocks();
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: "duplicate" } } });
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [{ id: "existing-1", serviceId: "9", serviceName: "Dup", categoryId: "2", priority: 1 }] });

    await expect(createPopularService({ serviceId: 9, categoryId: 2, priority: 1 })).rejects.toThrow("already marked as popular");

    vi.clearAllMocks();
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: "invalid data" } } });
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [{ id: "deleted-1", serviceId: "9", serviceName: "Old", categoryId: "2", priority: 3, deletedAt: "2026-01-01" }] });
    vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });

    await expect(createPopularService({ serviceId: 9, categoryId: 2, priority: 3 })).resolves.toEqual({
      restored: true,
      id: "deleted-1",
      priority: 3,
    });
    expect(api.patch).toHaveBeenCalledWith("/api/admin/popular-services/deleted-1/restore", { priority: 3 });
  });

  it("treats priority-only backend messages as duplicate-like and exhausts create fallbacks correctly", async () => {
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: "priority clash" } } })
      .mockResolvedValueOnce({ data: { id: "p3" } });
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [{ id: "existing-1", serviceId: "8", serviceName: "Other", categoryId: "2", priority: 1 }] })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [] });

    await expect(createPopularService({ serviceId: 99, categoryId: 2, priority: 1 })).resolves.toEqual({ id: "p3" });
    expect(api.post).toHaveBeenLastCalledWith("/api/admin/popular-services", { serviceId: 99, categoryId: 2, priority: 2 });

    vi.clearAllMocks();
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 404 } });

    await expect(createPopularService({ serviceId: 50, categoryId: 2, priority: 1 })).rejects.toEqual({ response: { status: 404 } });
  });

  it("rethrows duplicate-like create failures when the category id is invalid and skips occupied priorities", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 400, data: { message: "priority clash" } } });
    await expect(createPopularService({ serviceId: 1, categoryId: 0, priority: 1 })).rejects.toEqual({
      response: { status: 400, data: { message: "priority clash" } },
    });

    vi.clearAllMocks();
    vi.mocked(api.post)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: "priority clash" } } })
      .mockResolvedValueOnce({ data: { id: "p4" } });
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: [
          { id: "existing-1", serviceId: "8", serviceName: "Other", categoryId: "2", priority: 2 },
          { id: "existing-2", serviceId: "9", serviceName: "Else", categoryId: "2", priority: 3 },
        ],
      })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [] });

    await expect(createPopularService({ serviceId: 77, categoryId: 2, priority: 1 })).resolves.toEqual({ id: "p4" });
    expect(api.post).toHaveBeenLastCalledWith("/api/admin/popular-services", { serviceId: 77, categoryId: 2, priority: 4 });
  });

  it("deletes and restores popular services with payload fallbacks", async () => {
    vi.mocked(api.delete)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: {} });
    vi.mocked(api.patch)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: {} });

    await expect(deletePopularService("p1", "cleanup")).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenLastCalledWith("/api/v1/admin/popular-services/p1", { data: { deleteReason: "cleanup" } });

    await expect(restorePopularService("p2")).resolves.toBeUndefined();
    expect(api.patch).toHaveBeenLastCalledWith("/api/v1/admin/popular-services/p2/restore", {});
  });

  it("throws delete and restore fallback errors when endpoints fail", async () => {
    vi.mocked(api.delete).mockRejectedValueOnce({ response: { status: 500, data: { message: "delete broke" } } });
    await expect(deletePopularService("p9")).rejects.toEqual({
      response: { status: 500, data: { message: "delete broke" } },
    });

    vi.clearAllMocks();
    vi.mocked(api.delete)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 404 } });
    await expect(deletePopularService("p9")).rejects.toEqual({ response: { status: 404 } });

    vi.clearAllMocks();
    vi.mocked(api.patch).mockRejectedValueOnce({ response: { status: 500, data: { message: "restore broke" } } });
    await expect(restorePopularService("p8", 3)).rejects.toEqual({
      response: { status: 500, data: { message: "restore broke" } },
    });

    vi.clearAllMocks();
    vi.mocked(api.patch)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 404 } });
    await expect(restorePopularService("p8", 0)).rejects.toEqual({ response: { status: 404 } });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}));

import {
  createRecommendedAddon,
  deleteRecommendedAddon,
  getAddonCategories,
  getAddonServices,
  getRecommendedAddons,
  updateRecommendedAddon,
  updateRecommendedAddonStatus,
} from "@/features/recommended-addons/api/recommendedAddonsApi";

describe("recommendedAddonsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps categories and services from nested payloads", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [
              { id: 1, name: "Cleaning" },
              { categoryId: "2", categoryName: "Cook" },
              { id: "", name: "" },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: [
            { id: "11", name: "Deep Clean", category: { id: "1", name: "Cleaning" } },
            { serviceId: 12, serviceName: "Roti Cook", service: { category: { categoryId: "2", categoryName: "Cook" } } },
            { serviceId: 13, serviceName: "Express Iron", serviceType: "Laundry Express" },
            { id: "", name: "" },
          ],
        },
      });

    await expect(getAddonCategories()).resolves.toEqual([
      { id: "1", name: "Cleaning" },
      { id: "2", name: "Cook" },
    ]);
    await expect(getAddonServices()).resolves.toEqual([
      { id: "11", name: "Deep Clean", categoryId: "1", categoryName: "Cleaning" },
      { id: "12", name: "Roti Cook", categoryId: "2", categoryName: "Cook" },
      { id: "13", name: "Express Iron", categoryId: undefined, categoryName: "Laundry Express" },
    ]);
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/admin/categories", { params: { page: 1, limit: 300 } });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/api/admin/services", { params: { page: 0, size: 500 } });
  });

  it("maps recommended addons and falls back across addon base urls", async () => {
    mocks.get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          recommendedAddons: [
            {
              addonId: "7",
              addonName: "Extra Roti",
              shortDescription: "Warm rotis",
              amount: "25",
              status: "active",
              allowQuantity: "yes",
              minQty: "2",
              maxQty: "5",
              addonType: "required",
              categoryIds: ["3"],
              serviceIds: ["5"],
              serviceCount: "1",
              createdDate: "2026-07-11",
            },
            {
              id: "8",
              name: "Sauce",
              price: 10,
              activeStatus: false,
              quantityEnabled: false,
              categories: [{ id: "4", name: "Cook" }],
              services: [{ id: "6", name: "Chef", categoryId: "4", categoryName: "Cook" }],
              servicesCount: 9,
              createdAt: "2026-07-12",
            },
            { id: "", name: "" },
          ],
        },
      });

    const addons = await getRecommendedAddons({
      search: "roti",
      status: "ACTIVE",
      categoryId: "3",
      serviceId: "5",
    });

    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/admin/addons", {
      params: { search: "roti", status: "ACTIVE", categoryId: "3", serviceId: "5", page: 0, size: 200 },
    });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/api/v1/admin/addons", {
      params: { search: "roti", status: "ACTIVE", categoryId: "3", serviceId: "5", page: 0, size: 200 },
    });
    expect(addons).toEqual([
      {
        id: "7",
        name: "Extra Roti",
        description: "Warm rotis",
        price: 25,
        active: true,
        quantityAllowed: true,
        minQuantity: 2,
        maxQuantity: 5,
        required: true,
        categories: [{ id: "3", name: "Category #3" }],
        services: [{ id: "5", name: "Service #5" }],
        servicesCount: 1,
        createdAt: "2026-07-11",
      },
      {
        id: "8",
        name: "Sauce",
        description: "",
        price: 10,
        active: false,
        quantityAllowed: false,
        minQuantity: 1,
        maxQuantity: 1,
        required: false,
        categories: [{ id: "4", name: "Cook" }],
        services: [{ id: "6", name: "Chef", categoryId: "4", categoryName: "Cook" }],
        servicesCount: 9,
        createdAt: "2026-07-12",
      },
    ]);
  });

  it("creates, updates, toggles status and soft-deletes on fallback statuses", async () => {
    const payload = {
      name: "Extra Roti",
      description: "Warm rotis",
      price: 25,
      active: true,
      categoryIds: [3],
      serviceIds: [5],
      quantityAllowed: true,
      minQuantity: 2,
      maxQuantity: 5,
      required: false,
    };

    mocks.post.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: { ok: true } });
    mocks.put.mockResolvedValueOnce({ data: { updated: true } });
    mocks.patch.mockResolvedValueOnce({ data: { active: false } }).mockResolvedValueOnce({ data: { active: false } });
    mocks.delete.mockRejectedValueOnce({ response: { status: 409 } });

    await expect(createRecommendedAddon(payload)).resolves.toEqual({ ok: true });
    await expect(updateRecommendedAddon("7", payload)).resolves.toEqual({ updated: true });
    await expect(updateRecommendedAddonStatus("7", false)).resolves.toEqual({ active: false });
    await expect(deleteRecommendedAddon("7")).resolves.toEqual({
      deleted: false,
      deactivated: true,
      data: { active: false },
    });
  });

  it("rethrows non-fallback errors and handles empty list payloads", async () => {
    mocks.get.mockResolvedValueOnce({ data: { data: { content: "bad" } } });
    mocks.post.mockRejectedValueOnce({ response: { status: 500 } });
    mocks.delete.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(getRecommendedAddons({ status: "ALL" })).resolves.toEqual([]);
    await expect(createRecommendedAddon({} as any)).rejects.toEqual({ response: { status: 500 } });
    await expect(deleteRecommendedAddon("9")).rejects.toEqual({ response: { status: 401 } });
  });

  it("covers default mapping branches, successful delete, and exhausted fallback retries", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          results: [
            {
              id: "10",
              name: "Steam Press",
              price: "11",
              status: "inactive",
              allowQuantity: "no",
              minQty: 0,
              maxQty: 0,
              addonType: "optional",
              assignedCategories: [{ category: { categoryId: "7", categoryName: "Laundry" } }],
              assignedServices: [{ serviceId: "17", title: "Steam Service", parentService: { name: "Pressing" } }],
              serviceCount: null,
              createdDate: "",
            },
            {
              id: "11",
              name: "Default Active",
              price: 3,
            },
          ],
        },
      },
    });
    mocks.delete.mockResolvedValueOnce({ data: { removed: true } });
    mocks.patch
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 404 } });

    await expect(getRecommendedAddons({ status: "ALL", search: "", categoryId: "", serviceId: "" })).resolves.toEqual([
      {
        id: "10",
        name: "Steam Press",
        description: "",
        price: 11,
        active: false,
        quantityAllowed: false,
        minQuantity: 1,
        maxQuantity: 1,
        required: false,
        categories: [{ id: "7", name: "Laundry" }],
        services: [{ id: "17", name: "Steam Service", categoryId: undefined, categoryName: "Pressing" }],
        servicesCount: 1,
        createdAt: "",
      },
      {
        id: "11",
        name: "Default Active",
        description: "",
        price: 3,
        active: true,
        quantityAllowed: false,
        minQuantity: 1,
        maxQuantity: 1,
        required: false,
        categories: [],
        services: [],
        servicesCount: 0,
        createdAt: "",
      },
    ]);
    await expect(deleteRecommendedAddon("10")).resolves.toEqual({
      deleted: true,
      deactivated: false,
      data: { removed: true },
    });
    await expect(updateRecommendedAddonStatus("10", true)).rejects.toEqual({ response: { status: 404 } });
  });
});

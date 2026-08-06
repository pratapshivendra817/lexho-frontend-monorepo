import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  getCategories: vi.fn(),
  getServices: vi.fn(),
  appConfig: {
    apiBaseUrl: "https://admin.lexho.test/api",
  },
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    patch: mocks.patch,
    delete: mocks.del,
  },
}));

vi.mock("@/config", () => ({
  appConfig: mocks.appConfig,
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getCategories: mocks.getCategories,
  getServices: mocks.getServices,
}));

import {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBannerById,
  getAdminBanners,
  getBannerCategories,
  getBannerServices,
  reorderAdminBanners,
  updateAdminBanner,
  uploadBannerImage,
} from "@/modules/banner/api/bannerApi";

describe("bannerApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appConfig.apiBaseUrl = "https://admin.lexho.test/api";
  });

  it("loads active category and service options only", async () => {
    mocks.getCategories.mockResolvedValueOnce({
      items: [
        { id: 1, name: " Cleaning ", active: true },
        { id: 2, name: "Ignored", active: false },
        { id: "", name: "Missing id", active: true },
      ],
    });
    mocks.getServices.mockResolvedValueOnce({
      items: [
        { id: 9, name: " Cook ", active: 1 },
        { id: 10, name: "", active: true },
      ],
    });

    await expect(getBannerCategories()).resolves.toEqual([{ id: "1", name: "Cleaning" }]);
    await expect(getBannerServices()).resolves.toEqual([{ id: "9", name: "Cook" }]);
    expect(mocks.getCategories).toHaveBeenCalledWith({ page: 1, limit: 500 });
    expect(mocks.getServices).toHaveBeenCalledWith({ page: 1, limit: 500 });
  });

  it("maps banner list rows, query params, totals, and localhost image rewrites", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {
              bannerId: 7,
              title: " Hero ",
              category: { id: 12, name: "Home Care" },
              imageUrl: "http://localhost:8080/uploads/banner.jpg",
              redirectType: "service",
              redirectId: "45",
              active: "enabled",
              priority: "6",
            },
            {
              id: "second",
              title: "Second",
              categoryId: "",
              categoryName: "",
              thumbnailUrl: "banners/second.jpg",
              redirectValue: "",
              isActive: 0,
              status: "inactive",
              priority: "bad",
            },
          ],
          total: 25,
        },
      },
    });

    await expect(
      getAdminBanners({ page: 1, limit: 20, search: "hero", categoryId: "12", active: false }),
    ).resolves.toEqual({
      items: [
        {
          id: "7",
          title: "Hero",
          categoryId: "12",
          categoryName: "Home Care",
          imageUrl: "https://admin.lexho.test:8080/uploads/banner.jpg",
          redirectType: "SERVICE",
          redirectValue: "45",
          status: "ACTIVE",
          priority: 6,
          active: true,
        },
        {
          id: "second",
          title: "Second",
          categoryId: null,
          categoryName: "",
          imageUrl: "https://admin.lexho.test/banners/second.jpg",
          redirectType: "CATEGORY",
          redirectValue: "",
          status: "INACTIVE",
          priority: 0,
          active: false,
        },
      ],
      total: 25,
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/admin/banners", {
      params: { page: 0, size: 20, search: "hero", categoryId: "12", active: false },
    });
  });

  it("supports relative api bases, invalid bases, and falls back to row count when total is missing", async () => {
    mocks.appConfig.apiBaseUrl = "/api";
    mocks.get.mockResolvedValueOnce({
      data: {
        rows: [
          {
            id: 1,
            title: "Relative",
            bannerImageUrl: "/uploads/relative.jpg",
            redirectValue: "2",
            status: "ACTIVE",
          },
        ],
      },
    });

    const relativeResult = await getAdminBanners({ page: 0, limit: 10 });
    expect(relativeResult).toEqual({
      items: [
        {
          id: "1",
          title: "Relative",
          categoryId: null,
          categoryName: "",
          imageUrl: `${window.location.origin}/uploads/relative.jpg`,
          redirectType: "CATEGORY",
          redirectValue: "2",
          status: "ACTIVE",
          priority: 0,
          active: true,
        },
      ],
      total: 1,
    });

    mocks.appConfig.apiBaseUrl = "not a valid url";
    mocks.get.mockResolvedValueOnce({
      data: {
        item: {
          bannerId: "fallback-1",
          title: "Fallback",
          imageUrl: "uploads/fallback.jpg",
          redirectUrl: "https://example.com/out",
          redirectType: "external",
          active: "no",
        },
      },
    });

    await expect(getAdminBannerById("fallback-1")).resolves.toEqual({
      id: "fallback-1",
      title: "Fallback",
      categoryId: null,
      categoryName: "",
      imageUrl: "/uploads/fallback.jpg",
      redirectType: "EXTERNAL",
      redirectValue: "https://example.com/out",
      status: "INACTIVE",
      priority: 0,
      active: false,
    });
  });

  it("returns null when the banner detail payload has no usable id", async () => {
    mocks.get.mockResolvedValueOnce({ data: { data: { title: "No id here" } } });

    await expect(getAdminBannerById("")).resolves.toBeNull();
    expect(mocks.get).toHaveBeenCalledWith("/api/admin/banners/");
  });

  it("falls back cleanly for empty banner collections and malformed absolute image urls", async () => {
    mocks.get.mockResolvedValueOnce({ data: { message: "no collections here" } });
    await expect(getAdminBanners({ page: 1, limit: 5 })).resolves.toEqual({ items: [], total: 0 });

    mocks.get.mockResolvedValueOnce({
      data: {
        result: {
          id: "odd-1",
          title: "Odd Banner",
          imageUrl: "http://%zz",
          redirectType: "external",
          redirectUrl: "https://example.com",
          active: "maybe",
        },
      },
    });

    await expect(getAdminBannerById("odd-1")).resolves.toEqual({
      id: "odd-1",
      title: "Odd Banner",
      categoryId: null,
      categoryName: "",
      imageUrl: "http://%zz",
      redirectType: "EXTERNAL",
      redirectValue: "https://example.com",
      status: "ACTIVE",
      priority: 0,
      active: true,
    });
  });

  it("creates and updates banner payloads with category and external redirect variants", async () => {
    mocks.post.mockResolvedValueOnce({ data: { ok: true } });
    mocks.put.mockResolvedValueOnce({ data: { saved: true } });

    await createAdminBanner({
      title: "  Banner One  ",
      categoryId: "12",
      imageUrl: "https://cdn.lexho.test/assets/hero.png",
      redirectType: "CATEGORY",
      redirectValue: "45",
      priority: 3,
      active: true,
    });
    await updateAdminBanner("15", {
      title: "External Banner",
      categoryId: "bad-id",
      imageUrl: "/uploads/hero-two.png",
      redirectType: "EXTERNAL",
      redirectValue: "  https://example.com/landing  ",
      priority: 8,
      active: false,
    });

    expect(mocks.post).toHaveBeenCalledWith("/api/admin/banners", {
      title: "Banner One",
      categoryId: 12,
      imageUrl: "/assets/hero.png",
      redirectType: "CATEGORY",
      redirectId: 45,
      redirectUrl: null,
      priority: 3,
      active: true,
    });
    expect(mocks.put).toHaveBeenCalledWith("/api/admin/banners/15", {
      title: "External Banner",
      categoryId: null,
      imageUrl: "/uploads/hero-two.png",
      redirectType: "EXTERNAL",
      redirectId: null,
      redirectUrl: "https://example.com/landing",
      priority: 8,
      active: false,
    });
  });

  it("deletes and reorders banners while filtering invalid reorder ids", async () => {
    mocks.del.mockResolvedValueOnce({});
    mocks.patch.mockResolvedValueOnce({ data: { done: true } });

    await expect(deleteAdminBanner("77")).resolves.toBeUndefined();
    await expect(reorderAdminBanners(["9", "bad", "12", "Infinity"])).resolves.toEqual({ done: true });

    expect(mocks.del).toHaveBeenCalledWith("/api/admin/banners/77");
    expect(mocks.patch).toHaveBeenCalledWith("/api/admin/banners/reorder", {
      bannerIds: [9, 12],
    });
  });

  it("uploads banner images from nested payloads and throws when the response URL is missing", async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        result: {
          fileUrl: "http://127.0.0.1:9000/uploads/banner-upload.jpg",
        },
      },
    });
    const file = new File(["image-bytes"], "banner-upload.jpg", { type: "image/jpeg" });

    await expect(uploadBannerImage(file)).resolves.toBe("https://admin.lexho.test:9000/uploads/banner-upload.jpg");
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/admin/banners/upload/image",
      expect.any(FormData),
    );

    const sentFormData = mocks.post.mock.calls[0]?.[1] as FormData;
    const uploadedFile = sentFormData.get("file");
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("banner-upload.jpg");

    mocks.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(uploadBannerImage(file)).rejects.toThrow("Image upload succeeded but response URL is missing");
  });
});

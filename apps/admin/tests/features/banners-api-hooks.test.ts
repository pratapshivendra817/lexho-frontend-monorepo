import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClientMock } from "./featureTestUtils";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
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

vi.mock("@/utils/authSession", () => ({
  getAccessToken: mocks.getAccessToken,
  clearAccessToken: mocks.clearAccessToken,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

import {
  createBanner,
  deleteBanner,
  getBannerById,
  getBanners,
  getBannerStats,
  reorderBanners,
  updateBanner,
  uploadBannerImage,
} from "@/features/banners/api/bannersApi";
import {
  useBannerDetailsQuery,
  useBannerMutations,
  useBannersQuery,
  useBannerStatsQuery,
} from "@/features/banners/hooks/useBanners";

describe("banners api and hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccessToken.mockReturnValue("token-1");
    mocks.useQuery.mockImplementation((options) => options);
    mocks.useMutation.mockImplementation((options) => options);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/admin",
        replace: vi.fn(),
        origin: "http://localhost:5173",
      },
    });
  });

  it("maps banners lists, filters search, paginates locally, and computes stats", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        banners: [
          {
            bannerId: 1,
            title: "Monsoon Offer",
            subtitle: "Big savings",
            bannerImageUrl: "https://cdn.example.com/1.jpg",
            redirectType: "external",
            redirectId: 42,
            priority: "3",
            active: "true",
            bannerType: "promo",
            audience: "customer",
            createdAt: "2026-07-16T08:00:00Z",
          },
          {
            bannerId: 2,
            title: "Partner Drive",
            subtitle: "",
            bannerImageUrl: "",
            redirectType: "",
            redirectId: "",
            priority: 2,
            active: false,
            bannerType: "info",
            audience: "partner",
          },
        ],
      },
    });

    await expect(getBanners({ page: 0, size: 1, audience: "CUSTOMER", search: "monsoon" })).resolves.toEqual({
      content: [
        {
          id: "1",
          title: "Monsoon Offer",
          subtitle: "Big savings",
          imageUrl: "https://cdn.example.com/1.jpg",
          redirectType: "EXTERNAL",
          redirectId: "42",
          priority: 3,
          active: true,
          bannerType: "PROMO",
          audience: "CUSTOMER",
          createdAt: "2026-07-16T08:00:00Z",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 0,
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/admin/home/banners", {
      params: { audience: "CUSTOMER" },
      headers: { Authorization: "Bearer token-1" },
    });

    mocks.get.mockResolvedValueOnce({
      data: [
        { id: "1", title: "A", audience: "CUSTOMER", active: true, bannerType: "PROMO", priority: 1 },
        { id: "2", title: "B", audience: "PARTNER", active: false, bannerType: "INFO", priority: 2 },
        { id: "3", title: "C", audience: "BOTH", active: true, bannerType: "SEASONAL", priority: 3 },
      ],
    });

    await expect(getBannerStats()).resolves.toEqual({
      total: 3,
      active: 2,
      inactive: 1,
      customer: 1,
      partner: 1,
      both: 1,
    });
  });

  it("handles banner details and CRUD requests with auth headers", async () => {
    const payload = {
      title: "  Flash Sale  ",
      subtitle: "  Tonight only ",
      imageUrl: " https://cdn.example.com/banner.jpg ",
      redirectType: "NONE" as const,
      redirectId: null,
      priority: 4,
      active: true,
      bannerType: "PROMO" as const,
      audience: "BOTH" as const,
    };

    mocks.get
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 9,
            title: "Offer",
            subtitle: "Hello",
            imageUrl: "https://cdn.example.com/offer.jpg",
            redirectType: "none",
            redirectId: null,
            priority: "6",
            active: "false",
            bannerType: "info",
            audience: "partner",
          },
        },
      });
    mocks.post.mockResolvedValueOnce({ data: { data: { url: "https://cdn.example.com/uploaded.jpg" } } });
    mocks.post.mockResolvedValueOnce({ data: { ok: true } });
    mocks.put.mockResolvedValueOnce({ data: { ok: true } });
    mocks.patch.mockResolvedValueOnce({ data: { ok: true } });
    mocks.delete.mockResolvedValueOnce({});

    await expect(getBannerById("missing")).resolves.toBeNull();
    await expect(getBannerById("9")).resolves.toEqual({
      id: "9",
      title: "Offer",
      subtitle: "Hello",
      imageUrl: "https://cdn.example.com/offer.jpg",
      redirectType: "NONE",
      redirectId: null,
      priority: 6,
      active: false,
      bannerType: "INFO",
      audience: "PARTNER",
      createdAt: undefined,
    });

    const file = new File(["hello"], "banner.png", { type: "image/png" });
    await expect(uploadBannerImage(file)).resolves.toBe("https://cdn.example.com/uploaded.jpg");

    await createBanner(payload);
    await updateBanner("9", payload);
    await reorderBanners({ items: [{ id: "9", priority: 1 }] });
    await deleteBanner("9");

    expect(mocks.post).toHaveBeenNthCalledWith(
      2,
      "/api/admin/home/banners",
      {
        title: "Flash Sale",
        subtitle: "Tonight only",
        imageUrl: "https://cdn.example.com/banner.jpg",
        redirectType: "NONE",
        redirectId: null,
        priority: 4,
        active: true,
        bannerType: "PROMO",
        audience: "BOTH",
      },
      { headers: { Authorization: "Bearer token-1" } },
    );
    expect(mocks.put).toHaveBeenCalledWith(
      "/api/admin/home/banners/9",
      expect.objectContaining({ title: "Flash Sale" }),
      { headers: { Authorization: "Bearer token-1" } },
    );
    expect(mocks.patch).toHaveBeenCalledWith(
      "/api/admin/home/banners/reorder",
      { items: [{ id: "9", priority: 1 }] },
      { headers: { Authorization: "Bearer token-1" } },
    );
    expect(mocks.delete).toHaveBeenCalledWith("/api/admin/home/banners/9", {
      headers: { Authorization: "Bearer token-1" },
    });
  });

  it("redirects to login when the auth token is missing", async () => {
    mocks.getAccessToken.mockReturnValue(undefined);

    await expect(getBanners({ page: 0, size: 10 })).rejects.toThrow("Authorization token is required");

    expect(mocks.clearAccessToken).toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledWith("/login");
  });

  it("configures banner queries and invalidates banner caches after mutations", async () => {
    const queryClient = createQueryClientMock();
    mocks.useQueryClient.mockReturnValue(queryClient);

    const listQuery = useBannersQuery({ page: 2, size: 5, search: "offer" });
    expect(listQuery.queryKey).toEqual(["admin-banners", { page: 2, size: 5, search: "offer" }]);
    expect(listQuery.placeholderData?.("prev")).toBe("prev");

    const detailsQuery = useBannerDetailsQuery(undefined);
    expect(detailsQuery.enabled).toBe(false);

    const statsQuery = useBannerStatsQuery();
    expect(statsQuery.queryKey).toEqual(["admin-banner-stats"]);

    const mutations = useBannerMutations();
    await mutations.createBannerMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.updateBannerMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.deleteBannerMutation.onSuccess?.(undefined, undefined as never, undefined);
    await mutations.reorderBannersMutation.onSuccess?.(undefined, undefined as never, undefined);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-banners"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-banner-stats"] });
  });
});

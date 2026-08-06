import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  getAdminBanners: vi.fn(),
  getAdminBannerById: vi.fn(),
  getBannerCategories: vi.fn(),
  getBannerServices: vi.fn(),
  createAdminBanner: vi.fn(),
  updateAdminBanner: vi.fn(),
  deleteAdminBanner: vi.fn(),
  reorderAdminBanners: vi.fn(),
  uploadBannerImage: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/modules/banner/api/bannerApi", () => ({
  getAdminBanners: mocks.getAdminBanners,
  getAdminBannerById: mocks.getAdminBannerById,
  getBannerCategories: mocks.getBannerCategories,
  getBannerServices: mocks.getBannerServices,
  createAdminBanner: mocks.createAdminBanner,
  updateAdminBanner: mocks.updateAdminBanner,
  deleteAdminBanner: mocks.deleteAdminBanner,
  reorderAdminBanners: mocks.reorderAdminBanners,
  uploadBannerImage: mocks.uploadBannerImage,
}));

import {
  useBannerById,
  useBannerCategories,
  useBanners,
  useBannerServices,
  useCreateBanner,
  useDeleteBanner,
  useReorderBanners,
  useUpdateBanner,
  useUploadBannerImage,
} from "@/modules/banner/hooks/useBanners";

describe("banner hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((options) => options);
    mocks.useMutation.mockImplementation((options) => options);
  });

  it("configures list, detail, category, and service queries", async () => {
    const listParams = { page: 2, limit: 25, search: "hero", categoryId: "3", active: true };

    const listResult = useBanners(listParams);
    expect(listResult.queryKey).toEqual(["new-banner-module-list", listParams]);
    expect(listResult.retry).toBe(false);
    await listResult.queryFn();
    expect(mocks.getAdminBanners).toHaveBeenCalledWith(listParams);

    const detailResult = useBannerById("88");
    expect(detailResult.queryKey).toEqual(["new-banner-module-item", "88"]);
    expect(detailResult.enabled).toBe(true);
    await detailResult.queryFn();
    expect(mocks.getAdminBannerById).toHaveBeenCalledWith("88");

    const missingDetail = useBannerById(undefined);
    expect(missingDetail.enabled).toBe(false);
    await missingDetail.queryFn();
    expect(mocks.getAdminBannerById).toHaveBeenCalledWith("");

    const categoriesResult = useBannerCategories();
    expect(categoriesResult.queryKey).toEqual(["new-banner-module-categories"]);
    expect(categoriesResult.queryFn).toBe(mocks.getBannerCategories);

    const servicesResult = useBannerServices();
    expect(servicesResult.queryKey).toEqual(["new-banner-module-services"]);
    expect(servicesResult.queryFn).toBe(mocks.getBannerServices);
  });

  it("invalidates the banner list after create and reorder mutations", async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };
    mocks.useQueryClient.mockReturnValue(queryClient);
    mocks.createAdminBanner.mockResolvedValueOnce({ id: "1" });
    mocks.reorderAdminBanners.mockResolvedValueOnce({ ok: true });

    const createMutation = useCreateBanner();
    const createPayload = {
      title: "Banner",
      categoryId: "1",
      imageUrl: "/banner.jpg",
      redirectType: "CATEGORY" as const,
      redirectValue: "1",
      priority: 0,
      active: true,
    };
    await expect(createMutation.mutationFn(createPayload)).resolves.toEqual({ id: "1" });
    expect(mocks.createAdminBanner).toHaveBeenCalledWith(createPayload);
    await createMutation.onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["new-banner-module-list"] });

    queryClient.invalidateQueries.mockClear();

    const reorderMutation = useReorderBanners();
    await expect(reorderMutation.mutationFn(["9", "3"])).resolves.toEqual({ ok: true });
    expect(mocks.reorderAdminBanners).toHaveBeenCalledWith(["9", "3"]);
    await reorderMutation.onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["new-banner-module-list"] });
  });

  it("updates both list and item caches after the update mutation succeeds", async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };
    mocks.useQueryClient.mockReturnValue(queryClient);
    mocks.updateAdminBanner.mockResolvedValueOnce({ saved: true });

    const mutation = useUpdateBanner();
    const variables = {
      id: "44",
      payload: {
        title: "Updated",
        categoryId: "2",
        imageUrl: "/updated.jpg",
        redirectType: "CATEGORY" as const,
        redirectValue: "2",
        priority: 2,
        active: false,
      },
    };

    await expect(mutation.mutationFn(variables)).resolves.toEqual({ saved: true });
    expect(mocks.updateAdminBanner).toHaveBeenCalledWith("44", variables.payload);

    await mutation.onSuccess(undefined, variables);
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["new-banner-module-list"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["new-banner-module-item", "44"],
    });
  });

  it("optimistically removes deleted banners, restores snapshots on error, and invalidates on settle", async () => {
    const queryClient = {
      cancelQueries: vi.fn().mockResolvedValue(undefined),
      getQueriesData: vi.fn().mockReturnValue([
        [
          ["new-banner-module-list", { page: 1 }],
          { items: [{ id: "1" }, { id: "2" }], total: 2, extra: "keep" },
        ],
        [["new-banner-module-list", { page: 2 }], { note: "missing items" }],
      ]),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };
    mocks.useQueryClient.mockReturnValue(queryClient);
    mocks.deleteAdminBanner.mockResolvedValueOnce(undefined);

    const mutation = useDeleteBanner();

    await expect(mutation.mutationFn("2")).resolves.toBeUndefined();
    expect(mocks.deleteAdminBanner).toHaveBeenCalledWith("2");

    const context = await mutation.onMutate("2");
    expect(queryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: ["new-banner-module-list"] });
    expect(queryClient.getQueriesData).toHaveBeenCalledWith({ queryKey: ["new-banner-module-list"] });
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ["new-banner-module-list", { page: 1 }],
      { items: [{ id: "1" }], total: 1, extra: "keep" },
    );
    expect(context).toEqual({
      snapshots: [
        [
          ["new-banner-module-list", { page: 1 }],
          { items: [{ id: "1" }, { id: "2" }], total: 2, extra: "keep" },
        ],
        [["new-banner-module-list", { page: 2 }], { note: "missing items" }],
      ],
    });

    mutation.onError(new Error("delete failed"), "2", context);
    expect(queryClient.setQueryData).toHaveBeenNthCalledWith(
      2,
      ["new-banner-module-list", { page: 1 }],
      { items: [{ id: "1" }, { id: "2" }], total: 2, extra: "keep" },
    );
    expect(queryClient.setQueryData).toHaveBeenNthCalledWith(
      3,
      ["new-banner-module-list", { page: 2 }],
      { note: "missing items" },
    );

    queryClient.invalidateQueries.mockClear();
    await mutation.onSettled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["new-banner-module-list"] });
  });

  it("ignores delete rollback when no mutation context is available", () => {
    const queryClient = {
      cancelQueries: vi.fn(),
      getQueriesData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    mocks.useQueryClient.mockReturnValue(queryClient);

    const mutation = useDeleteBanner();
    expect(() => mutation.onError(new Error("missing context"), "2", undefined)).not.toThrow();
    expect(queryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("uploads banner images through the upload mutation", async () => {
    const file = new File(["content"], "hero.jpg", { type: "image/jpeg" });
    mocks.uploadBannerImage.mockResolvedValueOnce("https://cdn.lexho.test/hero.jpg");

    const mutation = useUploadBannerImage();
    await expect(mutation.mutationFn(file)).resolves.toBe("https://cdn.lexho.test/hero.jpg");
    expect(mocks.uploadBannerImage).toHaveBeenCalledWith(file);
  });
});

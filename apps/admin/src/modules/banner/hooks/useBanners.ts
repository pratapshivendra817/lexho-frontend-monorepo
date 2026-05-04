import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
} from "../api/bannerApi";
import type { BannerFormValues, BannerListParams } from "../types/banner.types";

export function useBanners(params: BannerListParams) {
  return useQuery({
    queryKey: ["new-banner-module-list", params],
    queryFn: () => getAdminBanners(params),
    retry: false,
  });
}

export function useBannerById(id: string | undefined) {
  return useQuery({
    queryKey: ["new-banner-module-item", id],
    queryFn: () => getAdminBannerById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useBannerCategories() {
  return useQuery({
    queryKey: ["new-banner-module-categories"],
    queryFn: getBannerCategories,
    retry: false,
  });
}

export function useBannerServices() {
  return useQuery({
    queryKey: ["new-banner-module-services"],
    queryFn: getBannerServices,
    retry: false,
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BannerFormValues) => createAdminBanner(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["new-banner-module-list"] });
    },
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BannerFormValues }) =>
      updateAdminBanner(id, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["new-banner-module-list"] }),
        queryClient.invalidateQueries({ queryKey: ["new-banner-module-item", variables.id] }),
      ]);
    },
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminBanner(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["new-banner-module-list"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["new-banner-module-list"] });

      snapshots.forEach(([queryKey, value]) => {
        const oldValue = value as { items?: Array<{ id: string }>; total?: number } | undefined;
        if (!oldValue?.items) return;
        const nextItems = oldValue.items.filter((item) => item.id !== id);
        queryClient.setQueryData(queryKey, {
          ...oldValue,
          items: nextItems,
          total: Math.max((oldValue.total ?? nextItems.length) - 1, 0),
        });
      });

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots?.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["new-banner-module-list"] });
    },
  });
}

export function useUploadBannerImage() {
  return useMutation({
    mutationFn: (file: File) => uploadBannerImage(file),
  });
}

export function useReorderBanners() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idsInPriorityOrder: string[]) => reorderAdminBanners(idsInPriorityOrder),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["new-banner-module-list"] });
    },
  });
}

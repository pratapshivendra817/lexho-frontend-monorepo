import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBanner,
  deleteBanner,
  getBannerById,
  getBanners,
  getBannerStats,
  reorderBanners,
  updateBanner,
} from "../api/bannersApi";
import type { BannerFormPayload, BannerReorderPayload, BannersQueryParams } from "../types";

export function useBannerStatsQuery() {
  return useQuery({
    queryKey: ["admin-banner-stats"],
    queryFn: getBannerStats,
    retry: false,
  });
}

export function useBannersQuery(params: BannersQueryParams) {
  return useQuery({
    queryKey: ["admin-banners", params],
    queryFn: () => getBanners(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useBannerDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-banner-details", id],
    queryFn: () => getBannerById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useBannerMutations() {
  const queryClient = useQueryClient();

  const invalidateBanners = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-banner-stats"] });
  };

  return {
    createBannerMutation: useMutation({
      mutationFn: (payload: BannerFormPayload) => createBanner(payload),
      onSuccess: invalidateBanners,
    }),
    updateBannerMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: BannerFormPayload }) => updateBanner(id, payload),
      onSuccess: invalidateBanners,
    }),
    deleteBannerMutation: useMutation({
      mutationFn: (id: string) => deleteBanner(id),
      onSuccess: invalidateBanners,
    }),
    reorderBannersMutation: useMutation({
      mutationFn: (payload: BannerReorderPayload) => reorderBanners(payload),
      onSuccess: invalidateBanners,
    }),
  };
}

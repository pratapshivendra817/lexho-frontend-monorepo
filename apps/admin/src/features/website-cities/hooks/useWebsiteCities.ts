import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCityArea,
  createWebsiteCity,
  deleteCityArea,
  deleteWebsiteCity,
  getCityAreas,
  getWebsiteCities,
  reorderCityAreas,
  updateCityArea,
  updateCityAreaStatus,
  updateWebsiteCity,
  updateWebsiteCityStatus,
} from "../api/websiteCitiesApi";
import type { WebsiteLocationPayload } from "../types";

export function useWebsiteCitiesQuery() {
  return useQuery({
    queryKey: ["website-header-cities"],
    queryFn: getWebsiteCities,
    retry: false,
  });
}

export function useCityAreasQuery(cityId: number | null) {
  return useQuery({
    queryKey: ["website-city-areas", cityId],
    queryFn: () => getCityAreas(cityId as number),
    enabled: cityId != null,
    retry: false,
  });
}

export function useWebsiteCitiesMutations() {
  const queryClient = useQueryClient();
  const invalidateCities = async () => {
    await queryClient.invalidateQueries({ queryKey: ["website-header-cities"] });
  };
  const invalidateAreas = async (cityId?: number | null) => {
    await queryClient.invalidateQueries({ queryKey: ["website-city-areas"] });
    if (cityId != null) {
      await queryClient.invalidateQueries({ queryKey: ["website-city-areas", cityId] });
    }
  };

  return {
    createCityMutation: useMutation({
      mutationFn: (payload: WebsiteLocationPayload) => createWebsiteCity(payload),
      onSuccess: invalidateCities,
    }),
    updateCityMutation: useMutation({
      mutationFn: ({ cityId, payload }: { cityId: number; payload: WebsiteLocationPayload }) =>
        updateWebsiteCity(cityId, payload),
      onSuccess: invalidateCities,
    }),
    updateCityStatusMutation: useMutation({
      mutationFn: ({ cityId, active }: { cityId: number; active: boolean }) => updateWebsiteCityStatus(cityId, active),
      onSuccess: invalidateCities,
    }),
    deleteCityMutation: useMutation({
      mutationFn: (cityId: number) => deleteWebsiteCity(cityId),
      onSuccess: invalidateCities,
    }),
    createAreaMutation: useMutation({
      mutationFn: ({ cityId, payload }: { cityId: number; payload: WebsiteLocationPayload }) => createCityArea(cityId, payload),
      onSuccess: async (_data, variables) => {
        await invalidateAreas(variables.cityId);
      },
    }),
    updateAreaMutation: useMutation({
      mutationFn: ({ areaId, payload }: { areaId: number; payload: WebsiteLocationPayload }) => updateCityArea(areaId, payload),
      onSuccess: async () => {
        await invalidateAreas();
      },
    }),
    updateAreaStatusMutation: useMutation({
      mutationFn: ({ areaId, active }: { areaId: number; active: boolean }) => updateCityAreaStatus(areaId, active),
      onSuccess: async () => {
        await invalidateAreas();
      },
    }),
    deleteAreaMutation: useMutation({
      mutationFn: (areaId: number) => deleteCityArea(areaId),
      onSuccess: async () => {
        await invalidateAreas();
      },
    }),
    reorderAreasMutation: useMutation({
      mutationFn: ({ cityId, rows }: { cityId: number; rows: Array<{ id: number; displayOrder: number }> }) =>
        reorderCityAreas(cityId, rows),
      onSuccess: async (_data, variables) => {
        await invalidateAreas(variables.cityId);
      },
    }),
  };
}

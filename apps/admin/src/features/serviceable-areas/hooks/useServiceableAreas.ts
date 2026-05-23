import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { extractApiError } from "@/utils/apiError";

import {
  createServiceableArea,
  deleteServiceableArea,
  getServiceableAreas,
  updateServiceableArea,
  updateServiceableAreaStatus,
} from "../api/serviceableAreasApi";
import { getGeoCities, getGeoZones } from "../api/geoApi";
import type {
  CreateServiceableAreaPayload,
  ServiceableAreaItem,
  ServiceableAreaQueryParams,
  UpdateServiceableAreaPayload,
} from "../types";

export function useServiceableAreas(params: ServiceableAreaQueryParams) {
  return useQuery({
    queryKey: ["serviceable-areas", params],
    queryFn: () => getServiceableAreas(params),
    retry: false,
  });
}

export function useGeoCities() {
  return useQuery({
    queryKey: ["geo-cities"],
    queryFn: getGeoCities,
    retry: false,
  });
}

export function useGeoZones(cityId?: number) {
  return useQuery({
    queryKey: ["geo-zones", cityId],
    queryFn: () => getGeoZones(cityId),
    enabled: Number.isFinite(cityId) && Number(cityId) > 0,
    retry: false,
  });
}

export function useCreateServiceableArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServiceableAreaPayload) => createServiceableArea(payload),
    onSuccess: async () => {
      toast.success("Serviceable area created");
      await queryClient.invalidateQueries({ queryKey: ["serviceable-areas"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create serviceable area")),
  });
}

export function useUpdateServiceableArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServiceableAreaPayload }) =>
      updateServiceableArea(id, payload),
    onSuccess: async () => {
      toast.success("Serviceable area updated");
      await queryClient.invalidateQueries({ queryKey: ["serviceable-areas"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update serviceable area")),
  });
}

export function useDeleteServiceableArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteServiceableArea(id),
    onSuccess: async () => {
      toast.success("Serviceable area deleted");
      await queryClient.invalidateQueries({ queryKey: ["serviceable-areas"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete serviceable area")),
  });
}

export function useToggleServiceableAreaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateServiceableAreaStatus(id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ["serviceable-areas"] });
      const snapshots = queryClient.getQueriesData<{ items: ServiceableAreaItem[] }>({
        queryKey: ["serviceable-areas"],
      });

      snapshots.forEach(([key, oldValue]) => {
        if (!oldValue) return;
        queryClient.setQueryData(key, {
          ...oldValue,
          items: oldValue.items.map((item) => (item.id === id ? { ...item, active } : item)),
        });
      });

      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots?.forEach(([key, oldValue]) => {
        queryClient.setQueryData(key, oldValue);
      });
      toast.error(extractApiError(error, "Unable to update status"));
    },
    onSuccess: async () => {
      toast.success("Status updated");
      await queryClient.invalidateQueries({ queryKey: ["serviceable-areas"] });
    },
  });
}

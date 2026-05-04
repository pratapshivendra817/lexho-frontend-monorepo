import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveProvider,
  blockProvider,
  deleteProvider,
  getProviderDetails,
  getProviders,
  getProviderStats,
  rejectProvider,
  unblockProvider,
} from "../api/providersApi";
import type { ProvidersQueryParams } from "../types";

export function useProviderStatsQuery() {
  return useQuery({
    queryKey: ["admin-provider-stats"],
    queryFn: getProviderStats,
    retry: false,
  });
}

export function useProvidersQuery(params: ProvidersQueryParams) {
  return useQuery({
    queryKey: ["admin-providers", params],
    queryFn: () => getProviders(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useProviderDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-provider-details", id],
    queryFn: () => getProviderDetails(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useProviderMutations() {
  const queryClient = useQueryClient();

  const invalidateProviders = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-provider-stats"] });
  };

  return {
    approveProviderMutation: useMutation({
      mutationFn: (id: string) => approveProvider(id),
      onSuccess: invalidateProviders,
    }),
    rejectProviderMutation: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectProvider(id, reason),
      onSuccess: invalidateProviders,
    }),
    blockProviderMutation: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => blockProvider(id, reason),
      onSuccess: invalidateProviders,
    }),
    unblockProviderMutation: useMutation({
      mutationFn: (id: string) => unblockProvider(id),
      onSuccess: invalidateProviders,
    }),
    deleteProviderMutation: useMutation({
      mutationFn: (id: string) => deleteProvider(id),
      onSuccess: invalidateProviders,
    }),
  };
}

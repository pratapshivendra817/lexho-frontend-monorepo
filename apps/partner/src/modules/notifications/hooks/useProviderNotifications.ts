import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getProviderNotifications,
  getProviderUnreadNotificationCount,
  markProviderNotificationAsRead,
} from "../api/notificationsApi";

export function useProviderNotificationsQuery(page: number, size: number) {
  return useQuery({
    queryKey: ["provider-notifications", { page, size }],
    queryFn: () => getProviderNotifications(page, size),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useProviderUnreadCountQuery() {
  return useQuery({
    queryKey: ["provider-notifications-unread"],
    queryFn: getProviderUnreadNotificationCount,
    refetchInterval: 20_000,
    retry: false,
  });
}

export function useProviderNotificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["provider-notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["provider-notifications-unread"] });
  };

  return {
    markReadMutation: useMutation({
      mutationFn: (id: string) => markProviderNotificationAsRead(id),
      onSuccess: invalidate,
    }),
    invalidateAll: invalidate,
  };
}

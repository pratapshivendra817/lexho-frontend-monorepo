import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteCustomerNotification,
  getCustomerNotifications,
  getCustomerUnreadNotificationCount,
  markCustomerNotificationAsRead,
} from "../api/notificationsApi";

export function useCustomerNotificationsQuery(page: number, size: number) {
  return useQuery({
    queryKey: ["customer-notifications", { page, size }],
    queryFn: () => getCustomerNotifications(page, size),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useCustomerUnreadCountQuery() {
  return useQuery({
    queryKey: ["customer-notifications-unread"],
    queryFn: getCustomerUnreadNotificationCount,
    refetchInterval: 20_000,
    retry: false,
  });
}

export function useCustomerNotificationMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["customer-notifications-unread"] });
  };

  return {
    markReadMutation: useMutation({
      mutationFn: (id: string) => markCustomerNotificationAsRead(id),
      onSuccess: invalidate,
    }),
    deleteMutation: useMutation({
      mutationFn: (id: string) => deleteCustomerNotification(id),
      onSuccess: invalidate,
    }),
    invalidateAll: invalidate,
  };
}

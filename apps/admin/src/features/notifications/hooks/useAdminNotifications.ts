import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAdminNotificationById,
  getAdminNotifications,
  getAdminNotificationStats,
  retryAdminNotification,
  sendAdminNotification,
} from "../api/notificationsApi";
import type { AdminNotificationQueryParams, SendAdminNotificationPayload } from "../types";

export function useAdminNotificationsQuery(params: AdminNotificationQueryParams) {
  return useQuery({
    queryKey: ["admin-notifications", params],
    queryFn: () => getAdminNotifications(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useAdminNotificationDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-notification-details", id],
    queryFn: () => getAdminNotificationById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useAdminNotificationStatsQuery() {
  return useQuery({
    queryKey: ["admin-notification-stats"],
    queryFn: getAdminNotificationStats,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useAdminNotificationMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-notification-stats"] });
  };

  return {
    sendMutation: useMutation({
      mutationFn: (payload: SendAdminNotificationPayload) => sendAdminNotification(payload),
      onSuccess: invalidate,
    }),
    retryMutation: useMutation({
      mutationFn: (id: string) => retryAdminNotification(id),
      onSuccess: invalidate,
    }),
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelBooking,
  getBookingById,
  getBookings,
  getBookingStats,
  manualDispatchOrder,
  softDeleteBooking,
  updateOrderLifecycle,
  updateBooking,
} from "../api/bookingsApi";
import type {
  BookingListItem,
  BookingListParams,
  BookingListResponse,
  DispatchLifecycleStatus,
  UpdateBookingPayload,
} from "../types";

export const bookingQueryKeys = {
  stats: ["admin-bookings-stats"] as const,
  list: (params: BookingListParams) => ["admin-bookings-list", params] as const,
  details: (id: string) => ["admin-booking-details", id] as const,
};

export function useBookingStatsQuery() {
  return useQuery({
    queryKey: bookingQueryKeys.stats,
    queryFn: getBookingStats,
    retry: false,
  });
}

export function useBookingsQuery(params: BookingListParams) {
  return useQuery({
    queryKey: bookingQueryKeys.list(params),
    queryFn: () => getBookings(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useBookingDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: bookingQueryKeys.details(id ?? ""),
    queryFn: () => getBookingById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

function updateListItemStatus(
  previous: BookingListResponse | undefined,
  bookingId: string,
  status: BookingListItem["status"],
) {
  if (!previous) {
    return previous;
  }

  return {
    ...previous,
    content: previous.content.map((item) =>
      item.id === bookingId
        ? {
            ...item,
            status,
          }
        : item,
    ),
  };
}

function removeListItem(previous: BookingListResponse | undefined, bookingId: string) {
  if (!previous) {
    return previous;
  }

  const nextContent = previous.content.filter((item) => item.id !== bookingId);
  if (nextContent.length === previous.content.length) {
    return previous;
  }

  return {
    ...previous,
    content: nextContent,
    totalElements: Math.max(0, previous.totalElements - 1),
  };
}

export function useBookingMutations() {
  const queryClient = useQueryClient();

  return {
    updateBookingMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateBookingPayload }) =>
        updateBooking(id, payload),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: ["admin-bookings-list"] });
        await queryClient.invalidateQueries({ queryKey: bookingQueryKeys.details(variables.id) });
      },
    }),
    cancelBookingMutation: useMutation({
      mutationFn: (id: string) => cancelBooking(id),
      onMutate: async (bookingId) => {
        await queryClient.cancelQueries({ queryKey: ["admin-bookings-list"] });

        const previousLists = queryClient.getQueriesData<BookingListResponse>({
          queryKey: ["admin-bookings-list"],
        });

        previousLists.forEach(([key, previous]) => {
          queryClient.setQueryData(key, updateListItemStatus(previous, bookingId, "CANCELLED"));
        });

        return { previousLists };
      },
      onError: (_, __, context) => {
        context?.previousLists?.forEach(([key, previous]) => {
          queryClient.setQueryData(key, previous);
        });
      },
      onSuccess: async (__, bookingId) => {
        await queryClient.invalidateQueries({ queryKey: bookingQueryKeys.details(bookingId) });
        await queryClient.invalidateQueries({ queryKey: bookingQueryKeys.stats });
      },
    }),
    deleteBookingMutation: useMutation({
      mutationFn: (id: string) => softDeleteBooking(id),
      onMutate: async (bookingId) => {
        await queryClient.cancelQueries({ queryKey: ["admin-bookings-list"] });

        const previousLists = queryClient.getQueriesData<BookingListResponse>({
          queryKey: ["admin-bookings-list"],
        });

        previousLists.forEach(([key, previous]) => {
          queryClient.setQueryData(key, removeListItem(previous, bookingId));
        });

        return { previousLists };
      },
      onError: (_, __, context) => {
        context?.previousLists?.forEach(([key, previous]) => {
          queryClient.setQueryData(key, previous);
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: bookingQueryKeys.stats });
      },
    }),
    manualDispatchMutation: useMutation({
      mutationFn: (orderId: string) => manualDispatchOrder(orderId),
      onSuccess: async (_, orderId) => {
        await queryClient.invalidateQueries({ queryKey: bookingQueryKeys.details(orderId) });
        await queryClient.invalidateQueries({ queryKey: ["admin-bookings-list"] });
      },
    }),
    updateLifecycleMutation: useMutation({
      mutationFn: ({ orderId, lifecycle }: { orderId: string; lifecycle: DispatchLifecycleStatus }) =>
        updateOrderLifecycle(orderId, lifecycle),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: bookingQueryKeys.details(variables.orderId) });
        await queryClient.invalidateQueries({ queryKey: ["admin-bookings-list"] });
      },
    }),
  };
}


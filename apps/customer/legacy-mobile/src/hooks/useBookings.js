import { useQuery } from "@tanstack/react-query";

import { fetchBookings } from "../api/homeapi";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });
}

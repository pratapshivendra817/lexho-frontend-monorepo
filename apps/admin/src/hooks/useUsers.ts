// src/hooks/useUsers.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";
import type { UsersResponse } from "../types/user";

interface Params {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}

export const useUsers = (params: Params) => {
  return useQuery<UsersResponse>({
    queryKey: ["users", params],

    queryFn: async () => {
      const { data } = await api.get("/api/admin/users", {
        params,
      });
      return data;
    },

    // ✅ prevents loading flicker
    placeholderData: (prev) => prev,

    // ✅ cache for 5 minutes
    //staleTime: 1000 * 60 * 5,

    // ✅ prevents unnecessary refetch on tab switch
    refetchOnWindowFocus: false,
  });
};
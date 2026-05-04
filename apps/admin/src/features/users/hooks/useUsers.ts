import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  blockUser,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  unblockUser,
  updateUser,
} from "../api/usersApi";
import type { UserUpsertPayload, UsersQueryParams } from "../types";

export function useUsersQuery(params: UsersQueryParams) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => getUsers(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useUserDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-user-details", id],
    queryFn: () => getUserById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return {
    createUserMutation: useMutation({
      mutationFn: (payload: UserUpsertPayload) => createUser(payload),
      onSuccess: invalidateUsers,
    }),
    updateUserMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UserUpsertPayload }) =>
        updateUser(id, payload),
      onSuccess: async (_, variables) => {
        await invalidateUsers();
        await queryClient.invalidateQueries({ queryKey: ["admin-user-details", variables.id] });
      },
    }),
    blockUserMutation: useMutation({
      mutationFn: (id: string) => blockUser(id),
      onSuccess: invalidateUsers,
    }),
    unblockUserMutation: useMutation({
      mutationFn: (id: string) => unblockUser(id),
      onSuccess: invalidateUsers,
    }),
    deleteUserMutation: useMutation({
      mutationFn: (id: string) => deleteUser(id),
      onSuccess: invalidateUsers,
    }),
  };
}


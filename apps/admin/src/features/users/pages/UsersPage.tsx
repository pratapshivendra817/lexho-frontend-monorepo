import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { ConfirmDialog, DataState, Pagination, Skeleton } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { useUserMutations, useUsersQuery } from "../hooks/useUsers";
import type { AdminUser, UserRole, UserStatus } from "../types";
import { UsersFilters } from "../components/UsersFilters";
import { UsersTable } from "../components/UsersTable";

export default function UsersPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [city, setCity] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const debouncedCity = useDebounce(city, 350);

  const usersQuery = useUsersQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    role: role || undefined,
    status: status || undefined,
    city: debouncedCity || undefined,
  });

  const {
    blockUserMutation,
    unblockUserMutation,
    deleteUserMutation,
  } = useUserMutations();

  const rows = usersQuery.data?.content ?? [];
  const total = usersQuery.data?.totalElements ?? 0;

  const isMutating =
    blockUserMutation.isPending ||
    unblockUserMutation.isPending ||
    deleteUserMutation.isPending;

  const filtersSummary = useMemo(() => {
    const values: string[] = [];
    if (role) values.push(`role=${role}`);
    if (status) values.push(`status=${status}`);
    if (debouncedCity) values.push(`city=${debouncedCity}`);
    if (debouncedSearch) values.push(`search=${debouncedSearch}`);

    return values.length > 0 ? values.join(" | ") : "No active filters";
  }, [debouncedCity, debouncedSearch, role, status]);

  const handleBlockToggle = (user: AdminUser) => {
    const mutation = user.blocked ? unblockUserMutation : blockUserMutation;
    mutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(user.blocked ? "User unblocked" : "User blocked");
      },
      onError: (error) => {
        toast.error(extractApiError(error, `Failed to ${user.blocked ? "unblock" : "block"} user`));
      },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    deleteUserMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("User deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(extractApiError(error, "Failed to delete user"));
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">User Management</h2>
          <p className="text-sm text-[var(--color-muted)]">{total} users · {filtersSummary}</p>
        </div>
      </div>

      <UsersFilters
        search={search}
        role={role}
        status={status}
        city={city}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onRoleChange={(value) => {
          setPage(1);
          setRole(value);
        }}
        onStatusChange={(value) => {
          setPage(1);
          setStatus(value);
        }}
        onCityChange={(value) => {
          setPage(1);
          setCity(value);
        }}
        onAddUser={() => navigate("/users/new")}
        onReset={() => {
          setPage(1);
          setSearch("");
          setRole("");
          setStatus("");
          setCity("");
        }}
      />

      <DataState
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading users..."
        errorText="Failed to load users"
        emptyText="No users found"
        onRetry={() => {
          void usersQuery.refetch();
        }}
      >
        {usersQuery.isFetching ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}

        <UsersTable
          rows={rows}
          onView={(user) => navigate(`/users/${user.id}`)}
          onEdit={(user) => navigate(`/users/${user.id}/edit`)}
          onBlockToggle={handleBlockToggle}
          onDelete={setDeleteTarget}
          isMutating={isMutating}
        />

        <Pagination page={page} total={total} limit={10} onPageChange={setPage} />
      </DataState>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User"
        description={`Delete ${deleteTarget?.name ?? "this user"}? This will be handled as soft delete by backend.`}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}


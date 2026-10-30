import { ArrowLeft, Ban, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";
import { useState } from "react";
import { UserStatusBadge } from "../components";
import { useUserDetailsQuery, useUserMutations } from "../hooks/useUsers";

export default function UserDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userQuery = useUserDetailsQuery(id);
  const { blockUserMutation, unblockUserMutation, deleteUserMutation } = useUserMutations();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const user = userQuery.data;

  const handleBlockToggle = () => {
    if (!user) {
      return;
    }

    const mutation = user.blocked ? unblockUserMutation : blockUserMutation;
    mutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(user.blocked ? "User unblocked" : "User blocked");
        void userQuery.refetch();
      },
      onError: (error) => {
        toast.error(extractApiError(error, `Unable to ${user.blocked ? "unblock" : "block"} user`));
      },
    });
  };

  const handleDelete = () => {
    if (!user) {
      return;
    }

    deleteUserMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success("User deleted");
        navigate("/users", { replace: true });
      },
      onError: (error) => {
        toast.error(extractApiError(error, "Unable to delete user"));
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/users" className="inline-flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-1.5 text-sm">
            <ArrowLeft size={14} /> Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">User Details</h2>
            <p className="text-sm text-[var(--color-muted)]">Inspect and manage user profile</p>
          </div>
        </div>

        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/users/${user.id}/edit`)}
              className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={handleBlockToggle}
              className="inline-flex items-center gap-1 rounded border border-amber-500/40 px-3 py-1.5 text-sm text-amber-300"
            >
              {user.blocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
              {user.blocked ? "Unblock" : "Block"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded border border-red-500/40 px-3 py-1.5 text-sm text-red-300"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ) : null}
      </div>

      <DataState
        isLoading={userQuery.isLoading}
        isError={userQuery.isError}
        isEmpty={!user}
        loadingText="Loading user details..."
        errorText="Failed to load user details"
        emptyText="User not found"
        onRetry={() => {
          void userQuery.refetch();
        }}
      >
        {user ? (
          <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Name</p>
                <p className="text-base font-medium">{user.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Email</p>
                <p className="text-base">{user.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Phone</p>
                <p className="text-base">{user.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Gender</p>
                <p className="text-base">{user.gender || "N/A"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">City</p>
                <p className="text-base">{user.city || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Role</p>
                <p className="text-base">{user.role}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Status</p>
                <UserStatusBadge status={user.status} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Created</p>
                <p className="text-sm text-[var(--color-muted)]">{user.createdAt || "N/A"}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DataState>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete User"
        description={`Delete ${user?.name ?? "this user"}? This action is expected to be soft delete on backend.`}
        confirmLabel="Delete"
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}


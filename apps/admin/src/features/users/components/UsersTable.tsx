import { Ban, Eye, Pencil, ShieldCheck, Trash2 } from "lucide-react";

import { DataTable } from "@/components/admin";

import type { AdminUser } from "../types";
import { UserStatusBadge } from "./UserStatusBadge";

type UsersTableProps = {
  rows: AdminUser[];
  onView: (user: AdminUser) => void;
  onEdit: (user: AdminUser) => void;
  onBlockToggle: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  isMutating: boolean;
};

export function UsersTable({
  rows,
  onView,
  onEdit,
  onBlockToggle,
  onDelete,
  isMutating,
}: UsersTableProps) {
  return (
    <DataTable
      rows={rows}
      rowKey={(user) => user.id}
      columns={[
        {
          key: "name",
          header: "Name",
          render: (user) => (
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
            </div>
          ),
        },
        {
          key: "phone",
          header: "Phone",
          render: (user) => user.phone || "N/A",
        },
        {
          key: "gender",
          header: "Gender",
          render: (user) => user.gender || "N/A",
        },
        {
          key: "city",
          header: "City",
          render: (user) => user.city || "N/A",
        },
        {
          key: "role",
          header: "Role",
          render: (user) => user.role,
        },
        {
          key: "status",
          header: "Status",
          render: (user) => <UserStatusBadge status={user.status} />,
        },
        {
          key: "actions",
          header: "Actions",
          render: (user) => (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onView(user)}
                className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
              >
                <Eye size={14} /> View
              </button>
              <button
                type="button"
                onClick={() => onEdit(user)}
                className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => onBlockToggle(user)}
                className="inline-flex items-center gap-1 rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300 disabled:opacity-50"
              >
                {user.blocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
                {user.blocked ? "Unblock" : "Block"}
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => onDelete(user)}
                className="inline-flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}


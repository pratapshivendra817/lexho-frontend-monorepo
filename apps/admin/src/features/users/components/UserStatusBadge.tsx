import type { UserStatus } from "../types";

type UserStatusBadgeProps = {
  status: UserStatus;
};

const statusClassMap: Record<UserStatus, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-300",
  BLOCKED: "bg-amber-500/20 text-amber-300",
  INACTIVE: "bg-slate-500/20 text-slate-300",
  DELETED: "bg-rose-500/20 text-rose-300",
};

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClassMap[status]}`}>
      {status}
    </span>
  );
}


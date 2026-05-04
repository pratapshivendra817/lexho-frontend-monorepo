import { Plus, Search } from "lucide-react";

import type { UserRole, UserStatus } from "../types";

type UsersFiltersProps = {
  search: string;
  role: UserRole | "";
  status: UserStatus | "";
  city: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: UserRole | "") => void;
  onStatusChange: (value: UserStatus | "") => void;
  onCityChange: (value: string) => void;
  onAddUser: () => void;
  onReset: () => void;
};

export function UsersFilters({
  search,
  role,
  status,
  city,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onCityChange,
  onAddUser,
  onReset,
}: UsersFiltersProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-12">
      <label className="col-span-12 flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm md:col-span-4">
        <Search size={16} className="text-[var(--color-muted)]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, email, phone"
          className="w-full bg-transparent text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
        />
      </label>

      <select
        value={role}
        onChange={(event) => onRoleChange(event.target.value as UserRole | "")}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      >
        <option value="">All roles</option>
        <option value="CUSTOMER">Customer</option>
        <option value="PROVIDER">Provider</option>
        <option value="ADMIN">Admin</option>
      </select>

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as UserStatus | "")}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      >
        <option value="">All status</option>
        <option value="ACTIVE">Active</option>
        <option value="BLOCKED">Blocked</option>
        <option value="INACTIVE">Inactive</option>
        <option value="DELETED">Deleted</option>
      </select>

      <input
        value={city}
        onChange={(event) => onCityChange(event.target.value)}
        placeholder="Filter by city"
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      />

      <button
        type="button"
        onClick={onReset}
        className="col-span-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
      >
        Reset
      </button>

      <button
        type="button"
        onClick={onAddUser}
        className="col-span-3 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white"
      >
        <Plus size={16} />
        Add User
      </button>
    </div>
  );
}


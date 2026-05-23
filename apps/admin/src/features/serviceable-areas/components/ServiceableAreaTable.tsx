import type { ServiceableAreaItem } from "../types";
import { StatusToggle } from "./StatusToggle";

type ServiceableAreaTableProps = {
  items: ServiceableAreaItem[];
  statusPendingId?: string | null;
  deletePendingId?: string | null;
  onEdit: (item: ServiceableAreaItem) => void;
  onDelete: (item: ServiceableAreaItem) => void;
  onToggleStatus: (item: ServiceableAreaItem) => void;
};

export function ServiceableAreaTable({
  items,
  statusPendingId,
  deletePendingId,
  onEdit,
  onDelete,
  onToggleStatus,
}: ServiceableAreaTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-hover)] text-[var(--color-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Pincode</th>
            <th className="px-4 py-3 font-medium">City</th>
            <th className="px-4 py-3 font-medium">State</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--color-border)] text-[var(--color-text)]">
              <td className="px-4 py-3">{item.name || "-"}</td>
              <td className="px-4 py-3 font-semibold">{item.pincode}</td>
              <td className="px-4 py-3">{item.city}</td>
              <td className="px-4 py-3">{item.state}</td>
              <td className="px-4 py-3">{item.country}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <StatusToggle
                    checked={item.active}
                    disabled={statusPendingId === item.id}
                    onChange={() => onToggleStatus(item)}
                  />
                  <span className={`text-xs font-semibold ${item.active ? "text-emerald-400" : "text-slate-400"}`}>
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={deletePendingId === item.id}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 disabled:opacity-60"
                  >
                    {deletePendingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ServiceableAreaTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="animate-pulse">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-7 gap-3 border-b border-[var(--color-border)] px-4 py-4">
            {Array.from({ length: 7 }).map((__, col) => (
              <div key={col} className="h-4 rounded bg-[var(--color-surface-hover)]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

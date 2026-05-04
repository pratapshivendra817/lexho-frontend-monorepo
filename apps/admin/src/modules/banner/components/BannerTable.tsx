import { DataState, DataTable } from "@/components/admin";
import type { BannerItem } from "../types/banner.types";

type BannerTableProps = {
  rows: BannerItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit: (banner: BannerItem) => void;
  onDelete: (banner: BannerItem) => void;
  onMoveUp: (banner: BannerItem) => void;
  onMoveDown: (banner: BannerItem) => void;
};

export function BannerTable({
  rows,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: BannerTableProps) {
  return (
    <DataState
      isLoading={isLoading}
      isError={isError}
      isEmpty={rows.length === 0}
      loadingText="Loading banners..."
      errorText="Unable to load banners"
      emptyText="No banners found"
      onRetry={onRetry}
    >
      <DataTable
        rows={rows}
        rowKey={(item) => item.id}
        columns={[
          {
            key: "image",
            header: "Image",
            render: (item) =>
              item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="h-10 w-16 rounded-md border border-[var(--color-border)] object-cover"
                />
              ) : (
                <span className="text-xs text-[var(--color-muted)]">N/A</span>
              ),
          },
          { key: "title", header: "Title", render: (item) => item.title },
          { key: "category", header: "Category", render: (item) => item.categoryName || "Global" },
          { key: "redirectType", header: "Redirect Type", render: (item) => item.redirectType },
          {
            key: "status",
            header: "Status",
            render: (item) => (
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  item.active
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-500/25 text-slate-200"
                }`}
              >
                {item.active ? "Active" : "Inactive"}
              </span>
            ),
          },
          { key: "priority", header: "Priority", render: (item) => item.priority },
          {
            key: "actions",
            header: "Actions",
            render: (item) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  onClick={() => onEdit(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  onClick={() => onMoveUp(item)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  onClick={() => onMoveDown(item)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                  onClick={() => onDelete(item)}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
      />
    </DataState>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { ConfirmDialog, Pagination } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";
import { BannerTable } from "../components/BannerTable";
import { useBannerCategories, useBanners, useDeleteBanner, useReorderBanners } from "../hooks/useBanners";
import type { BannerItem } from "../types/banner.types";

const PAGE_SIZE = 10;

export default function BannerListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [deleteTarget, setDeleteTarget] = useState<BannerItem | null>(null);

  const categoriesQuery = useBannerCategories();
  const bannersQuery = useBanners({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    categoryId: categoryId || undefined,
    active: activeFilter === "" ? undefined : activeFilter === "true",
  });
  const deleteMutation = useDeleteBanner();
  const reorderMutation = useReorderBanners();
  const [orderedRows, setOrderedRows] = useState<BannerItem[]>([]);

  const rows = bannersQuery.data?.items ?? [];
  const total = bannersQuery.data?.total ?? 0;
  const countLabel = useMemo(() => `${total} banners`, [total]);

  useEffect(() => {
    setOrderedRows(rows);
  }, [rows]);

  const hasReorderChanges = useMemo(() => {
    if (orderedRows.length !== rows.length) return false;
    return orderedRows.some((row, index) => row.id !== rows[index]?.id);
  }, [orderedRows, rows]);

  const moveRowBy = (id: string, delta: number) => {
    setOrderedRows((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Banner Management (New)</h2>
          <p className="text-sm text-[var(--color-muted)]">{countLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/banner-management/create")}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Create Banner
        </button>
        <button
          type="button"
          disabled={!hasReorderChanges || reorderMutation.isPending}
          onClick={() => {
            reorderMutation.mutate(orderedRows.map((item) => item.id), {
              onSuccess: () => toast.success("Banner order updated"),
              onError: (error) => toast.error(extractApiError(error, "Unable to reorder banners")),
            });
          }}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reorderMutation.isPending ? "Saving..." : "Save Order"}
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search by title"
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <select
          value={categoryId}
          onChange={(event) => {
            setPage(1);
            setCategoryId(event.target.value);
          }}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">All categories</option>
          {(categoriesQuery.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(event) => {
            setPage(1);
            setActiveFilter(event.target.value as "" | "true" | "false");
          }}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <BannerTable
        rows={orderedRows}
        isLoading={bannersQuery.isLoading}
        isError={bannersQuery.isError}
        onRetry={() => void bannersQuery.refetch()}
        onEdit={(banner) => navigate(`/banner-management/${banner.id}/edit`)}
        onDelete={(banner) => setDeleteTarget(banner)}
        onMoveUp={(banner) => moveRowBy(banner.id, -1)}
        onMoveDown={(banner) => moveRowBy(banner.id, 1)}
      />

      <Pagination page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Banner"
        description={deleteTarget ? `Delete "${deleteTarget.title}"?` : ""}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Banner deleted");
              setDeleteTarget(null);
            },
            onError: (error) => {
              toast.error(extractApiError(error, "Unable to delete banner"));
            },
          });
        }}
      />
    </div>
  );
}

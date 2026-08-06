import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout, Pagination } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { BannerStatusBadge, BannersFiltersBar, BannersStatsCards } from "../components";
import { uploadBannerImage } from "../api/bannersApi";
import { useBannerMutations, useBannersQuery, useBannerStatsQuery } from "../hooks/useBanners";
import type { AdminBanner, BannerAudience, BannerFormPayload, BannerType } from "../types";

  const defaultFormValues: BannerFormPayload = {
  title: "",
  subtitle: "",
  imageUrl: "",
  redirectType: "NONE",
  redirectId: null,
  priority: 1,
  active: true,
  bannerType: "PROMO",
  audience: "CUSTOMER",
};

export default function BannersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [formValues, setFormValues] = useState<BannerFormPayload>(defaultFormValues);
  const [editBanner, setEditBanner] = useState<AdminBanner | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminBanner | null>(null);
  const [priorityDraft, setPriorityDraft] = useState<Record<string, number>>({});

  const page = Number(searchParams.get("page") ?? "0") || 0;
  const audience = (searchParams.get("audience") ?? "") as BannerAudience | "";
  const search = searchParams.get("search") ?? "";
  const debouncedSearch = useDebounce(searchInput, 350);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === search) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (debouncedSearch) next.set("search", debouncedSearch);
      else next.delete("search");
      next.set("page", "0");
      return next;
    });
  }, [debouncedSearch, search, setSearchParams]);

  const updateParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value.length > 0) next.set(key, value);
        else next.delete(key);
      });
      if (resetPage) next.set("page", "0");
      return next;
    });
  };

  const bannersQuery = useBannersQuery({
    page,
    size: 10,
    audience,
    search: search || undefined,
  });
  const statsQuery = useBannerStatsQuery();
  const { createBannerMutation, updateBannerMutation, deleteBannerMutation, reorderBannersMutation } = useBannerMutations();
  const uploadImageMutation = useMutation({ mutationFn: (file: File) => uploadBannerImage(file) });

  const rows = useMemo(() => bannersQuery.data?.content ?? [], [bannersQuery.data?.content]);
  const total = bannersQuery.data?.totalElements ?? 0;
  const stats = statsQuery.data ?? { total: 0, active: 0, inactive: 0, customer: 0, partner: 0, both: 0 };

  const reorderItems = useMemo(
    () => rows.map((row) => ({ id: row.id, priority: Math.max(1, Number(priorityDraft[row.id] ?? row.priority ?? 1)) })),
    [priorityDraft, rows],
  );

  const openCreate = () => {
    setEditBanner(null);
    setFormValues(defaultFormValues);
    setFormOpen(true);
  };

  const openEdit = (banner: AdminBanner) => {
    setEditBanner(banner);
    setFormValues({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imageUrl: banner.imageUrl ?? "",
      redirectType: "NONE",
      redirectId: null,
      priority: banner.priority ?? 1,
      active: banner.active,
      bannerType: banner.bannerType,
      audience: banner.audience,
    });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!formValues.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formValues.imageUrl?.trim()) {
      toast.error("Image URL is required");
      return;
    }

    const payload: BannerFormPayload = {
      ...formValues,
      title: formValues.title.trim(),
      subtitle: formValues.subtitle?.trim() || "",
      imageUrl: formValues.imageUrl.trim(),
      redirectType: "NONE",
      redirectId: null,
      priority: Math.max(1, Number(formValues.priority || 1)),
    };

    if (editBanner) {
      updateBannerMutation.mutate(
        { id: editBanner.id, payload },
        {
          onSuccess: () => {
            toast.success("Banner updated");
            setFormOpen(false);
            setEditBanner(null);
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to update banner")),
        },
      );
      return;
    }

    createBannerMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Banner created");
        setFormOpen(false);
      },
      onError: (error) => toast.error(extractApiError(error, "Unable to create banner")),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Home Banners</h2>
          <p className="text-sm text-[var(--color-muted)]">Audience targeted banners for customer and partner apps</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => reorderBannersMutation.mutate({ items: reorderItems })}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          >
            Save Reorder
          </button>
          <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            + Create Banner
          </button>
        </div>
      </div>

      <BannersStatsCards stats={stats} />

      <BannersFiltersBar
        search={searchInput}
        audience={audience}
        onSearchChange={setSearchInput}
        onAudienceChange={(value) => updateParams({ audience: value || undefined })}
        onReset={() => setSearchParams(new URLSearchParams({ page: "0" }))}
      />

      <DataState
        isLoading={bannersQuery.isLoading}
        isError={bannersQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading banners..."
        errorText="Failed to load banners"
        emptyText="No banners found"
        onRetry={() => {
          void bannersQuery.refetch();
          void statsQuery.refetch();
        }}
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
                  <img src={item.imageUrl} alt={item.title} className="h-10 w-16 rounded-md object-cover border border-[var(--color-border)]" />
                ) : (
                  <span className="text-xs text-[var(--color-muted)]">No image</span>
                ),
            },
            { key: "title", header: "Title", render: (item) => item.title },
            { key: "subtitle", header: "Subtitle", render: (item) => item.subtitle || "-" },
            { key: "bannerType", header: "Type", render: (item) => item.bannerType },
            { key: "audience", header: "Audience", render: (item) => item.audience },
            { key: "status", header: "Status", render: (item) => <BannerStatusBadge active={item.active} /> },
            {
              key: "priority",
              header: "Priority",
              render: (item) => (
                <input
                  type="number"
                  min={1}
                  value={priorityDraft[item.id] ?? item.priority}
                  onChange={(event) => setPriorityDraft((prev) => ({ ...prev, [item.id]: Math.max(1, Number(event.target.value || 1)) }))}
                  className="w-20 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                />
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />

        <Pagination
          page={page + 1}
          total={total}
          limit={10}
          onPageChange={(nextPage) => updateParams({ page: String(Math.max(0, nextPage - 1)) }, false)}
        />
      </DataState>

      <ModalFormLayout
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editBanner ? "Edit Banner" : "Create Banner"}
        formId="banner-form"
        submitLabel={editBanner ? "Update" : "Create"}
        isSubmitting={
          createBannerMutation.isPending ||
          updateBannerMutation.isPending ||
          uploadImageMutation.isPending
        }
      >
        <form
          id="banner-form"
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitForm();
          }}
        >
          <label className="grid gap-1 text-sm">
            <span>Title</span>
            <input
              value={formValues.title}
              required
              onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Subtitle</span>
            <input
              value={formValues.subtitle ?? ""}
              onChange={(event) => setFormValues((prev) => ({ ...prev, subtitle: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Audience</span>
            <select
              value={formValues.audience}
              onChange={(event) => setFormValues((prev) => ({ ...prev, audience: event.target.value as BannerAudience }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="PARTNER">PARTNER</option>
              <option value="BOTH">BOTH</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Banner Type</span>
            <select
              value={formValues.bannerType}
              onChange={(event) => setFormValues((prev) => ({ ...prev, bannerType: event.target.value as BannerType }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="PROMO">PROMO</option>
              <option value="INCENTIVE">INCENTIVE</option>
              <option value="SEASONAL">SEASONAL</option>
              <option value="INFO">INFO</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Priority</span>
            <input
              type="number"
              min={1}
              value={formValues.priority}
              onChange={(event) => setFormValues((prev) => ({ ...prev, priority: Math.max(1, Number(event.target.value || 1)) }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Active</span>
            <select
              value={String(formValues.active)}
              onChange={(event) => setFormValues((prev) => ({ ...prev, active: event.target.value === "true" }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>

          <div className="grid gap-2 text-sm md:col-span-2">
            <span>Banner Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                uploadImageMutation.mutate(file, {
                  onSuccess: (url) => {
                    setFormValues((prev) => ({ ...prev, imageUrl: url }));
                    toast.success("Image uploaded");
                  },
                  onError: (error) => toast.error(extractApiError(error, "Image upload failed")),
                });
              }}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Banner"
        description={deleteTarget ? `Delete banner "${deleteTarget.title}"?` : ""}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteBannerMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Banner deleted");
              setDeleteTarget(null);
            },
            onError: (error) => toast.error(extractApiError(error, "Unable to delete banner")),
          });
        }}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout, Pagination } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { BannerStatusBadge, BannersFiltersBar, BannersStatsCards } from "../components";
import { uploadBannerImage } from "../api/bannersApi";
import { useBannerMutations, useBannersQuery, useBannerStatsQuery } from "../hooks/useBanners";
import type {
  AdminBanner,
  BannerFormPayload,
  BannerPlacementType,
  BannerPlatformType,
  BannerPromoType,
  BannerStatus,
} from "../types";

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

const defaultFormValues: BannerFormPayload = {
  title: "",
  description: "",
  city: "",
  promoType: "PROMO",
  platformType: "WEB",
  placement: "BOTTOM",
  bannerImageUrl: "",
  status: "DRAFT",
  slotNumber: 1,
  priority: 1,
  startDate: "",
  endDate: "",
};

type EditState = { open: false; banner: null } | { open: true; banner: AdminBanner | null };

export default function BannersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [formValues, setFormValues] = useState<BannerFormPayload>(defaultFormValues);
  const [editState, setEditState] = useState<EditState>({ open: false, banner: null });
  const [deleteTarget, setDeleteTarget] = useState<AdminBanner | null>(null);
  const [dateError, setDateError] = useState<string>("");

  const page = parsePage(searchParams.get("page"));
  const status = (searchParams.get("status") ?? "") as BannerStatus | "";
  const city = searchParams.get("city") ?? "";
  const promoType = (searchParams.get("promoType") ?? "") as BannerPromoType;
  const platformType = (searchParams.get("platformType") ?? "") as BannerPlatformType;
  const placement = (searchParams.get("placement") ?? "") as BannerPlacementType | "";
  const search = searchParams.get("search") ?? "";

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === search) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      next.set("search", debouncedSearch);
    } else {
      next.delete("search");
    }
    next.set("page", "0");
    setSearchParams(next);
  }, [debouncedSearch, search, searchParams, setSearchParams]);

  const updateParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.length > 0) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    if (resetPage) {
      next.set("page", "0");
    }
    setSearchParams(next);
  };

  const bannersQuery = useBannersQuery({
    page,
    size: 10,
    status,
    city: city || undefined,
    promoType,
    platformType,
    placement,
    search: search || undefined,
  });
  const statsQuery = useBannerStatsQuery();
  const {
    createBannerMutation,
    updateBannerMutation,
    deleteBannerMutation,
    activateBannerMutation,
    deactivateBannerMutation,
    draftBannerMutation,
  } = useBannerMutations();
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadBannerImage(file),
  });

  const rows = bannersQuery.data?.content ?? [];
  const total = bannersQuery.data?.totalElements ?? 0;
  const stats = statsQuery.data ?? { total: 0, active: 0, inactive: 0, draft: 0 };

  const openCreate = () => {
    setFormValues(defaultFormValues);
    setEditState({ open: true, banner: null });
  };

  const openEdit = (banner: AdminBanner) => {
    setFormValues({
      title: banner.title,
      description: banner.description ?? "",
      city: banner.city ?? "",
      promoType: banner.promoType || "PROMO",
      platformType: banner.platformType || "WEB",
      placement: banner.placement || "BOTTOM",
      bannerImageUrl: banner.bannerImageUrl ?? "",
      status: banner.status ?? "DRAFT",
      slotNumber: banner.slotNumber ?? 1,
      priority: banner.priority ?? 1,
      startDate: banner.startDate ?? "",
      endDate: banner.endDate ?? "",
    });
    setEditState({ open: true, banner });
  };

  const submitForm = () => {
    const trimmedTitle = formValues.title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required");
      return;
    }

    if (!formValues.bannerImageUrl?.trim()) {
      toast.error("Banner image is required");
      return;
    }

    if (formValues.startDate && formValues.endDate && new Date(formValues.endDate) < new Date(formValues.startDate)) {
      setDateError("End date cannot be before start date");
      return;
    }
    setDateError("");

    const activeSlotConflict = rows.some((row) => {
      if (row.status !== "ACTIVE") return false;
      if ((row.placement ?? "BOTTOM") !== formValues.placement) return false;
      if ((row.slotNumber ?? 1) !== formValues.slotNumber) return false;
      if (editState.banner && row.id === editState.banner.id) return false;
      return formValues.status === "ACTIVE";
    });
    if (activeSlotConflict) {
      toast.error(`Active ${formValues.placement.toLowerCase()} slot already in use: ${formValues.slotNumber}`);
      return;
    }

    if (!Number.isFinite(formValues.slotNumber) || formValues.slotNumber < 1 || formValues.slotNumber > 5) {
      toast.error("Slot number must be between 1 and 5");
      return;
    }

    if (!Number.isFinite(formValues.priority) || formValues.priority < 1) {
      toast.error("Priority is required");
      return;
    }

    const payload: BannerFormPayload = {
      ...formValues,
      title: trimmedTitle,
      description: formValues.description?.trim() || "",
      city: formValues.city?.trim() || "",
      bannerImageUrl: formValues.bannerImageUrl.trim(),
    };

    if (editState.banner) {
      updateBannerMutation.mutate(
        { id: editState.banner.id, payload },
        {
          onSuccess: () => {
            toast.success("Banner updated");
            setEditState({ open: false, banner: null });
            setFormValues(defaultFormValues);
            setDateError("");
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to update banner")),
        },
      );
      return;
    }

    createBannerMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Banner created");
        setEditState({ open: false, banner: null });
        setFormValues(defaultFormValues);
        setDateError("");
      },
      onError: (error) => toast.error(extractApiError(error, "Unable to create banner")),
    });
  };

  const submitStatusAction = (banner: AdminBanner, action: "activate" | "deactivate" | "draft") => {
    const mutation =
      action === "activate"
        ? activateBannerMutation
        : action === "deactivate"
        ? deactivateBannerMutation
        : draftBannerMutation;

    mutation.mutate(banner.id, {
      onSuccess: () => toast.success(`Banner ${action}d`),
      onError: (error) => toast.error(extractApiError(error, `Unable to ${action} banner`)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Banners</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage promotions, visibility and targeting</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          + Create Banner
        </button>
      </div>

      <BannersStatsCards stats={stats} />

      <BannersFiltersBar
        search={searchInput}
        status={status}
        city={city}
        promoType={promoType}
        platformType={platformType}
        placement={placement}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => updateParams({ status: value || undefined })}
        onCityChange={(value) => updateParams({ city: value || undefined })}
        onPromoTypeChange={(value) => updateParams({ promoType: value || undefined })}
        onPlatformTypeChange={(value) => updateParams({ platformType: value || undefined })}
        onPlacementChange={(value) => updateParams({ placement: value || undefined })}
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
                item.bannerImageUrl ? (
                  <img src={item.bannerImageUrl} alt={item.title} className="h-10 w-16 rounded-md object-cover border border-[var(--color-border)]" />
                ) : (
                  <span className="text-xs text-[var(--color-muted)]">No image</span>
                ),
            },
            { key: "title", header: "Title", render: (item) => item.title },
            { key: "promoType", header: "Promo Type", render: (item) => item.promoType || "-" },
            { key: "platformType", header: "Platform", render: (item) => item.platformType || "-" },
            {
              key: "placement",
              header: "Placement",
              render: (item) => {
                const placement = item.placement === "TOP" ? "Home Top" : "Home Bottom";
                const slot = Number(item.slotNumber ?? 1);
                return `${placement} (Slot ${slot})`;
              },
            },
            { key: "city", header: "City", render: (item) => item.city || "-" },
            { key: "status", header: "Status", render: (item) => <BannerStatusBadge status={item.status} /> },
            { key: "startDate", header: "Start Date", render: (item) => item.startDate || "-" },
            { key: "endDate", header: "End Date", render: (item) => item.endDate || "-" },
            { key: "priority", header: "Priority", render: (item) => item.priority ?? "-" },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => submitStatusAction(item, "activate")} className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300">
                    Activate
                  </button>
                  <button type="button" onClick={() => submitStatusAction(item, "deactivate")} className="rounded border border-zinc-500/30 px-2 py-1 text-xs text-zinc-300">
                    Deactivate
                  </button>
                  <button type="button" onClick={() => submitStatusAction(item, "draft")} className="rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-300">
                    Draft
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
        open={editState.open}
        onClose={() => setEditState({ open: false, banner: null })}
        title={editState.banner ? "Edit Banner" : "Create Banner"}
        formId="banner-form"
        submitLabel={editState.banner ? "Update" : "Create"}
        isSubmitting={createBannerMutation.isPending || updateBannerMutation.isPending || uploadImageMutation.isPending}
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
            <span>City</span>
            <input
              value={formValues.city}
              onChange={(event) => setFormValues((prev) => ({ ...prev, city: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Promo Type</span>
            <select
              value={formValues.promoType}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, promoType: event.target.value as BannerFormPayload["promoType"] }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="PROMO">PROMO</option>
              <option value="OFFER">OFFER</option>
              <option value="ENGAGE">ENGAGE</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Platform</span>
            <select
              value={formValues.platformType}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, platformType: event.target.value as BannerFormPayload["platformType"] }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="WEB">WEB</option>
              <option value="ANDROID">ANDROID</option>
              <option value="IOS">IOS</option>
              <option value="ALL">ALL</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Placement</span>
            <select
              value={formValues.placement}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, placement: event.target.value as BannerPlacementType }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="TOP">Top Banner</option>
              <option value="BOTTOM">Bottom Banner</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Status</span>
            <select
              value={formValues.status}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, status: event.target.value as BannerStatus }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Slot Number</span>
            <input
              type="number"
              min={1}
              max={5}
              value={formValues.slotNumber}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  slotNumber: Math.min(5, Math.max(1, Number(event.target.value || 1))),
                }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <span className="text-xs text-[var(--color-muted)]">
              Selected placement ke andar slot order define karega (1 to 5).
            </span>
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

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Description</span>
            <textarea
              rows={3}
              value={formValues.description}
              onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
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
                    setFormValues((prev) => ({ ...prev, bannerImageUrl: url }));
                    toast.success("Image uploaded");
                  },
                  onError: (error) => toast.error(extractApiError(error, "Image upload failed")),
                });
              }}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white"
            />
            {!formValues.bannerImageUrl ? <p className="text-xs text-amber-300">Upload image is required before create/update.</p> : null}
            {uploadImageMutation.isPending ? <p className="text-xs text-[var(--color-muted)]">Uploading image...</p> : null}
            {formValues.bannerImageUrl ? (
              <div className="flex items-center gap-3">
                <img src={formValues.bannerImageUrl} alt="Banner preview" className="h-20 w-32 rounded-md object-cover border border-[var(--color-border)]" />
                <button
                  type="button"
                  onClick={() => setFormValues((prev) => ({ ...prev, bannerImageUrl: "" }))}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                >
                  Remove Image
                </button>
              </div>
            ) : null}
          </div>

          <label className="grid gap-1 text-sm">
            <span>Start Date & Time</span>
            <input
              type="datetime-local"
              value={formValues.startDate ?? ""}
              onChange={(event) => setFormValues((prev) => ({ ...prev, startDate: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>End Date & Time</span>
            <input
              type="datetime-local"
              value={formValues.endDate ?? ""}
              onChange={(event) => setFormValues((prev) => ({ ...prev, endDate: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          {dateError ? <p className="text-xs text-red-300 md:col-span-2">{dateError}</p> : null}
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

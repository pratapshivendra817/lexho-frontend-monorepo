import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  createRecommendedAddon,
  deleteRecommendedAddon,
  getAddonCategories,
  getAddonServices,
  getRecommendedAddons,
  updateRecommendedAddon,
  updateRecommendedAddonStatus,
} from "../api/recommendedAddonsApi";
import type {
  AddonCategoryOption,
  AddonServiceOption,
  AddonStatusFilter,
  AddonType,
  RecommendedAddon,
  RecommendedAddonPayload,
} from "../types";

type AddonFormState = {
  name: string;
  description: string;
  price: string;
  active: boolean;
  categoryIds: string[];
  serviceIds: string[];
  quantityAllowed: boolean;
  minQuantity: string;
  maxQuantity: string;
  addonType: AddonType;
};

const defaultForm: AddonFormState = {
  name: "",
  description: "",
  price: "",
  active: true,
  categoryIds: [],
  serviceIds: [],
  quantityAllowed: false,
  minQuantity: "1",
  maxQuantity: "1",
  addonType: "OPTIONAL",
};

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function toForm(row: RecommendedAddon): AddonFormState {
  return {
    name: row.name,
    description: row.description,
    price: String(row.price || ""),
    active: row.active,
    categoryIds: row.categories.map((item) => item.id),
    serviceIds: row.services.map((item) => item.id),
    quantityAllowed: row.quantityAllowed,
    minQuantity: String(row.minQuantity || 1),
    maxQuantity: String(row.maxQuantity || 1),
    addonType: row.required ? "REQUIRED" : "OPTIONAL",
  };
}

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function sanitizeAssignedSelections(
  form: AddonFormState,
  categories: AddonCategoryOption[],
  services: AddonServiceOption[],
): AddonFormState {
  const validCategoryIds = new Set(categories.map((item) => item.id));
  const validServiceIds = new Set(services.map((item) => item.id));
  const selectedServices = services.filter((item) => form.serviceIds.includes(item.id));
  const serviceBackedCategoryIds = new Set(
    selectedServices
      .map((item) => item.categoryId)
      .filter((id): id is string => Boolean(id)),
  );
  const sanitizedServiceIds = form.serviceIds.filter((id) => validServiceIds.has(id));
  const sanitizedCategoryIds = form.categoryIds.filter((id) => validCategoryIds.has(id));

  return {
    ...form,
    categoryIds:
      serviceBackedCategoryIds.size > 0
        ? sanitizedCategoryIds.filter((id) => serviceBackedCategoryIds.has(id))
        : sanitizedCategoryIds,
    serviceIds: sanitizedServiceIds,
  };
}

function toPayload(form: AddonFormState): RecommendedAddonPayload {
  const quantityAllowed = Boolean(form.quantityAllowed);
  const minQuantity = quantityAllowed ? Math.max(1, Number(form.minQuantity) || 1) : 1;
  const maxQuantity = quantityAllowed ? Math.max(minQuantity, Number(form.maxQuantity) || minQuantity) : 1;
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    price: Number(form.price),
    active: form.active,
    categoryIds: form.categoryIds.map(Number).filter((id) => Number.isFinite(id) && id > 0),
    serviceIds: form.serviceIds.map(Number).filter((id) => Number.isFinite(id) && id > 0),
    quantityAllowed,
    minQuantity,
    maxQuantity,
    required: form.addonType === "REQUIRED",
  };
}

function validateForm(form: AddonFormState) {
  const name = form.name.trim();
  const price = Number(form.price);
  const minQuantity = Number(form.minQuantity);
  const maxQuantity = Number(form.maxQuantity);
  if (!name) return "Add-on name is required";
  if (!Number.isFinite(price) || price <= 0) return "Price must be greater than zero";
  if (form.categoryIds.length === 0 && form.serviceIds.length === 0) {
    return "Select at least one category or service";
  }
  if (form.quantityAllowed) {
    if (!Number.isFinite(minQuantity) || minQuantity < 1) return "Minimum quantity must be at least 1";
    if (!Number.isFinite(maxQuantity) || maxQuantity < minQuantity) return "Maximum quantity must be greater than or equal to minimum quantity";
  }
  if (form.addonType === "REQUIRED" && Number(form.minQuantity || 1) < 1) {
    return "Required add-ons cannot have quantity less than 1";
  }
  return null;
}

export default function RecommendedAddonsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AddonStatusFilter>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecommendedAddon | null>(null);
  const [form, setForm] = useState<AddonFormState>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<RecommendedAddon | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["recommended-addons-categories"], queryFn: getAddonCategories });
  const servicesQuery = useQuery({ queryKey: ["recommended-addons-services"], queryFn: getAddonServices });
  const addonsQuery = useQuery({
    queryKey: ["recommended-addons", search, status, categoryId, serviceId],
    queryFn: () => getRecommendedAddons({ search, status, categoryId, serviceId }),
  });

  const servicesForForm = useMemo(() => {
    if (form.categoryIds.length === 0) return servicesQuery.data ?? [];
    return (servicesQuery.data ?? []).filter((item) => !item.categoryId || form.categoryIds.includes(item.categoryId));
  }, [form.categoryIds, servicesQuery.data]);

  const selectedCategoryNames = useMemo(
    () => (categoriesQuery.data ?? []).filter((item) => form.categoryIds.includes(item.id)).map((item) => item.name),
    [categoriesQuery.data, form.categoryIds],
  );
  const selectedServiceNames = useMemo(
    () => (servicesQuery.data ?? []).filter((item) => form.serviceIds.includes(item.id)).map((item) => item.name),
    [form.serviceIds, servicesQuery.data],
  );

  const refreshAddons = async () => {
    await queryClient.invalidateQueries({ queryKey: ["recommended-addons"] });
    await addonsQuery.refetch();
  };

  const createMutation = useMutation({
    mutationFn: createRecommendedAddon,
    onSuccess: () => {
      toast.success("Add-on created");
      setModalOpen(false);
      setForm(defaultForm);
      void refreshAddons();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create add-on")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecommendedAddonPayload }) => updateRecommendedAddon(id, payload),
    onSuccess: () => {
      toast.success("Add-on updated");
      setModalOpen(false);
      setEditingItem(null);
      setForm(defaultForm);
      void refreshAddons();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update add-on")),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateRecommendedAddonStatus(id, active),
    onSuccess: () => {
      toast.success("Status updated");
      void refreshAddons();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update status")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecommendedAddon,
    onSuccess: (result) => {
      toast.success(result.deactivated ? "Add-on deactivated" : "Add-on deleted");
      setDeleteTarget(null);
      void refreshAddons();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete add-on")),
  });

  const openCreate = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (item: RecommendedAddon) => {
    setEditingItem(item);
    setForm(sanitizeAssignedSelections(toForm(item), categoriesQuery.data ?? [], servicesQuery.data ?? []));
    setModalOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedForm = sanitizeAssignedSelections(form, categoriesQuery.data ?? [], servicesQuery.data ?? []);
    setForm(sanitizedForm);
    const validation = validateForm(sanitizedForm);
    if (validation) {
      toast.error(validation);
      return;
    }
    const payload = toPayload(sanitizedForm);
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const formPrice = Number(form.price) || 0;
  const previewQuantity = form.quantityAllowed ? Math.max(1, Number(form.minQuantity) || 1) : 1;
  const previewTotal = formPrice * previewQuantity;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Recommended Add-ons</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted)]">
            Create optional or required add-ons that attach to services or categories. Add-ons cannot be booked directly by customers.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Create Add-on
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by add-on name"
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value as AddonStatusFilter)} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]">
          <option value="">All categories</option>
          {(categoriesQuery.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]">
          <option value="">All services</option>
          {(servicesQuery.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <DataState
        isLoading={addonsQuery.isLoading}
        isError={addonsQuery.isError}
        isEmpty={(addonsQuery.data ?? []).length === 0}
        loadingText="Loading add-ons..."
        errorText="Failed to load add-ons"
        emptyText="No add-ons found"
        onRetry={() => void addonsQuery.refetch()}
      >
        <DataTable
          rows={addonsQuery.data ?? []}
          rowKey={(item) => item.id}
          columns={[
            { key: "name", header: "Add-on Name", render: (item) => <span className="font-medium">{item.name}</span> },
            { key: "price", header: "Price", render: (item) => formatCurrency(item.price) },
            {
              key: "categories",
              header: "Categories",
              render: (item) => item.categories.length ? item.categories.map((row) => row.name).join(", ") : "-",
            },
            { key: "services", header: "Services Count", render: (item) => item.servicesCount },
            { key: "quantity", header: "Quantity Allowed", render: (item) => item.quantityAllowed ? `Yes (${item.minQuantity}-${item.maxQuantity})` : "No" },
            {
              key: "required",
              header: "Required / Optional",
              render: (item) => (
                <span className={item.required ? "text-amber-300" : "text-emerald-300"}>{item.required ? "Required" : "Optional"}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: item.id, active: !item.active })}
                  className={`rounded-full px-2 py-1 text-xs font-medium ${item.active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-600/30 text-gray-200"}`}
                >
                  {item.active ? "Active" : "Inactive"}
                </button>
              ),
            },
            { key: "created", header: "Created Date", render: (item) => formatDate(item.createdAt) },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">Edit</button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">Delete</button>
                </div>
              ),
            },
          ]}
        />
      </DataState>

      <ModalFormLayout
        open={modalOpen}
        title={editingItem ? "Edit Add-on" : "Create Add-on"}
        formId="recommended-addon-form"
        submitLabel={editingItem ? "Update" : "Create"}
        isSubmitting={isSubmitting}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
          setForm(defaultForm);
        }}
        maxWidthClassName="max-w-4xl"
      >
        <form id="recommended-addon-form" onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-[var(--color-text)]">
              <span>Add-on Name *</span>
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-text)]">
              <span>Price *</span>
              <input type="number" min={1} step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-text)] md:col-span-2">
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="grid gap-4 rounded-xl border border-[var(--color-border)] p-4 md:grid-cols-3">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
              Active
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-text)]">
              <span>Add-on Type</span>
              <select value={form.addonType} onChange={(event) => setForm((prev) => ({ ...prev, addonType: event.target.value as AddonType }))} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm">
                <option value="OPTIONAL">Optional</option>
                <option value="REQUIRED">Required</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={form.quantityAllowed}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    quantityAllowed: event.target.checked,
                    minQuantity: event.target.checked ? prev.minQuantity : "1",
                    maxQuantity: event.target.checked ? prev.maxQuantity : "1",
                  }))
                }
              />
              Quantity Allowed?
            </label>
            {form.quantityAllowed ? (
              <>
                <label className="grid gap-1 text-sm text-[var(--color-text)]">
                  <span>Minimum Quantity</span>
                  <input type="number" min={1} value={form.minQuantity} onChange={(event) => setForm((prev) => ({ ...prev, minQuantity: event.target.value }))} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
                </label>
                <label className="grid gap-1 text-sm text-[var(--color-text)]">
                  <span>Maximum Quantity</span>
                  <input type="number" min={1} value={form.maxQuantity} onChange={(event) => setForm((prev) => ({ ...prev, maxQuantity: event.target.value }))} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
                </label>
              </>
            ) : null}
          </div>

          <AssignmentSelector
            title="Available Categories"
            rows={categoriesQuery.data ?? []}
            selectedIds={form.categoryIds}
            onToggle={(id) => setForm((prev) => ({ ...prev, categoryIds: toggleId(prev.categoryIds, id) }))}
            loading={categoriesQuery.isLoading}
          />

          <AssignmentSelector
            title="Available Services"
            rows={servicesForForm}
            selectedIds={form.serviceIds}
            onToggle={(id) => setForm((prev) => ({ ...prev, serviceIds: toggleId(prev.serviceIds, id) }))}
            loading={servicesQuery.isLoading}
          />

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">Preview</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {(selectedServiceNames[0] || selectedCategoryNames[0] || "Home Cleaning")}
            </p>
            <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">Recommended Add-ons:</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text)]">
                <span>{form.addonType === "REQUIRED" ? "☑" : "☐"}</span>
                <span>{form.name || "Sofa Cleaning"}</span>
                <span className="font-semibold text-emerald-300">{formatCurrency(previewTotal)}</span>
                {form.addonType === "REQUIRED" ? <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">Required</span> : null}
              </div>
            </div>
          </div>
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Add-on"
        description={`Are you sure you want to delete ${deleteTarget?.name ?? "this add-on"}?`}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function AssignmentSelector<T extends AddonCategoryOption | AddonServiceOption>({
  title,
  rows,
  selectedIds,
  onToggle,
  loading,
}: {
  title: string;
  rows: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
        <span className="text-xs text-[var(--color-muted)]">{selectedIds.length} selected</span>
      </div>
      {loading ? <p className="text-sm text-[var(--color-muted)]">Loading...</p> : null}
      {!loading && rows.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No options available</p> : null}
      <div className="grid max-h-52 gap-2 overflow-auto md:grid-cols-2">
        {rows.map((item) => (
          <label key={item.id} className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} className="mt-1" />
            <span>
              <span className="block font-medium">{item.name}</span>
              {"categoryName" in item && item.categoryName ? (
                <span className="text-xs text-[var(--color-muted)]">{item.categoryName}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

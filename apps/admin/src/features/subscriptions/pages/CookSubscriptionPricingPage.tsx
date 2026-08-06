import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { getServices } from "@/services/lexhoAdminApi";
import type { ServiceItem } from "@/types/adminCatalog";
import { extractApiError } from "@/utils/apiError";

import {
  createAdminCookSubscriptionPricing,
  deleteAdminCookSubscriptionPricing,
  getAdminCookSubscriptionPricing,
  updateAdminCookSubscriptionPricing,
} from "../api/subscriptionPricingApi";
import {
  buildOptionalServiceId,
  PricingActiveField,
  PricingDeactivateDialog,
  PricingPageHeader,
  PricingRowActions,
  PricingStatusBadge,
} from "../components/pricingPageShared";
import type { AdminCookSubscriptionPricing, AdminCookSubscriptionPricingPayload, CookFamilySize } from "../pricingTypes";

type CookPricingForm = {
  serviceId: string;
  familySize: CookFamilySize;
  pricePerVisit: string;
  active: boolean;
};

const familySizeOptions: Array<{ value: CookFamilySize; label: string; hint: string }> = [
  { value: "SMALL", label: "SMALL", hint: "1-2 Members" },
  { value: "MEDIUM", label: "MEDIUM", hint: "3-4 Members" },
  { value: "LARGE", label: "LARGE", hint: "5-6 Members" },
  { value: "XLARGE", label: "XLARGE", hint: "6-8 Members" },
];

function normalizeSearch(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

type CookServiceOption = Pick<ServiceItem, "id" | "name" | "categoryName" | "serviceType">;

function isCookFoodService(service: CookServiceOption) {
  const normalized = normalizeSearch(`${service.name} ${service.categoryName ?? ""} ${service.serviceType ?? ""}`);
  return normalized.includes("cook")
    || normalized.includes("chef")
    || normalized.includes("home")
    || normalized.includes("food")
    || normalized.includes("meal")
    || normalized.includes("kitchen")
    || normalized.includes("veg")
    || normalized.includes("party");
}

const defaultForm: CookPricingForm = {
  serviceId: "",
  familySize: "MEDIUM",
  pricePerVisit: "",
  active: true,
};

function toForm(row: AdminCookSubscriptionPricing): CookPricingForm {
  return {
    serviceId: row.serviceId == null ? "" : String(row.serviceId),
    familySize: row.familySize,
    pricePerVisit: String(row.pricePerVisit),
    active: row.active,
  };
}

function toPayload(form: CookPricingForm): AdminCookSubscriptionPricingPayload {
  return {
    serviceId: buildOptionalServiceId(form.serviceId),
    familySize: form.familySize,
    pricePerVisit: Number(form.pricePerVisit),
    active: form.active,
  };
}

function validatePayload(payload: AdminCookSubscriptionPricingPayload) {
  if (!payload.familySize) return "Family size is required";
  if (!Number.isFinite(payload.pricePerVisit) || payload.pricePerVisit <= 0) return "Per visit price is required";
  return "";
}

export default function CookSubscriptionPricingPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCookSubscriptionPricing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCookSubscriptionPricing | null>(null);
  const [form, setForm] = useState<CookPricingForm>(defaultForm);

  const pricingQuery = useQuery({
    queryKey: ["admin-cook-subscription-pricing"],
    queryFn: getAdminCookSubscriptionPricing,
    retry: false,
  });
  const serviceOptionsQuery = useQuery({
    queryKey: ["admin-services-for-cook-pricing"],
    queryFn: async () => {
      const response = await getServices({ page: 1, limit: 500 });
      return response.items;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createAdminCookSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Cook subscription price created");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create cook subscription price")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCookSubscriptionPricingPayload }) =>
      updateAdminCookSubscriptionPricing(id, payload),
    onSuccess: async () => {
      toast.success("Cook subscription price updated");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update cook subscription price")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCookSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Cook subscription price deactivated");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to deactivate cook subscription price")),
  });

  const rows = useMemo(() => pricingQuery.data ?? [], [pricingQuery.data]);
  const cookServiceOptions = useMemo(() => {
    const rows = serviceOptionsQuery.data ?? [];
    const filtered = rows.filter(isCookFoodService);
    const source = filtered.length > 0 ? filtered : rows;
    return [...source].sort((first, second) => first.name.localeCompare(second.name));
  }, [serviceOptionsQuery.data]);
  const cookServiceNameById = useMemo(
    () => new Map(cookServiceOptions.map((item) => [String(item.id), item.name])),
    [cookServiceOptions],
  );

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(defaultForm);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (row: AdminCookSubscriptionPricing) => {
    setEditing(row);
    setForm(toForm(row));
    setModalOpen(true);
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload(form);
    const error = validatePayload(payload);
    if (error) {
      toast.error(error);
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <PricingPageHeader
        title="Cook Subscription Pricing"
        description="Manage service-wise cook prices by family size."
        addLabel="+ Add Cook Price"
        onAdd={openCreate}
      />

      <DataState
        isLoading={pricingQuery.isLoading}
        isError={pricingQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading cook subscription pricing..."
        errorText="Failed to load cook subscription pricing"
        emptyText="No cook subscription pricing found"
        onRetry={() => void pricingQuery.refetch()}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            {
              key: "service",
              header: "Service",
              render: (row) => (row.serviceId == null ? "Global default" : (cookServiceNameById.get(String(row.serviceId)) ?? `Service #${row.serviceId}`)),
            },
            { key: "familySize", header: "Family Size", render: (row) => `${row.familySizeLabel} (${row.familySize})` },
            { key: "price", header: "Per Visit Price", render: (row) => `Rs. ${row.pricePerVisit}` },
            {
              key: "active",
              header: "Status",
              render: (row) => <PricingStatusBadge active={row.active} />,
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => <PricingRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row)} />,
            },
          ]}
        />
      </DataState>

      <ModalFormLayout
        open={modalOpen}
        title={editing ? "Edit Cook Subscription Price" : "Create Cook Subscription Price"}
        formId="cook-subscription-pricing-form"
        submitLabel={editing ? "Update" : "Create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        maxWidthClassName="max-w-xl"
      >
        <form id="cook-subscription-pricing-form" onSubmit={submitForm} className="grid gap-4">
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Service</span>
            <select
              value={form.serviceId}
              onChange={(event) => setForm((prev) => ({ ...prev, serviceId: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              disabled={serviceOptionsQuery.isLoading}
            >
              <option value="">{serviceOptionsQuery.isLoading ? "Loading services..." : "Global default"}</option>
              {cookServiceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}{option.categoryName ? ` (${option.categoryName})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Family Size</span>
            <select
              value={form.familySize}
              onChange={(event) => setForm((prev) => ({ ...prev, familySize: event.target.value as CookFamilySize }))}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              {familySizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.hint}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Per Visit Price</span>
            <input
              type="number"
              min="1"
              value={form.pricePerVisit}
              onChange={(event) => setForm((prev) => ({ ...prev, pricePerVisit: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <PricingActiveField checked={form.active} onChange={(active) => setForm((prev) => ({ ...prev, active }))} />
        </form>
      </ModalFormLayout>

      <PricingDeactivateDialog
        open={Boolean(deleteTarget)}
        title="Deactivate Cook Subscription Price"
        description={`Deactivate ${deleteTarget?.familySizeLabel ?? ""} price for ${
          deleteTarget?.serviceId == null ? "global default" : `service #${deleteTarget?.serviceId}`
        }?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

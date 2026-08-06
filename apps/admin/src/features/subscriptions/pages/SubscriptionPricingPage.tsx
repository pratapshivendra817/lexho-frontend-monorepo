import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  createAdminSubscriptionPricing,
  deleteAdminSubscriptionPricing,
  getAdminSubscriptionPricing,
  updateAdminSubscriptionPricing,
} from "../api/subscriptionPricingApi";
import {
  buildOptionalServiceId,
  PricingActiveField,
  PricingDeactivateDialog,
  PricingPageHeader,
  PricingRowActions,
  PricingStatusBadge,
} from "../components/pricingPageShared";
import type { AdminSubscriptionPricing, AdminSubscriptionPricingPayload } from "../pricingTypes";

type PricingForm = {
  serviceId: string;
  durationHours: string;
  perVisitPrice: string;
  active: boolean;
};

const defaultForm: PricingForm = {
  serviceId: "",
  durationHours: "1",
  perVisitPrice: "",
  active: true,
};

function toForm(row: AdminSubscriptionPricing): PricingForm {
  return {
    serviceId: row.serviceId == null ? "" : String(row.serviceId),
    durationHours: String(row.durationHours),
    perVisitPrice: String(row.perVisitPrice),
    active: row.active,
  };
}

function toPayload(form: PricingForm): AdminSubscriptionPricingPayload {
  return {
    serviceId: buildOptionalServiceId(form.serviceId),
    durationHours: Number(form.durationHours),
    perVisitPrice: Number(form.perVisitPrice),
    active: form.active,
  };
}

function validatePayload(payload: AdminSubscriptionPricingPayload) {
  if (!Number.isFinite(payload.durationHours) || payload.durationHours <= 0) return "Duration is required";
  if (!Number.isFinite(payload.perVisitPrice) || payload.perVisitPrice <= 0) return "Per visit price is required";
  return "";
}

export default function SubscriptionPricingPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubscriptionPricing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSubscriptionPricing | null>(null);
  const [form, setForm] = useState<PricingForm>(defaultForm);

  const pricingQuery = useQuery({
    queryKey: ["admin-subscription-pricing"],
    queryFn: getAdminSubscriptionPricing,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createAdminSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Subscription price created");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create subscription price")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminSubscriptionPricingPayload }) =>
      updateAdminSubscriptionPricing(id, payload),
    onSuccess: async () => {
      toast.success("Subscription price updated");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update subscription price")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Subscription price deactivated");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to deactivate subscription price")),
  });

  const rows = useMemo(() => pricingQuery.data ?? [], [pricingQuery.data]);

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

  const openEdit = (row: AdminSubscriptionPricing) => {
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
        title="Subscription Pricing"
        description="Manage global and service-specific duration prices."
        addLabel="+ Add Price"
        onAdd={openCreate}
      />

      <DataState
        isLoading={pricingQuery.isLoading}
        isError={pricingQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading subscription pricing..."
        errorText="Failed to load subscription pricing"
        emptyText="No subscription pricing found"
        onRetry={() => void pricingQuery.refetch()}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "scope", header: "Scope", render: (row) => (row.serviceId == null ? "Global default" : `Service #${row.serviceId}`) },
            { key: "duration", header: "Duration", render: (row) => `${row.durationHours} hr` },
            { key: "price", header: "Per Visit Price", render: (row) => `Rs. ${row.perVisitPrice}` },
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
        title={editing ? "Edit Subscription Price" : "Create Subscription Price"}
        formId="subscription-pricing-form"
        submitLabel={editing ? "Update" : "Create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        maxWidthClassName="max-w-xl"
      >
        <form id="subscription-pricing-form" onSubmit={submitForm} className="grid gap-4">
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Service ID</span>
            <input
              value={form.serviceId}
              onChange={(event) => setForm((prev) => ({ ...prev, serviceId: event.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="Blank for global default"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Duration Hours</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={form.durationHours}
              onChange={(event) => setForm((prev) => ({ ...prev, durationHours: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Per Visit Price</span>
            <input
              type="number"
              min="1"
              value={form.perVisitPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, perVisitPrice: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <PricingActiveField checked={form.active} onChange={(active) => setForm((prev) => ({ ...prev, active }))} />
        </form>
      </ModalFormLayout>

      <PricingDeactivateDialog
        open={Boolean(deleteTarget)}
        title="Deactivate Subscription Price"
        description={`Deactivate ${deleteTarget?.durationHours ?? ""} hr price for ${
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

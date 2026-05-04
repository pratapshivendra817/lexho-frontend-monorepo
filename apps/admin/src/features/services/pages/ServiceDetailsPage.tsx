import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { DataState, ModalFormLayout } from "@/components/admin";
import { addServiceDetails, deleteServiceDetail, getServiceById, updateServiceDetail } from "@/services/lexhoAdminApi";
import type { ServiceDetailItem, ServiceDetailType } from "@/types/adminCatalog";

type ItemModalState = {
  open: boolean;
  mode: "create" | "edit";
  type: ServiceDetailType;
  detail: ServiceDetailItem | null;
  value: string;
};

const defaultModalState: ItemModalState = {
  open: false,
  mode: "create",
  type: "INCLUDED",
  detail: null,
  value: "",
};

export default function ServiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ItemModalState>(defaultModalState);

  const serviceQuery = useQuery({
    queryKey: ["service-details", id],
    queryFn: () => (id ? getServiceById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: (payload: { type: ServiceDetailType; itemName: string }) => {
      if (!id) throw new Error("Service id missing");
      return addServiceDetails(id, { type: payload.type, items: [payload.itemName] });
    },
    onSuccess: async () => {
      toast.success("Detail added");
      setModal(defaultModalState);
      await queryClient.invalidateQueries({ queryKey: ["service-details", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: () => toast.error("Unable to add detail"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { detailId: string; type: ServiceDetailType; itemName: string }) => {
      if (!id) throw new Error("Service id missing");
      return updateServiceDetail(id, payload.detailId, { type: payload.type, itemName: payload.itemName });
    },
    onSuccess: async () => {
      toast.success("Detail updated");
      setModal(defaultModalState);
      await queryClient.invalidateQueries({ queryKey: ["service-details", id] });
    },
    onError: () => toast.error("Unable to update detail"),
  });

  const deleteMutation = useMutation({
    mutationFn: (detailId: string) => {
      if (!id) throw new Error("Service id missing");
      return deleteServiceDetail(id, detailId);
    },
    onSuccess: async () => {
      toast.success("Detail deleted");
      await queryClient.invalidateQueries({ queryKey: ["service-details", id] });
    },
    onError: () => toast.error("Unable to delete detail"),
  });

  const service = serviceQuery.data;
  const includedItems = useMemo(() => (service?.details ?? []).filter((row) => row.type === "INCLUDED"), [service?.details]);
  const excludedItems = useMemo(() => (service?.details ?? []).filter((row) => row.type === "EXCLUDED"), [service?.details]);

  const openCreateModal = (type: ServiceDetailType) => {
    setModal({ open: true, mode: "create", type, detail: null, value: "" });
  };

  const openEditModal = (detail: ServiceDetailItem) => {
    setModal({ open: true, mode: "edit", type: detail.type, detail, value: detail.itemName });
  };

  const submitModal = () => {
    const value = modal.value.trim();
    if (!value) {
      toast.error("Item text cannot be empty");
      return;
    }
    if (modal.mode === "edit" && modal.detail) {
      updateMutation.mutate({ detailId: modal.detail.id, type: modal.type, itemName: value });
      return;
    }
    addMutation.mutate({ type: modal.type, itemName: value });
  };

  const renderSection = (title: string, icon: string, toneClass: string, type: ServiceDetailType, rows: ServiceDetailItem[]) => (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
          <span className={toneClass}>{icon}</span> {title}
        </h3>
        <button type="button" onClick={() => openCreateModal(type)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs">
          Add Item
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No items available.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
              <span className="text-sm text-[var(--color-text)]">{row.itemName}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => openEditModal(row)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(row.id)}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => navigate("/services")} className="rounded border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-muted)]">
        Back to Services
      </button>

      <DataState
        isLoading={serviceQuery.isLoading}
        isError={serviceQuery.isError}
        isEmpty={!service}
        loadingText="Loading service details..."
        errorText="Failed to load service details"
        emptyText="Service not found"
        onRetry={() => void serviceQuery.refetch()}
      >
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">{service?.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{service?.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)]">
            <span>Type: {service?.serviceType || "-"}</span>
            <span>Price: INR {service?.price?.toFixed(2) ?? "0.00"}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {renderSection("Included Items", "✔", "text-emerald-300", "INCLUDED", includedItems)}
          {renderSection("Excluded Items", "✖", "text-red-300", "EXCLUDED", excludedItems)}
        </div>
      </DataState>

      <ModalFormLayout
        open={modal.open}
        onClose={() => setModal(defaultModalState)}
        title={modal.mode === "edit" ? "Update Detail" : "Add Detail"}
        submitLabel={modal.mode === "edit" ? "Update" : "Add"}
        formId="service-detail-form"
        isSubmitting={addMutation.isPending || updateMutation.isPending}
      >
        <form
          id="service-detail-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitModal();
          }}
          className="grid gap-3"
        >
          <label className="grid gap-1 text-sm">
            <span>Type</span>
            <select
              value={modal.type}
              onChange={(event) =>
                setModal((prev) => ({
                  ...prev,
                  type: event.target.value === "EXCLUDED" ? "EXCLUDED" : "INCLUDED",
                }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="INCLUDED">Included</option>
              <option value="EXCLUDED">Excluded</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Item</span>
            <input
              value={modal.value}
              onChange={(event) => setModal((prev) => ({ ...prev, value: event.target.value }))}
              placeholder="Enter item text"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
        </form>
      </ModalFormLayout>
    </div>
  );
}

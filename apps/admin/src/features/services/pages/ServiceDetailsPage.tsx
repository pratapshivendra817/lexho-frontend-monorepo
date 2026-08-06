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

const MAX_DETAIL_ITEM_LENGTH = 255;

const normalizeLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const toDetailItems = (type: ServiceDetailType, value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (type === "FAQ") {
    const flattened = trimmed.replace(/\s+/g, " ").trim();
    const questionSplit = flattened
      .split(/(?=\bQ?\d{1,2}[.)]\s*)/i)
      .map((item) => item.trim())
      .filter(Boolean);
    if (questionSplit.length > 1) return questionSplit;
    return normalizeLines(trimmed);
  }

  return normalizeLines(trimmed);
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
    mutationFn: (payload: { type: ServiceDetailType; itemNames: string[] }) => {
      if (!id) throw new Error("Service id missing");
      return addServiceDetails(id, { type: payload.type, items: payload.itemNames });
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
  const details = service?.details ?? [];
  const draftItems = useMemo(() => toDetailItems(modal.type, modal.value), [modal.type, modal.value]);
  const includedItems = useMemo(() => details.filter((row) => row.type === "INCLUDED"), [details]);
  const excludedItems = useMemo(() => details.filter((row) => row.type === "EXCLUDED"), [details]);
  const faqItems = useMemo(() => details.filter((row) => row.type === "FAQ"), [details]);
  const instructionItems = useMemo(() => details.filter((row) => row.type === "INSTRUCTION"), [details]);

  const openCreateModal = (type: ServiceDetailType) => {
    setModal({ open: true, mode: "create", type, detail: null, value: "" });
  };

  const openEditModal = (detail: ServiceDetailItem) => {
    setModal({ open: true, mode: "edit", type: detail.type, detail, value: detail.itemName });
  };

  const submitModal = () => {
    const items = draftItems;
    if (items.length === 0) {
      toast.error("Item text cannot be empty");
      return;
    }
    const overLimit = items.filter((item) => item.length > MAX_DETAIL_ITEM_LENGTH);
    if (overLimit.length > 0) {
      toast.error(`Each item must be 1-${MAX_DETAIL_ITEM_LENGTH} characters`);
      return;
    }
    if (modal.mode === "edit" && modal.detail) {
      updateMutation.mutate({ detailId: modal.detail.id, type: modal.type, itemName: items[0] });
      return;
    }
    addMutation.mutate({ type: modal.type, itemNames: items });
  };

  const renderSection = (title: string, type: ServiceDetailType, rows: ServiceDetailItem[]) => (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
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
          {renderSection("Included Items", "INCLUDED", includedItems)}
          {renderSection("Excluded Items", "EXCLUDED", excludedItems)}
          {renderSection("FAQs", "FAQ", faqItems)}
          {renderSection("Instructions", "INSTRUCTION", instructionItems)}
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
                  type: (event.target.value as ServiceDetailType) || "INCLUDED",
                }))
              }
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="INCLUDED">Included</option>
              <option value="EXCLUDED">Excluded</option>
              <option value="FAQ">FAQ</option>
              <option value="INSTRUCTION">Instruction</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Item{modal.type === "FAQ" ? "s" : ""}</span>
            <textarea
              value={modal.value}
              onChange={(event) => setModal((prev) => ({ ...prev, value: event.target.value }))}
              placeholder={modal.type === "FAQ" ? "Paste one or many FAQs (Q1, Q2...) or one per line" : "Enter one item per line"}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              rows={modal.type === "FAQ" ? 6 : 4}
            />
            <span className="text-xs text-[var(--color-muted)]">Each item must be 1-{MAX_DETAIL_ITEM_LENGTH} characters.</span>
          </label>
          {modal.mode === "create" && draftItems.length > 0 ? (
            <div className="grid gap-2 rounded-lg border border-[var(--color-border)] p-3">
              <p className="text-xs text-[var(--color-muted)]">Preview ({draftItems.length} item{draftItems.length > 1 ? "s" : ""})</p>
              <ul className="max-h-40 space-y-1 overflow-auto text-xs">
                {draftItems.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-text)]">
                    {index + 1}. {item}
                    <span className="ml-2 text-[var(--color-muted)]">({item.length}/{MAX_DETAIL_ITEM_LENGTH})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      </ModalFormLayout>
    </div>
  );
}

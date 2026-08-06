import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  createAdminCookFamilySize,
  deleteAdminCookFamilySize,
  getAdminCookFamilySizes,
  updateAdminCookFamilySize,
  updateAdminCookFamilySizeStatus,
} from "../api/cookFamilySizesApi";
import type { AdminCookFamilySize, AdminCookFamilySizePayload } from "../types";

type FormState = {
  familySize: string;
  familySizeLabel: string;
  active: boolean;
  displayOrder: string;
};

const defaultForm: FormState = {
  familySize: "SMALL",
  familySizeLabel: "",
  active: true,
  displayOrder: "1",
};

const familySizeOptions = ["SMALL", "MEDIUM", "LARGE", "XLARGE"];
const inputClass = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]";

function toForm(row: AdminCookFamilySize): FormState {
  return {
    familySize: row.familySize,
    familySizeLabel: row.familySizeLabel,
    active: row.active,
    displayOrder: String(row.displayOrder),
  };
}

function toPayload(form: FormState): AdminCookFamilySizePayload {
  return {
    familySize: form.familySize.trim().toUpperCase(),
    familySizeLabel: form.familySizeLabel.trim(),
    active: form.active,
    displayOrder: Number(form.displayOrder),
  };
}

function validate(payload: AdminCookFamilySizePayload) {
  if (!payload.familySize) return "Family size is required";
  if (!payload.familySizeLabel) return "Family size label is required";
  if (!Number.isFinite(payload.displayOrder) || payload.displayOrder < 1) return "Display order must be at least 1";
  return "";
}

export default function CookFamilySizesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCookFamilySize | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCookFamilySize | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const listQuery = useQuery({
    queryKey: ["admin-cook-family-sizes"],
    queryFn: getAdminCookFamilySizes,
    retry: false,
  });

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(defaultForm);
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-cook-family-sizes"] });
  };

  const createMutation = useMutation({
    mutationFn: createAdminCookFamilySize,
    onSuccess: async () => {
      toast.success("Cook family size created");
      closeModal();
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create cook family size")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCookFamilySizePayload }) => updateAdminCookFamilySize(id, payload),
    onSuccess: async () => {
      toast.success("Cook family size updated");
      closeModal();
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update cook family size")),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateAdminCookFamilySizeStatus(id, active),
    onSuccess: async () => {
      toast.success("Status updated");
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update status")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCookFamilySize,
    onSuccess: async () => {
      toast.success("Cook family size deactivated");
      setDeleteTarget(null);
      await invalidate();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete cook family size")),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm, displayOrder: String(rows.length + 1) });
    setModalOpen(true);
  };

  const openEdit = (row: AdminCookFamilySize) => {
    setEditing(row);
    setForm(toForm(row));
    setModalOpen(true);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload(form);
    const error = validate(payload);
    if (error) {
      toast.error(error);
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.familySizeId, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Cook Family Sizes</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage family-size variants used for Cook At Home pricing and cart variants.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          + Create Family Size
        </button>
      </div>

      <DataState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        isEmpty={!listQuery.isLoading && rows.length === 0}
        loadingText="Loading cook family sizes..."
        errorText="Failed to load cook family sizes"
        emptyText="No cook family sizes found"
        onRetry={() => void listQuery.refetch()}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.familySizeId)}
          columns={[
            { key: "id", header: "ID", render: (row) => row.familySizeId },
            { key: "code", header: "Family Size", render: (row) => row.familySize },
            { key: "label", header: "Label", render: (row) => row.familySizeLabel },
            { key: "order", header: "Display Order", render: (row) => row.displayOrder },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: row.familySizeId, active: !row.active })}
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${row.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                >
                  {row.active ? "Active" : "Inactive"}
                </button>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(row)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(row)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </DataState>

      <ModalFormLayout
        open={modalOpen}
        title={editing ? "Edit Cook Family Size" : "Create Cook Family Size"}
        onClose={closeModal}
        formId="cook-family-size-form"
        submitLabel={editing ? "Update" : "Create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <form id="cook-family-size-form" onSubmit={submit} className="grid gap-4">
          <label className="text-sm font-medium text-[var(--color-text)]">
            Family Size
            <select value={form.familySize} onChange={(event) => setForm((previous) => ({ ...previous, familySize: event.target.value }))} className={inputClass}>
              {familySizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-text)]">
            Family Size Label
            <input value={form.familySizeLabel} onChange={(event) => setForm((previous) => ({ ...previous, familySizeLabel: event.target.value }))} className={inputClass} placeholder="3-5 Members" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text)]">
            Display Order
            <input type="number" min={1} value={form.displayOrder} onChange={(event) => setForm((previous) => ({ ...previous, displayOrder: event.target.value }))} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((previous) => ({ ...previous, active: event.target.checked }))} className="h-4 w-4 accent-blue-600" />
            Active
          </label>
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete cook family size?"
        description="This will soft delete the family size by making it inactive."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget ? deleteMutation.mutate(deleteTarget.familySizeId) : undefined}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { useSectionsMutations, useSectionsQuery } from "../hooks/useSections";
import type { AdminSection, SectionItemPayload, SectionPayload, SectionType } from "../types";

const defaultSectionForm: SectionPayload = {
  type: "STATS",
  title: "",
  isActive: true,
};

type SectionEditState =
  | { open: false; row: null }
  | { open: true; row: AdminSection | null };

type ItemsState =
  | { open: false; sectionId: null }
  | { open: true; sectionId: number };

const sectionTypes: SectionType[] = ["STATS", "TRUST", "BANNERS", "CUSTOM"];

export default function SectionsPage() {
  const sectionsQuery = useSectionsQuery();
  const {
    createSectionMutation,
    updateSectionMutation,
    updateSectionStatusMutation,
    reorderSectionsMutation,
    addSectionItemsMutation,
  } = useSectionsMutations();

  const [editState, setEditState] = useState<SectionEditState>({ open: false, row: null });
  const [itemsState, setItemsState] = useState<ItemsState>({ open: false, sectionId: null });
  const [form, setForm] = useState<SectionPayload>(defaultSectionForm);
  const [itemRows, setItemRows] = useState<SectionItemPayload[]>([
    { title: "Users", value: "10K+", priority: 1, isActive: true },
  ]);
  const [priorityById, setPriorityById] = useState<Record<number, number>>({});

  const rows = sectionsQuery.data ?? [];

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (priorityById[a.id] ?? a.priority) - (priorityById[b.id] ?? b.priority)),
    [rows, priorityById],
  );

  const openCreate = () => {
    setForm(defaultSectionForm);
    setEditState({ open: true, row: null });
  };

  const openEdit = (row: AdminSection) => {
    setForm({
      type: row.type,
      title: row.title,
      isActive: row.isActive,
    });
    setEditState({ open: true, row });
  };

  const submitSection = () => {
    const payload: SectionPayload = {
      ...form,
      title: form.title.trim(),
    };
    if (!payload.title) {
      toast.error("Title is required");
      return;
    }

    if (editState.row) {
      updateSectionMutation.mutate(
        { id: editState.row.id, payload },
        {
          onSuccess: () => {
            toast.success("Section updated");
            setEditState({ open: false, row: null });
            setForm(defaultSectionForm);
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to update section")),
        },
      );
      return;
    }

    createSectionMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Section created");
        setEditState({ open: false, row: null });
        setForm(defaultSectionForm);
      },
      onError: (error) => toast.error(extractApiError(error, "Unable to create section")),
    });
  };

  const submitItems = () => {
    if (!itemsState.sectionId) return;
    const payload = itemRows.map((row, index) => ({
      title: row.title.trim(),
      value: row.value.trim(),
      priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : index + 1,
      isActive: row.isActive,
    }));
    const invalid = payload.findIndex((row) => !row.title || !row.value);
    if (invalid >= 0) {
      toast.error(`Title and value required for item #${invalid + 1}`);
      return;
    }

    addSectionItemsMutation.mutate(
      { id: itemsState.sectionId, items: payload },
      {
        onSuccess: () => {
          toast.success("Section items saved");
          setItemsState({ open: false, sectionId: null });
          setItemRows([{ title: "Users", value: "10K+", priority: 1, isActive: true }]);
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to save items")),
      },
    );
  };

  const saveReorder = () => {
    const payload = sortedRows.map((row, index) => ({
      id: row.id,
      priority: priorityById[row.id] ?? row.priority ?? index + 1,
    }));
    reorderSectionsMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Section order updated");
        setPriorityById({});
      },
      onError: (error) => toast.error(extractApiError(error, "Unable to reorder sections")),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Homepage Sections</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage sections, items, ordering and status</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveReorder}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
          >
            Save Reorder
          </button>
          <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            + Create Section
          </button>
        </div>
      </div>

      <DataState
        isLoading={sectionsQuery.isLoading}
        isError={sectionsQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading sections..."
        errorText="Failed to load sections"
        emptyText="No sections found"
        onRetry={() => void sectionsQuery.refetch()}
      >
        <DataTable
          rows={sortedRows}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "id", header: "ID", render: (row) => row.id },
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "title", header: "Title", render: (row) => row.title },
            {
              key: "priority",
              header: "Priority",
              render: (row) => (
                <input
                  type="number"
                  min={1}
                  value={priorityById[row.id] ?? row.priority}
                  onChange={(event) =>
                    setPriorityById((prev) => ({
                      ...prev,
                      [row.id]: Math.max(1, Number(event.target.value || row.priority)),
                    }))
                  }
                  className="w-20 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                />
              ),
            },
            { key: "items", header: "Items", render: (row) => row.itemsCount },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <span className={row.isActive ? "text-emerald-300" : "text-zinc-400"}>{row.isActive ? "ACTIVE" : "INACTIVE"}</span>
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
                  <button
                    type="button"
                    onClick={() => setItemsState({ open: true, sectionId: row.id })}
                    className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300"
                  >
                    Add Items
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSectionStatusMutation.mutate(
                        { id: row.id, isActive: !row.isActive },
                        {
                          onSuccess: () => toast.success(`Section ${row.isActive ? "deactivated" : "activated"}`),
                          onError: (error) => toast.error(extractApiError(error, "Unable to update status")),
                        },
                      )
                    }
                    className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300"
                  >
                    {row.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </DataState>

      <ModalFormLayout
        open={editState.open}
        onClose={() => setEditState({ open: false, row: null })}
        title={editState.row ? "Edit Section" : "Create Section"}
        formId="section-form"
        submitLabel={editState.row ? "Update" : "Create"}
        isSubmitting={createSectionMutation.isPending || updateSectionMutation.isPending}
      >
        <form
          id="section-form"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitSection();
          }}
        >
          <label className="grid gap-1 text-sm">
            <span>Type</span>
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as SectionType }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              {sectionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active
          </label>
        </form>
      </ModalFormLayout>

      <ModalFormLayout
        open={itemsState.open}
        onClose={() => setItemsState({ open: false, sectionId: null })}
        title="Add Section Items"
        formId="section-items-form"
        submitLabel="Save Items"
        isSubmitting={addSectionItemsMutation.isPending}
        maxWidthClassName="max-w-3xl"
      >
        <form
          id="section-items-form"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitItems();
          }}
        >
          {itemRows.map((row, index) => (
            <div key={`${index}-${row.priority}`} className="grid gap-2 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-5">
              <input
                value={row.title}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)))
                }
                placeholder="Title"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
              />
              <input
                value={row.value}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))
                }
                placeholder="Value"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
              />
              <input
                type="number"
                min={1}
                value={row.priority}
                onChange={(event) =>
                  setItemRows((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, priority: Math.max(1, Number(event.target.value || 1)) } : item)),
                  )
                }
                placeholder="Priority"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(event) =>
                      setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, isActive: event.target.checked } : item)))
                    }
                  />
                  Active
                </label>
                <button
                  type="button"
                  disabled={itemRows.length <= 1}
                  onClick={() => setItemRows((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setItemRows((prev) => [
                ...prev,
                { title: "", value: "", priority: prev.length + 1, isActive: true },
              ])
            }
            className="justify-self-start rounded border border-[var(--color-border)] px-3 py-1 text-xs"
          >
            + Add Item Row
          </button>
        </form>
      </ModalFormLayout>
    </div>
  );
}

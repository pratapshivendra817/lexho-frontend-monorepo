import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { useSectionsMutations, useSectionsQuery } from "../hooks/useSections";
import type { AdminSection, SectionItemPayload, SectionPayload, SectionType } from "../types";

type SectionFormState = SectionPayload;
type SectionItemFormRow = SectionItemPayload & { id?: number };

const defaultSectionForm: SectionFormState = {
  type: "STATS",
  title: "",
  subtitle: "",
  icon: "",
  color: "",
  borderColor: "",
  backgroundColor: "",
  iconColor: "",
  priority: 1,
  isActive: true,
};

const defaultItemRow: SectionItemFormRow = {
  title: "",
  subtitle: "",
  value: "",
  icon: "",
  color: "",
  borderColor: "",
  backgroundColor: "",
  iconColor: "",
  priority: 1,
  isActive: true,
};

type SectionEditState =
  | { open: false; row: null }
  | { open: true; row: AdminSection | null };

type ItemsState =
  | { open: false; section: null }
  | { open: true; section: AdminSection };

const sectionTypes: SectionType[] = ["STATS", "TRUST", "TAGLINE", "HIGHLIGHTS"];

const cleanText = (value?: string | null) => String(value ?? "").trim();

function toSectionPayload(form: SectionFormState): SectionPayload {
  return {
    type: form.type,
    title: cleanText(form.title) || null,
    subtitle: cleanText(form.subtitle) || null,
    icon: cleanText(form.icon) || null,
    color: cleanText(form.color) || null,
    borderColor: cleanText(form.borderColor) || null,
    backgroundColor: cleanText(form.backgroundColor) || null,
    iconColor: cleanText(form.iconColor) || null,
    priority: Number.isFinite(Number(form.priority)) ? Math.max(1, Number(form.priority)) : 1,
    isActive: Boolean(form.isActive),
  };
}

function toItemPayload(row: SectionItemFormRow, fallbackPriority: number): SectionItemPayload {
  return {
    title: cleanText(row.title),
    subtitle: cleanText(row.subtitle) || null,
    value: cleanText(row.value) || null,
    icon: cleanText(row.icon),
    color: cleanText(row.color) || null,
    borderColor: cleanText(row.borderColor) || null,
    backgroundColor: cleanText(row.backgroundColor) || null,
    iconColor: cleanText(row.iconColor) || null,
    priority: Number.isFinite(Number(row.priority)) ? Math.max(1, Number(row.priority)) : fallbackPriority,
    isActive: Boolean(row.isActive),
  };
}

export default function SectionsPage() {
  const sectionsQuery = useSectionsQuery();
  const {
    createSectionMutation,
    updateSectionMutation,
    updateSectionStatusMutation,
    reorderSectionsMutation,
    addSectionItemsMutation,
    updateSectionItemMutation,
    updateSectionItemStatusMutation,
    deleteSectionItemMutation,
    reorderSectionItemsMutation,
  } = useSectionsMutations();

  const [editState, setEditState] = useState<SectionEditState>({ open: false, row: null });
  const [itemsState, setItemsState] = useState<ItemsState>({ open: false, section: null });
  const [form, setForm] = useState<SectionFormState>(defaultSectionForm);
  const [itemRows, setItemRows] = useState<SectionItemFormRow[]>([{ ...defaultItemRow }]);
  const [priorityById, setPriorityById] = useState<Record<number, number>>({});

  const rows = sectionsQuery.data ?? [];
  const displayRows = useMemo(
    () => [...rows].sort((a, b) => (priorityById[a.id] ?? a.priority) - (priorityById[b.id] ?? b.priority)),
    [rows, priorityById],
  );

  const itemMutationPending =
    addSectionItemsMutation.isPending ||
    updateSectionItemMutation.isPending ||
    updateSectionItemStatusMutation.isPending ||
    deleteSectionItemMutation.isPending ||
    reorderSectionItemsMutation.isPending;

  const openCreate = () => {
    setForm(defaultSectionForm);
    setEditState({ open: true, row: null });
  };

  const openEdit = (row: AdminSection) => {
    setForm({
      type: row.type,
      title: row.title ?? "",
      subtitle: row.subtitle ?? "",
      icon: row.icon ?? "",
      color: row.color ?? "",
      borderColor: row.borderColor ?? "",
      backgroundColor: row.backgroundColor ?? "",
      iconColor: row.iconColor ?? "",
      priority: row.priority,
      isActive: row.active,
    });
    setEditState({ open: true, row });
  };

  const openItems = (section: AdminSection) => {
    const rowsFromApi = section.items.length
      ? section.items.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle ?? "",
          value: item.value ?? "",
          icon: item.icon ?? "",
          color: item.color ?? "",
          borderColor: item.borderColor ?? "",
          backgroundColor: item.backgroundColor ?? "",
          iconColor: item.iconColor ?? "",
          priority: item.priority,
          isActive: item.active,
        }))
      : [{ ...defaultItemRow }];
    setItemRows(rowsFromApi);
    setItemsState({ open: true, section });
  };

  const submitSection = () => {
    const payload = toSectionPayload(form);
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

  const submitItems = async () => {
    if (!itemsState.section) return;
    const payloadRows = itemRows.map((row, index) => ({
      id: row.id,
      payload: toItemPayload(row, index + 1),
    }));
    const invalid = payloadRows.findIndex((row) => !row.payload.title);
    if (invalid >= 0) {
      toast.error(`Title required for item #${invalid + 1}`);
      return;
    }

    try {
      const existingRows = payloadRows.filter((row) => row.id);
      const newRows = payloadRows.filter((row) => !row.id).map((row) => row.payload);

      await Promise.all(
        existingRows.map((row) =>
          updateSectionItemMutation.mutateAsync({
            sectionId: itemsState.section.id,
            itemId: Number(row.id),
            payload: row.payload,
          }),
        ),
      );
      if (newRows.length > 0) {
        await addSectionItemsMutation.mutateAsync({ id: itemsState.section.id, items: newRows });
      }
      const reorderPayload = payloadRows
        .filter((row) => row.id)
        .map((row) => ({ id: Number(row.id), priority: row.payload.priority }));
      if (reorderPayload.length > 0) {
        await reorderSectionItemsMutation.mutateAsync({ sectionId: itemsState.section.id, rows: reorderPayload });
      }
      toast.success("Section items saved");
      setItemsState({ open: false, section: null });
      setItemRows([{ ...defaultItemRow }]);
    } catch (error) {
      toast.error(extractApiError(error, "Unable to save items"));
    }
  };

  const saveReorder = () => {
    const payload = displayRows.map((row, index) => ({
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

  const deleteItem = (row: SectionItemFormRow, index: number) => {
    if (!itemsState.section) return;
    if (!row.id) {
      setItemRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    deleteSectionItemMutation.mutate(
      { sectionId: itemsState.section.id, itemId: row.id },
      {
        onSuccess: () => {
          toast.success("Item deleted");
          setItemRows((prev) => prev.filter((_, i) => i !== index));
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to delete item")),
      },
    );
  };

  const toggleItemStatus = (row: SectionItemFormRow, index: number) => {
    if (!itemsState.section || !row.id) {
      setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, isActive: !item.isActive } : item)));
      return;
    }
    const nextActive = !row.isActive;
    updateSectionItemStatusMutation.mutate(
      { sectionId: itemsState.section.id, itemId: row.id, isActive: nextActive },
      {
        onSuccess: () => {
          toast.success(`Item ${nextActive ? "activated" : "deactivated"}`);
          setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, isActive: nextActive } : item)));
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to update item status")),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Homepage Sections</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage active customer app home sections and items</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={saveReorder} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">
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
          rows={displayRows}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "id", header: "ID", render: (row) => row.id },
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "title", header: "Title", render: (row) => row.title ?? "-" },
            { key: "subtitle", header: "Subtitle", render: (row) => row.subtitle ?? "-" },
            { key: "icon", header: "Icon", render: (row) => row.icon ?? "-" },
            { key: "color", header: "Color", render: (row) => row.color ?? "-" },
            { key: "borderColor", header: "Border", render: (row) => row.borderColor ?? "-" },
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
            { key: "items", header: "Items", render: (row) => row.items.length },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <span className={row.active ? "text-emerald-300" : "text-zinc-400"}>{row.active ? "ACTIVE" : "INACTIVE"}</span>
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
                    onClick={() => openItems(row)}
                    className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300"
                  >
                    Manage Items
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSectionStatusMutation.mutate(
                        { id: row.id, isActive: !row.active },
                        {
                          onSuccess: () => toast.success(`Section ${row.active ? "deactivated" : "activated"}`),
                          onError: (error) => toast.error(extractApiError(error, "Unable to update status")),
                        },
                      )
                    }
                    className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300"
                  >
                    {row.active ? "Deactivate" : "Activate"}
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
          className="grid gap-3 md:grid-cols-2"
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
            <span>Priority</span>
            <input
              type="number"
              min={1}
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: Math.max(1, Number(event.target.value || 1)) }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Title</span>
            <input
              value={form.title ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Subtitle</span>
            <input
              value={form.subtitle ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Icon</span>
            <input
              value={form.icon ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
              placeholder="shield"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Text Color</span>
            <input
              value={form.color ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
              placeholder="#0F172A"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Border Color</span>
            <input
              value={form.borderColor ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, borderColor: event.target.value }))}
              placeholder="#E0A94B"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Background Color</span>
            <input
              value={form.backgroundColor ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, backgroundColor: event.target.value }))}
              placeholder="#FFFFFF"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Icon Color</span>
            <input
              value={form.iconColor ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, iconColor: event.target.value }))}
              placeholder="#D9A441"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="inline-flex items-center gap-2 self-end text-sm text-[var(--color-text)]">
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
        onClose={() => setItemsState({ open: false, section: null })}
        title={itemsState.section ? `Manage Items: ${itemsState.section.title ?? itemsState.section.type}` : "Manage Items"}
        formId="section-items-form"
        submitLabel="Save Items"
        isSubmitting={itemMutationPending}
        maxWidthClassName="max-w-5xl"
      >
        <form
          id="section-items-form"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitItems();
          }}
        >
          {itemRows.map((row, index) => (
            <div key={`${row.id ?? "new"}-${index}`} className="grid gap-2 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-12">
              <input
                value={row.title}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)))
                }
                placeholder="Title"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-3"
              />
              <input
                value={row.subtitle ?? ""}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, subtitle: event.target.value } : item)))
                }
                placeholder="Subtitle"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-3"
              />
              <input
                value={row.value ?? ""}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))
                }
                placeholder="Value"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
              />
              <input
                value={row.icon}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, icon: event.target.value } : item)))
                }
                placeholder="Icon"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-1"
              />
              <input
                value={row.color ?? ""}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, color: event.target.value } : item)))
                }
                placeholder="Text #"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
              />
              <input
                value={row.borderColor ?? ""}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, borderColor: event.target.value } : item)))
                }
                placeholder="Border #"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
              />
              <input
                value={row.backgroundColor ?? ""}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, backgroundColor: event.target.value } : item)))
                }
                placeholder="Bg #"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
              />
              <input
                value={row.iconColor ?? ""}
                onChange={(event) =>
                  setItemRows((prev) => prev.map((item, i) => (i === index ? { ...item, iconColor: event.target.value } : item)))
                }
                placeholder="Icon #"
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-2"
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
                className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs md:col-span-1"
              />
              <div className="flex items-center justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => toggleItemStatus(row, index)}
                  className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300"
                >
                  {row.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  type="button"
                  disabled={itemRows.length <= 1 && !row.id}
                  onClick={() => deleteItem(row, index)}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setItemRows((prev) => [
                ...prev,
                { ...defaultItemRow, priority: prev.length + 1 },
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

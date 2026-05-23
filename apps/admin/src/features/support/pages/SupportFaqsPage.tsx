import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  createSupportFaqCategory,
  createSupportFaqItem,
  deleteSupportFaqCategory,
  deleteSupportFaqItem,
  fetchSupportFaqCategories,
  fetchSupportFaqItems,
  updateSupportFaqCategory,
  updateSupportFaqItem,
  type SupportFaqCategoryPayload,
  type SupportFaqItemPayload,
} from "@/api/admin";

const DEFAULT_SUPPORT_CATEGORIES: SupportFaqCategoryPayload[] = [
  { id: "frequently-asked", label: "Frequently Asked", displayOrder: 1, active: true },
  { id: "booking", label: "Booking", displayOrder: 2, active: true },
  { id: "account", label: "Account", displayOrder: 3, active: true },
  { id: "payments", label: "Payments", displayOrder: 4, active: true },
  { id: "safety", label: "Safety", displayOrder: 5, active: true },
];

export default function SupportFaqsPage() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categoryForm, setCategoryForm] = useState<SupportFaqCategoryPayload>({
    id: "",
    label: "",
    displayOrder: 1,
    active: true,
  });
  const [faqForm, setFaqForm] = useState<SupportFaqItemPayload>({
    id: "",
    question: "",
    answer: "",
    displayOrder: 1,
    active: true,
  });

  const categoriesQuery = useQuery({
    queryKey: ["support-faq-categories-admin"],
    queryFn: fetchSupportFaqCategories,
  });

  const faqItemsQuery = useQuery({
    queryKey: ["support-faq-items-admin", selectedCategoryId],
    queryFn: () => fetchSupportFaqItems(selectedCategoryId),
    enabled: !!selectedCategoryId,
  });

  const categories = useMemo(
    () => (Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []),
    [categoriesQuery.data],
  );

  const faqItems = useMemo(
    () => (Array.isArray(faqItemsQuery.data) ? faqItemsQuery.data : []),
    [faqItemsQuery.data],
  );
  const categoryIds = useMemo(() => new Set(categories.map((item) => item.id)), [categories]);
  const missingDefaultCategories = useMemo(
    () => DEFAULT_SUPPORT_CATEGORIES.filter((item) => !categoryIds.has(item.id)),
    [categoryIds],
  );

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["support-faq-categories-admin"] });
    if (selectedCategoryId) {
      await queryClient.invalidateQueries({ queryKey: ["support-faq-items-admin", selectedCategoryId] });
    }
  };

  const categoryCreateMutation = useMutation({
    mutationFn: createSupportFaqCategory,
    onSuccess: async () => {
      toast.success("Category created");
      setCategoryForm({ id: "", label: "", displayOrder: 1, active: true });
      await refreshAll();
    },
    onError: () => toast.error("Failed to create category"),
  });

  const categoryUpdateMutation = useMutation({
    mutationFn: async (payload: SupportFaqCategoryPayload) => updateSupportFaqCategory(payload.id, payload),
    onSuccess: async () => {
      toast.success("Category updated");
      await refreshAll();
    },
    onError: () => toast.error("Failed to update category"),
  });

  const categoryDeleteMutation = useMutation({
    mutationFn: deleteSupportFaqCategory,
    onSuccess: async (_, id) => {
      toast.success("Category deleted");
      if (selectedCategoryId === id) setSelectedCategoryId("");
      await refreshAll();
    },
    onError: () => toast.error("Failed to delete category"),
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      for (const item of missingDefaultCategories) {
        await createSupportFaqCategory(item);
      }
    },
    onSuccess: async () => {
      toast.success("Default categories added");
      await refreshAll();
    },
    onError: () => toast.error("Failed to add default categories"),
  });

  const faqCreateMutation = useMutation({
    mutationFn: async (payload: SupportFaqItemPayload) => createSupportFaqItem(selectedCategoryId, payload),
    onSuccess: async () => {
      toast.success("FAQ created");
      setFaqForm({ id: "", question: "", answer: "", displayOrder: 1, active: true });
      await refreshAll();
    },
    onError: () => toast.error("Failed to create FAQ"),
  });

  const faqUpdateMutation = useMutation({
    mutationFn: async (payload: SupportFaqItemPayload) => updateSupportFaqItem(selectedCategoryId, payload.id, payload),
    onSuccess: async () => {
      toast.success("FAQ updated");
      await refreshAll();
    },
    onError: () => toast.error("Failed to update FAQ"),
  });

  const faqDeleteMutation = useMutation({
    mutationFn: (faqId: string) => deleteSupportFaqItem(selectedCategoryId, faqId),
    onSuccess: async () => {
      toast.success("FAQ deleted");
      await refreshAll();
    },
    onError: () => toast.error("Failed to delete FAQ"),
  });

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold">Support FAQs</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 font-semibold">Category CRUD</h3>
          <div className="grid gap-2">
            <input className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="Category ID (payments)" value={categoryForm.id} onChange={(e) => setCategoryForm((p) => ({ ...p, id: e.target.value }))} />
            <input className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="Label" value={categoryForm.label} onChange={(e) => setCategoryForm((p) => ({ ...p, label: e.target.value }))} />
            <input className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="Display Order" type="number" value={categoryForm.displayOrder ?? 1} onChange={(e) => setCategoryForm((p) => ({ ...p, displayOrder: Number(e.target.value) || 1 }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!categoryForm.active} onChange={(e) => setCategoryForm((p) => ({ ...p, active: e.target.checked }))} />
              Active
            </label>
            <div className="flex gap-2">
              <button type="button" className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[var(--color-text)]" onClick={() => categoryCreateMutation.mutate(categoryForm)}>
                Create
              </button>
              <button type="button" className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[var(--color-text)]" onClick={() => categoryUpdateMutation.mutate(categoryForm)}>
                Update
              </button>
              <button type="button" className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[var(--color-text)]" onClick={() => categoryDeleteMutation.mutate(categoryForm.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 font-semibold">Categories</h3>
          {missingDefaultCategories.length > 0 ? (
            <div className="mb-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-2 text-sm text-[var(--color-text)]">
              Missing defaults: {missingDefaultCategories.map((item) => item.label).join(", ")}
              <button
                type="button"
                className="ml-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium text-[var(--color-text)]"
                onClick={() => seedDefaultsMutation.mutate()}
              >
                Add Missing Defaults
              </button>
            </div>
          ) : null}
          <div className="space-y-2">
            {categoriesQuery.isLoading ? <div className="text-sm text-[var(--color-muted)]">Loading...</div> : null}
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-[var(--color-text)] ${selectedCategoryId === cat.id ? "border-[var(--color-accent)] bg-[var(--color-surface-hover)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}
              >
                <div className="font-medium">{cat.label}</div>
                <div className="text-xs text-[var(--color-muted)]">id: {cat.id} | order: {cat.displayOrder ?? "-"}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-3 font-semibold">FAQ CRUD {selectedCategoryId ? `(${selectedCategoryId})` : ""}</h3>
        {!selectedCategoryId ? (
          <div className="text-sm text-[var(--color-muted)]">Select a category first.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <input className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="FAQ ID (refund-pending)" value={faqForm.id} onChange={(e) => setFaqForm((p) => ({ ...p, id: e.target.value }))} />
              <input className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="Question" value={faqForm.question} onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))} />
              <textarea className="min-h-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="Answer" value={faqForm.answer} onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))} />
              <input className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]" placeholder="Display Order" type="number" value={faqForm.displayOrder ?? 1} onChange={(e) => setFaqForm((p) => ({ ...p, displayOrder: Number(e.target.value) || 1 }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!faqForm.active} onChange={(e) => setFaqForm((p) => ({ ...p, active: e.target.checked }))} />
                Active
              </label>
              <div className="flex gap-2">
                <button type="button" className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[var(--color-text)]" onClick={() => faqCreateMutation.mutate(faqForm)}>
                  Create
                </button>
                <button type="button" className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[var(--color-text)]" onClick={() => faqUpdateMutation.mutate(faqForm)}>
                  Update
                </button>
                <button type="button" className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[var(--color-text)]" onClick={() => faqDeleteMutation.mutate(faqForm.id)}>
                  Delete
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {faqItemsQuery.isLoading ? <div className="text-sm text-[var(--color-muted)]">Loading FAQs...</div> : null}
              {faqItems.map((faq) => (
                <button
                  key={faq.id}
                  type="button"
                  onClick={() => setFaqForm({ ...faq })}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 text-left"
                >
                  <div className="font-medium">{faq.question}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{faq.answer}</div>
                  <div className="mt-1 text-xs text-[var(--color-muted)]">id: {faq.id} | order: {faq.displayOrder ?? "-"}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

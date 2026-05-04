import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import {
  ConfirmDialog,
  DataState,
  DataTable,
  ImageUrlInput,
  ModalFormLayout,
  Pagination,
} from "@/components/admin";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  updateCategoryStatus,
} from "@/services/lexhoAdminApi";
import type { CategoryItem } from "@/types/adminCatalog";
import { extractApiError } from "@/utils/apiError";

const categorySchema = z.object({
  name: z.string().min(2, "Name should be at least 2 characters"),
  iconUrl: z.string().url("Upload image is required"),
  active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const defaultValues: CategoryFormValues = {
  name: "",
  iconUrl: "",
  active: true,
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", { page, search }],
    queryFn: () => getCategories({ page, limit: 10, search: search || undefined }),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      toast.success("Category created");
      setIsModalOpen(false);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create category")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryFormValues }) =>
      updateCategory(id, payload),
    onSuccess: async () => {
      toast.success("Category updated");
      setIsModalOpen(false);
      setEditingItem(null);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update category")),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateCategoryStatus(id, active),
    onSuccess: async () => {
      toast.success("Category status updated");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Unable to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      toast.success("Category deleted");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Unable to delete category"),
  });

  const items = categoriesQuery.data?.items ?? [];
  const total = categoriesQuery.data?.total ?? 0;

  const headerCount = useMemo(() => `${total} categories`, [total]);

  const openCreateModal = () => {
    setEditingItem(null);
    form.reset(defaultValues);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CategoryItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      iconUrl: item.iconUrl,
      active: item.active,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: CategoryFormValues) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload: values });
      return;
    }

    createMutation.mutate(values);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Category Management</h2>
          <p className="text-sm text-[var(--color-muted)]">{headerCount}</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Add Category
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search categories"
          className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <DataState
        isLoading={categoriesQuery.isLoading}
        isError={categoriesQuery.isError}
        isEmpty={items.length === 0}
        loadingText="Loading categories..."
        errorText="Failed to load categories"
        emptyText="No categories found"
        onRetry={() => {
          void categoriesQuery.refetch();
        }}
      >
        <DataTable
          rows={items}
          rowKey={(item) => item.id}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (item) => item.name,
            },
            {
              key: "icon",
              header: "Icon",
              render: (item) =>
                item.iconUrl ? (
                  <img src={item.iconUrl} alt={item.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <span className="text-xs text-[var(--color-muted)]">N/A</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <button
                  type="button"
                  onClick={() => toggleStatusMutation.mutate({ id: item.id, active: !item.active })}
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    item.active
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-gray-600/30 text-gray-200"
                  }`}
                >
                  {item.active ? "Active" : "Inactive"}
                </button>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />

        <Pagination page={page} total={total} limit={10} onPageChange={setPage} />
      </DataState>

      <ModalFormLayout
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          form.reset(defaultValues);
        }}
        title={editingItem ? "Edit Category" : "Create Category"}
        formId="category-form"
        submitLabel={editingItem ? "Update" : "Create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        maxWidthClassName="max-w-xl"
      >
        <form id="category-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <label className="grid gap-1 text-sm text-[var(--color-text)]">
            <span>Name</span>
            <input
              {...form.register("name")}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            {form.formState.errors.name ? (
              <span className="text-xs text-red-300">{form.formState.errors.name.message}</span>
            ) : null}
          </label>

          <ImageUrlInput
            value={form.watch("iconUrl")}
            onChange={(value) => form.setValue("iconUrl", value, { shouldValidate: true })}
            label="Icon Image"
          />
          {form.formState.errors.iconUrl ? (
            <span className="text-xs text-red-300">{form.formState.errors.iconUrl.message}</span>
          ) : null}

          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" {...form.register("active")} />
            Active
          </label>
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Category"
        description={`Are you sure you want to delete ${deleteTarget?.name ?? "this category"}?`}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}

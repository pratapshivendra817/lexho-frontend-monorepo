import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout, Pagination } from "@/components/admin";
import { createService, deleteService, getCategories, getServices, toggleServiceStatus, updateService, uploadAdminImage } from "@/services/lexhoAdminApi";
import type { ServiceItem, ServicePayload } from "@/types/adminCatalog";
import { createPopularService, getCategoryOptions, getPopularServicesByCategory } from "@/features/popular-services/api/popularServicesApi";
import { extractApiError } from "@/utils/apiError";
import PopularServicesPage from "../../popular-services/pages/PopularServicesPage";

const serviceSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(5, "Description is required"),
  price: z.number().positive("Price must be positive"),
  rating: z.number().min(0, "Rating cannot be negative").max(5, "Rating cannot be more than 5").optional(),
  categoryId: z.string().min(1, "Category is required"),
  service_type: z.string().min(1, "Service type is required"),
  imageUrl: z.string().trim().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;
type ServicesMode = "services" | "popular-services";

const defaultValues: ServiceFormValues = {
  name: "",
  description: "",
  price: 0,
  rating: 0,
  categoryId: "",
  service_type: "",
  imageUrl: "",
};

export default function ServicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<ServicesMode>("services");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [markAsPopular, setMarkAsPopular] = useState(false);
  const [popularCategoryId, setPopularCategoryId] = useState("");
  const [popularPriority, setPopularPriority] = useState(1);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues,
  });

  const servicesQuery = useQuery({
    queryKey: ["admin-services", { page, search, status, sort }],
    queryFn: () =>
      getServices({
        page,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
        sort: sort || undefined,
      }),
    retry: false,
  });

  const popularCategoriesQuery = useQuery({
    queryKey: ["popular-service-categories"],
    queryFn: getCategoryOptions,
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["admin-service-categories"],
    queryFn: async () => {
      const res = await getCategories({ page: 1, limit: 200 });
      return res.items;
    },
    retry: false,
  });

  const serviceTypes = useMemo(() => {
    const fromList = new Set((servicesQuery.data?.items ?? []).map((item) => item.serviceType).filter(Boolean));
    if (editingItem?.serviceType) fromList.add(editingItem.serviceType);
    return Array.from(fromList);
  }, [editingItem?.serviceType, servicesQuery.data?.items]);

  const createMutation = useMutation({
    mutationFn: createService,
    onError: () => toast.error("Unable to create service"),
  });

  const imageUploadMutation = useMutation({
    mutationFn: (file: File) => uploadAdminImage(file),
    onSuccess: (url) => {
      form.setValue("imageUrl", url, { shouldDirty: true });
      toast.success("Service image uploaded");
    },
    onError: () => toast.error("Unable to upload service image"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServicePayload }) => updateService(id, payload),
    onError: () => toast.error("Unable to update service"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleServiceStatus(id),
    onSuccess: async () => {
      toast.success("Service status updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: () => toast.error("Unable to toggle status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: async () => {
      toast.success("Service deleted");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: () => toast.error("Unable to delete service"),
  });

  const items = servicesQuery.data?.items ?? [];
  const total = servicesQuery.data?.total ?? 0;

  const openCreateModal = () => {
    setEditingItem(null);
    form.reset(defaultValues);
    setMarkAsPopular(false);
    setPopularCategoryId("");
    setPopularPriority(1);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServiceItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description,
      price: item.price,
      rating: Number.isFinite(Number(item.rating)) ? Number(item.rating) : 0,
      categoryId: String(item.categoryId ?? ""),
      service_type: item.serviceType,
      imageUrl: item.imageUrl ?? "",
    });
    setMarkAsPopular(false);
    setPopularCategoryId("");
    setPopularPriority(1);
    setIsModalOpen(true);
  };

  const onSubmit = async (values: ServiceFormValues) => {
    try {
      const payload: ServiceFormValues = {
        ...values,
        imageUrl: String(values.imageUrl ?? "").trim() || undefined,
      };
      const categoryIdNum = Number(payload.categoryId);
      const payloadForApi: ServicePayload = {
        ...payload,
        categoryId: Number.isFinite(categoryIdNum) && categoryIdNum > 0 ? categoryIdNum : undefined,
        category_id: Number.isFinite(categoryIdNum) && categoryIdNum > 0 ? categoryIdNum : undefined,
      };

      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, payload: payloadForApi });
        toast.success("Service updated");
        setIsModalOpen(false);
        setEditingItem(null);
        form.reset(defaultValues);
        await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
        return;
      }

      const created = await createMutation.mutateAsync(payloadForApi);

      if (markAsPopular) {
        const serviceId = Number(created?.id ?? "");
        const categoryId = Number(popularCategoryId);
        const requestedPriority = Number(popularPriority);

        if (!Number.isFinite(categoryId) || categoryId <= 0) {
          toast.error("Please select Popular Category");
        } else if (!Number.isFinite(requestedPriority) || requestedPriority <= 0) {
          toast.error("Please enter valid Popular Priority");
        } else if (!Number.isFinite(serviceId) || serviceId <= 0) {
          toast.success("Service created");
          toast("Created, but auto-popular skipped (service id missing in response).", { icon: "!" });
        } else {
          const existing = await getPopularServicesByCategory(String(categoryId));
          const used = new Set(existing.map((item) => Number(item.priority)).filter((v) => Number.isFinite(v) && v > 0));
          let safePriority = requestedPriority;
          while (used.has(safePriority)) safePriority += 1;

          const isDuplicateLikeError = (error: any) => {
            const message = String(
              error?.response?.data?.message ??
              error?.message ??
              "",
            ).toLowerCase();
            return (
              message.includes("priority already exists") ||
              message.includes("duplicate") ||
              message.includes("already exists") ||
              message.includes("invalid data")
            );
          };

          let createdPopular = false;
          let attemptPriority = safePriority;
          for (let attempt = 0; attempt < 8; attempt += 1) {
            try {
              await createPopularService({ serviceId, categoryId, priority: attemptPriority });
              safePriority = attemptPriority;
              createdPopular = true;
              break;
            } catch (popularError: any) {
              if (!isDuplicateLikeError(popularError)) throw popularError;

              const latest = await getPopularServicesByCategory(String(categoryId));
              const latestUsed = new Set(
                latest.map((item) => Number(item.priority)).filter((v) => Number.isFinite(v) && v > 0),
              );
              let nextPriority = Math.max(1, attemptPriority + 1);
              while (latestUsed.has(nextPriority)) nextPriority += 1;
              attemptPriority = nextPriority;
            }
          }

          if (!createdPopular) {
            throw new Error("Unable to assign unique popular priority. Please try again.");
          }
          if (safePriority !== requestedPriority) {
            toast.success(`Service created and marked popular at priority ${safePriority}`);
          } else {
            toast.success("Service created and marked popular");
          }
        }
      } else {
        toast.success("Service created");
      }

      setIsModalOpen(false);
      form.reset(defaultValues);
      setMarkAsPopular(false);
      setPopularCategoryId("");
      setPopularPriority(1);
      await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    } catch (error) {
      toast.error(extractApiError(error, "Unable to create service"));
    }
  };

  const onInvalidSubmit = () => {
    toast.error("Please fill all required fields correctly");
  };

  if (mode === "popular-services") {
    return (
      <div className="space-y-4">
        <ServicesModeTabs mode={mode} onModeChange={setMode} />
        <PopularServicesPage />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServicesModeTabs mode={mode} onModeChange={setMode} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Service Management</h2>
          <p className="text-sm text-[var(--color-muted)]">{total} services</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Add Service
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search services"
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sort}
          onChange={(event) => {
            setPage(1);
            setSort(event.target.value);
          }}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Default sort</option>
          <option value="createdAt,desc">Newest</option>
          <option value="createdAt,asc">Oldest</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatus("");
            setSort("");
            setPage(1);
          }}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Clear
        </button>
      </div>

      <DataState
        isLoading={servicesQuery.isLoading}
        isError={servicesQuery.isError}
        isEmpty={items.length === 0}
        loadingText="Loading services..."
        errorText="Failed to load services"
        emptyText="No services found"
        onRetry={() => void servicesQuery.refetch()}
      >
        <DataTable
          rows={items}
          rowKey={(item) => item.id}
          columns={[
            {
              key: "service",
              header: "Service",
              render: (item) => (
                <button type="button" className="text-left text-blue-300 hover:underline" onClick={() => navigate(`/services/${item.id}`)}>
                  {item.name}
                </button>
              ),
            },
            { key: "type", header: "Service Type", render: (item) => item.serviceType || "-" },
            { key: "price", header: "Price", render: (item) => `INR ${item.price.toFixed(2)}` },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate(item.id)}
                  className={`rounded-full px-2 py-1 text-xs font-medium ${item.active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-600/30 text-gray-200"}`}
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
                  <button type="button" onClick={() => openEditModal(item)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">
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
          setMarkAsPopular(false);
          setPopularCategoryId("");
          setPopularPriority(1);
        }}
        title={editingItem ? "Update Service" : "Create Service"}
        formId="service-form"
        submitLabel={editingItem ? "Update" : "Create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <form id="service-form" onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span>Name</span>
            <input {...form.register("name")} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            {form.formState.errors.name ? <span className="text-xs text-red-300">{form.formState.errors.name.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span>Description</span>
            <textarea {...form.register("description")} rows={3} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            {form.formState.errors.description ? <span className="text-xs text-red-300">{form.formState.errors.description.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span>Price</span>
            <input type="number" step="0.01" {...form.register("price", { valueAsNumber: true })} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
            {form.formState.errors.price ? <span className="text-xs text-red-300">{form.formState.errors.price.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span>Rating (0 to 5)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={5}
              {...form.register("rating", { valueAsNumber: true })}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            {form.formState.errors.rating ? <span className="text-xs text-red-300">{form.formState.errors.rating.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span>Category</span>
            <select {...form.register("categoryId")} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm">
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {form.formState.errors.categoryId ? <span className="text-xs text-red-300">{form.formState.errors.categoryId.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span>Service Type</span>
            <input
              {...form.register("service_type")}
              list="service-type-options"
              placeholder="e.g. HOME_CLEANING"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <datalist id="service-type-options">
              {serviceTypes.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
            {form.formState.errors.service_type ? <span className="text-xs text-red-300">{form.formState.errors.service_type.message}</span> : null}
          </label>

          <div className="grid gap-2 text-sm">
            <span>Service Image</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) imageUploadMutation.mutate(file);
                  event.currentTarget.value = "";
                }}
                className="max-w-full text-xs"
              />
              {imageUploadMutation.isPending ? <span className="text-xs text-[var(--color-muted)]">Uploading...</span> : null}
            </div>
            <input
              {...form.register("imageUrl")}
              placeholder="Or paste image URL"
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            {form.watch("imageUrl") ? (
              <img
                src={form.watch("imageUrl")}
                alt="Service preview"
                className="h-24 w-24 rounded-lg border border-[var(--color-border)] object-cover"
              />
            ) : null}
          </div>

          {!editingItem ? (
            <div className="grid gap-2 rounded-lg border border-[var(--color-border)] p-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markAsPopular} onChange={(event) => setMarkAsPopular(event.target.checked)} />
                <span>Mark as popular after create</span>
              </label>
              {markAsPopular ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span>Popular Category</span>
                    <select
                      value={popularCategoryId}
                      onChange={(event) => setPopularCategoryId(event.target.value)}
                      className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {(popularCategoriesQuery.data ?? []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span>Priority</span>
                    <input
                      type="number"
                      min={1}
                      value={popularPriority}
                      onChange={(event) => setPopularPriority(Number(event.target.value) || 1)}
                      className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Service"
        description={`Are you sure you want to delete ${deleteTarget?.name ?? "this service"}?`}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function ServicesModeTabs({
  mode,
  onModeChange,
}: {
  mode: ServicesMode;
  onModeChange: (mode: ServicesMode) => void;
}) {
  const tabs: Array<{ label: string; value: ServicesMode }> = [
    { label: "Services", value: "services" },
    { label: "Popular Services", value: "popular-services" },
  ];

  return (
    <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {tabs.map((tab) => {
        const isActive = mode === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onModeChange(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-[var(--color-accent)] text-white shadow"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

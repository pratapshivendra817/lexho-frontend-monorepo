import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout, Pagination } from "@/components/admin";
import { createService, deleteService, getServices, toggleServiceStatus, updateService } from "@/services/lexhoAdminApi";
import type { ServiceItem } from "@/types/adminCatalog";

const serviceSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(5, "Description is required"),
  price: z.number().positive("Price must be positive"),
  service_type: z.string().min(1, "Service type is required"),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const defaultValues: ServiceFormValues = {
  name: "",
  description: "",
  price: 0,
  service_type: "",
};

export default function ServicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

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

  const serviceTypes = useMemo(() => {
    const fromList = new Set((servicesQuery.data?.items ?? []).map((item) => item.serviceType).filter(Boolean));
    if (editingItem?.serviceType) fromList.add(editingItem.serviceType);
    return Array.from(fromList);
  }, [editingItem?.serviceType, servicesQuery.data?.items]);

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: async () => {
      toast.success("Service created");
      setIsModalOpen(false);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: () => toast.error("Unable to create service"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServiceFormValues }) => updateService(id, payload),
    onSuccess: async () => {
      toast.success("Service updated");
      setIsModalOpen(false);
      setEditingItem(null);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
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
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServiceItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description,
      price: item.price,
      service_type: item.serviceType,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: ServiceFormValues) => {
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
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Service Management</h2>
          <p className="text-sm text-[var(--color-muted)]">{total} services</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Add Service
        </button>
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
        }}
        title={editingItem ? "Update Service" : "Create Service"}
        formId="service-form"
        submitLabel={editingItem ? "Update" : "Create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <form id="service-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Service"
        description={`Are you sure you want to delete ${deleteTarget?.name ?? "this service"}?`}
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

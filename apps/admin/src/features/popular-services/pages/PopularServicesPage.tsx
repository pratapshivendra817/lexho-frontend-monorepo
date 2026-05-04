import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  createPopularService,
  deletePopularService,
  getCategoryOptions,
  getPopularServicesByCategory,
  getServicesByCategory,
} from "../api/popularServicesApi";
import { PopularServiceModal } from "../components/PopularServiceModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { ServiceCard } from "../components/ServiceCard";
import type { CategoryOption, PopularServiceItem, ServiceItem } from "../types";

type AsyncState<T> = {
  loading: boolean;
  error: string | null;
  data: T;
};

const initialListState = <T,>(data: T): AsyncState<T> => ({
  loading: false,
  error: null,
  data,
});
const isDebugMode = String(import.meta.env.VITE_POPULAR_SERVICES_DEBUG ?? "").toLowerCase() === "true";

export default function PopularServicesPage() {
  const [categoriesState, setCategoriesState] = useState<AsyncState<CategoryOption[]>>(
    initialListState([]),
  );
  const [servicesState, setServicesState] = useState<AsyncState<ServiceItem[]>>(
    initialListState([]),
  );
  const [popularState, setPopularState] = useState<AsyncState<PopularServiceItem[]>>(
    initialListState([]),
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const selectedCategoryName = useMemo(
    () => categoriesState.data.find((item) => item.id === selectedCategoryId)?.name ?? "Selected Category",
    [categoriesState.data, selectedCategoryId],
  );

  const loadCategories = async () => {
    setCategoriesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getCategoryOptions();
      setCategoriesState({ loading: false, error: null, data });
      if (!selectedCategoryId && data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
    } catch (error) {
      setCategoriesState({
        loading: false,
        error: extractApiError(error, "Unable to load categories"),
        data: [],
      });
    }
  };

  const loadServices = async (categoryId: string) => {
    if (!categoryId) {
      setServicesState(initialListState([]));
      return;
    }

    setServicesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getServicesByCategory(categoryId);
      setServicesState({ loading: false, error: null, data });
    } catch (error) {
      setServicesState({
        loading: false,
        error: extractApiError(error, "Unable to load services"),
        data: [],
      });
    }
  };

  const loadPopular = async (categoryId: string) => {
    if (!categoryId) {
      setPopularState(initialListState([]));
      return;
    }

    setPopularState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getPopularServicesByCategory(categoryId);
      const sorted = [...data].sort((first, second) => first.priority - second.priority);
      setPopularState({ loading: false, error: null, data: sorted });
    } catch (error) {
      setPopularState({
        loading: false,
        error: extractApiError(error, "Unable to load popular services"),
        data: [],
      });
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    void loadServices(selectedCategoryId);
    void loadPopular(selectedCategoryId);
  }, [selectedCategoryId]);

  const openMakePopularModal = (item: ServiceItem) => {
    setSelectedService(item);
    setModalOpen(true);
  };

  const handleCreatePopular = async (values: { categoryId: string; priority: number }) => {
    if (!selectedService) return;
    if (!values.categoryId) {
      toast.error("Category is required");
      return;
    }

    const duplicatePriority = popularState.data.some(
      (item) => item.priority === values.priority,
    );
    if (duplicatePriority) {
      toast.error(`Priority ${values.priority} already assigned in this category`);
      return;
    }

    const duplicateService = popularState.data.some(
      (item) => item.serviceId === selectedService.id,
    );
    if (duplicateService) {
      toast.error("This service is already marked as popular");
      return;
    }

    const payload = {
      serviceId: Number(selectedService.id),
      categoryId: Number(values.categoryId),
      priority: values.priority,
    };

    if (!Number.isFinite(payload.serviceId) || !Number.isFinite(payload.categoryId)) {
      toast.error("Invalid service/category id");
      return;
    }

    setSaving(true);
    try {
      await createPopularService(payload);
      toast.success("Service marked as popular");
      setModalOpen(false);
      setSelectedService(null);
      if (values.categoryId !== selectedCategoryId) {
        setSelectedCategoryId(values.categoryId);
      } else {
        await loadPopular(values.categoryId);
      }
    } catch (error) {
      toast.error(extractApiError(error, "Unable to add popular service"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePopular = async (id: string) => {
    setRemovingId(id);
    try {
      await deletePopularService(id);
      toast.success("Popular service removed");
      await loadPopular(selectedCategoryId);
    } catch (error) {
      toast.error(extractApiError(error, "Unable to remove popular service"));
    } finally {
      setRemovingId(null);
    }
  };

  const reorderWithFallbackPersistence = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId || !selectedCategoryId) return;
    const current = [...popularState.data];
    const sourceIndex = current.findIndex((item) => item.id === sourceId);
    const targetIndex = current.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, moved);
    const reprioritized = current.map((item, index) => ({ ...item, priority: index + 1 }));
    setPopularState((prev) => ({ ...prev, data: reprioritized }));

    setReordering(true);
    try {
      // Backend has no PATCH/PUT reorder endpoint; fallback is delete then recreate in new priority order.
      for (const item of current) {
        await deletePopularService(item.id);
      }

      for (let index = 0; index < reprioritized.length; index += 1) {
        const item = reprioritized[index];
        const serviceId = Number(item.serviceId);
        const categoryId = Number(selectedCategoryId);
        if (!Number.isFinite(serviceId) || !Number.isFinite(categoryId)) {
          throw new Error(`Invalid numeric ids for reorder: serviceId=${item.serviceId}, categoryId=${selectedCategoryId}`);
        }
        await createPopularService({
          serviceId,
          categoryId,
          priority: index + 1,
        });
      }

      toast.success("Popular services reordered");
      await loadPopular(selectedCategoryId);
    } catch (error) {
      toast.error(extractApiError(error, "Unable to persist reordered priorities"));
      await loadPopular(selectedCategoryId);
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Popular Services Management</h2>
          <p className="text-sm text-[var(--color-muted)]">Create and maintain category-wise popular services</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <label className="grid gap-1 text-sm text-[var(--color-text)] md:max-w-sm">
          <span>Category Filter</span>
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categoriesState.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DataState
        isLoading={categoriesState.loading}
        isError={Boolean(categoriesState.error)}
        isEmpty={categoriesState.data.length === 0}
        loadingText="Loading categories..."
        errorText={categoriesState.error ?? "Unable to load categories"}
        emptyText="No categories available"
        onRetry={() => void loadCategories()}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Services ({selectedCategoryName})
              </h3>
              <div className="flex items-center gap-2">
                {isDebugMode ? (
                  <span className="rounded bg-amber-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Debug
                  </span>
                ) : null}
                <PrimaryButton tone="neutral" onClick={() => void loadServices(selectedCategoryId)}>
                  Refresh
                </PrimaryButton>
              </div>
            </div>

            <DataState
              isLoading={servicesState.loading}
              isError={Boolean(servicesState.error)}
              isEmpty={servicesState.data.length === 0}
              loadingText="Loading services..."
              errorText={servicesState.error ?? "Unable to load services"}
              emptyText="No services found for this category"
              onRetry={() => void loadServices(selectedCategoryId)}
            >
              {isDebugMode ? (
                <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                  selectedCategoryId: <span className="font-mono">{selectedCategoryId || "-"}</span>
                </div>
              ) : null}
              <div className="grid gap-3">
                {servicesState.data.map((item) => (
                  <ServiceCard key={item.id} item={item} onMakePopular={openMakePopularModal} disabled={saving || reordering} debug={isDebugMode} />
                ))}
              </div>
            </DataState>
          </section>

          <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Popular Services
              </h3>
              <PrimaryButton tone="neutral" onClick={() => void loadPopular(selectedCategoryId)}>
                Refresh
              </PrimaryButton>
            </div>

            <DataState
              isLoading={popularState.loading}
              isError={Boolean(popularState.error)}
              isEmpty={popularState.data.length === 0}
              loadingText="Loading popular services..."
              errorText={popularState.error ?? "Unable to load popular services"}
              emptyText="No popular services configured for this category"
              onRetry={() => void loadPopular(selectedCategoryId)}
            >
              <div className="space-y-2">
                {popularState.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3"
                    draggable={!reordering}
                    onDragStart={() => setDraggedId(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedId) void reorderWithFallbackPersistence(draggedId, item.id);
                      setDraggedId(null);
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.serviceName || item.serviceId}</p>
                      <p className="text-xs text-[var(--color-muted)]">Priority: {item.priority}</p>
                    </div>
                    <PrimaryButton
                      tone="danger"
                      disabled={removingId === item.id || reordering}
                      onClick={() => void handleRemovePopular(item.id)}
                    >
                      {removingId === item.id ? "Removing..." : "Remove"}
                    </PrimaryButton>
                  </div>
                ))}
              </div>
            </DataState>
          </section>
        </div>
      </DataState>

      <PopularServiceModal
        open={modalOpen}
        service={selectedService}
        categories={categoriesState.data}
        defaultCategoryId={selectedService?.categoryId || selectedCategoryId}
        isSubmitting={saving}
        onClose={() => {
          setModalOpen(false);
          setSelectedService(null);
        }}
        onSubmit={(values) => void handleCreatePopular(values)}
      />
    </div>
  );
}

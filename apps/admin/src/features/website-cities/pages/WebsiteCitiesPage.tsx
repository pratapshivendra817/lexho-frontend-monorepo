import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { useCityAreasQuery, useWebsiteCitiesMutations, useWebsiteCitiesQuery } from "../hooks/useWebsiteCities";
import type { WebsiteArea, WebsiteCity, WebsiteLocationPayload } from "../types";

const defaultForm: WebsiteLocationPayload = {
  name: "",
  slug: "",
  displayOrder: 1,
  active: true,
};

type CityModalState =
  | { open: false; city: null }
  | { open: true; city: WebsiteCity | null };

type AreaManagerState =
  | { open: false; city: null }
  | { open: true; city: WebsiteCity };

type AreaModalState =
  | { open: false; area: null }
  | { open: true; area: WebsiteArea | null };

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function WebsiteCitiesPage() {
  const citiesQuery = useWebsiteCitiesQuery();
  const {
    createCityMutation,
    updateCityMutation,
    updateCityStatusMutation,
    deleteCityMutation,
    createAreaMutation,
    updateAreaMutation,
    updateAreaStatusMutation,
    deleteAreaMutation,
    reorderAreasMutation,
  } = useWebsiteCitiesMutations();

  const [cityModal, setCityModal] = useState<CityModalState>({ open: false, city: null });
  const [areaManager, setAreaManager] = useState<AreaManagerState>({ open: false, city: null });
  const [areaModal, setAreaModal] = useState<AreaModalState>({ open: false, area: null });
  const [deleteCityTarget, setDeleteCityTarget] = useState<WebsiteCity | null>(null);
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<WebsiteArea | null>(null);
  const [cityForm, setCityForm] = useState<WebsiteLocationPayload>(defaultForm);
  const [areaForm, setAreaForm] = useState<WebsiteLocationPayload>(defaultForm);
  const [areaOrderDraft, setAreaOrderDraft] = useState<Record<number, number>>({});

  const cities = useMemo(
    () => [...(citiesQuery.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [citiesQuery.data],
  );

  const areasQuery = useCityAreasQuery(areaManager.city?.id ?? null);
  const areas = useMemo(
    () => [...(areasQuery.data ?? [])].sort((a, b) => (areaOrderDraft[a.id] ?? a.displayOrder) - (areaOrderDraft[b.id] ?? b.displayOrder)),
    [areasQuery.data, areaOrderDraft],
  );

  useEffect(() => {
    if (!areaManager.city) {
      setAreaOrderDraft({});
      return;
    }
    setAreaOrderDraft({});
  }, [areaManager.city]);

  const openCreateCity = () => {
    setCityForm(defaultForm);
    setCityModal({ open: true, city: null });
  };

  const openEditCity = (city: WebsiteCity) => {
    setCityForm({
      name: city.name,
      slug: city.slug,
      displayOrder: city.displayOrder,
      active: city.active,
    });
    setCityModal({ open: true, city });
  };

  const openAreas = (city: WebsiteCity) => {
    setAreaManager({ open: true, city });
    setAreaModal({ open: false, area: null });
    setAreaForm(defaultForm);
  };

  const openCreateArea = () => {
    const nextOrder = (areasQuery.data?.length ?? 0) + 1;
    setAreaForm({ ...defaultForm, displayOrder: nextOrder });
    setAreaModal({ open: true, area: null });
  };

  const openEditArea = (area: WebsiteArea) => {
    setAreaForm({
      name: area.name,
      slug: area.slug,
      displayOrder: area.displayOrder,
      active: area.active,
    });
    setAreaModal({ open: true, area });
  };

  const submitCity = () => {
    const payload = sanitizePayload(cityForm);
    if (!payload.name || !payload.slug) {
      toast.error("City name and slug are required");
      return;
    }

    if (cityModal.city) {
      updateCityMutation.mutate(
        { cityId: cityModal.city.id, payload },
        {
          onSuccess: () => {
            toast.success("City updated");
            setCityModal({ open: false, city: null });
            setCityForm(defaultForm);
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to update city")),
        },
      );
      return;
    }

    createCityMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("City created");
        setCityModal({ open: false, city: null });
        setCityForm(defaultForm);
      },
      onError: (error) => toast.error(extractApiError(error, "Unable to create city")),
    });
  };

  const submitArea = () => {
    if (!areaManager.city) return;
    const payload = sanitizePayload(areaForm);
    if (!payload.name || !payload.slug) {
      toast.error("Area name and slug are required");
      return;
    }

    if (areaModal.area) {
      updateAreaMutation.mutate(
        { areaId: areaModal.area.id, payload },
        {
          onSuccess: () => {
            toast.success("Area updated");
            setAreaModal({ open: false, area: null });
            setAreaForm(defaultForm);
          },
          onError: (error) => toast.error(extractApiError(error, "Unable to update area")),
        },
      );
      return;
    }

    createAreaMutation.mutate(
      { cityId: areaManager.city.id, payload },
      {
        onSuccess: () => {
          toast.success("Area created");
          setAreaModal({ open: false, area: null });
          setAreaForm(defaultForm);
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to create area")),
      },
    );
  };

  const saveAreaOrder = () => {
    if (!areaManager.city || areas.length === 0) return;
    if (areas.length === 1) {
      setAreaOrderDraft({});
      toast.success("Only one area is already in the correct order");
      return;
    }

    // The API requires every city's area order to be a gap-free sequence starting at 1.
    const rows = areas.map((area, index) => ({
      id: area.id,
      displayOrder: index + 1,
    }));
    reorderAreasMutation.mutate(
      { cityId: areaManager.city.id, rows },
      {
        onSuccess: () => {
          toast.success("Area order updated");
          setAreaOrderDraft({});
        },
        onError: (error) => toast.error(extractApiError(error, "Unable to reorder areas")),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Header Navigation Cities</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Manage website cities and the areas shown on public city pages.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateCity}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Create City
        </button>
      </div>

      <DataState
        isLoading={citiesQuery.isLoading}
        isError={citiesQuery.isError}
        isEmpty={cities.length === 0}
        loadingText="Loading cities..."
        errorText="Failed to load cities"
        emptyText="No website cities found. Create one to start populating the website."
        onRetry={() => void citiesQuery.refetch()}
      >
        <DataTable
          rows={cities}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "name", header: "City Name", render: (row) => row.name },
            { key: "slug", header: "Slug", render: (row) => row.slug },
            {
              key: "status",
              header: "Show/Hide",
              render: (row) => (
                <button
                  type="button"
                  onClick={() =>
                    updateCityStatusMutation.mutate(
                      { cityId: row.id, active: !row.active },
                      {
                        onSuccess: () => toast.success(`City ${row.active ? "hidden" : "shown"}`),
                        onError: (error) => toast.error(extractApiError(error, "Unable to update city status")),
                      },
                    )
                  }
                  className={`rounded border px-2 py-1 text-xs ${
                    row.active
                      ? "border-emerald-500/40 text-emerald-300"
                      : "border-zinc-500/40 text-zinc-300"
                  }`}
                >
                  {row.active ? "Shown" : "Hidden"}
                </button>
              ),
            },
            { key: "displayOrder", header: "Display Order", render: (row) => row.displayOrder },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCity(row)}
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCityTarget(row)}
                    className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => openAreas(row)}
                    className="rounded border border-blue-500/40 px-2 py-1 text-xs text-blue-300"
                  >
                    Manage Areas
                  </button>
                </div>
              ),
            },
          ]}
        />
      </DataState>

      <ModalFormLayout
        open={cityModal.open}
        onClose={() => setCityModal({ open: false, city: null })}
        title={cityModal.city ? "Edit City" : "Create City"}
        formId="website-city-form"
        submitLabel={cityModal.city ? "Update City" : "Create City"}
        isSubmitting={createCityMutation.isPending || updateCityMutation.isPending}
      >
        <LocationForm
          formId="website-city-form"
          value={cityForm}
          onChange={setCityForm}
          onSubmit={submitCity}
        />
      </ModalFormLayout>

      <ModalFormLayout
        open={areaManager.open}
        onClose={() => {
          setAreaManager({ open: false, city: null });
          setAreaModal({ open: false, area: null });
        }}
        title={areaManager.city ? `Manage Areas: ${areaManager.city.name}` : "Manage Areas"}
        submitLabel="Save Order"
        formId="manage-city-areas"
        isSubmitting={reorderAreasMutation.isPending}
        maxWidthClassName="max-w-5xl"
      >
        <form
          id="manage-city-areas"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveAreaOrder();
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-muted)]">
              Public website will only show areas created here for <span className="font-medium text-[var(--color-text)]">{areaManager.city?.name}</span>.
            </div>
            <button
              type="button"
              onClick={openCreateArea}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              + Create Area
            </button>
          </div>

          <DataState
            isLoading={areasQuery.isLoading}
            isError={areasQuery.isError}
            isEmpty={!areasQuery.isLoading && areas.length === 0}
            loadingText="Loading areas..."
            errorText="Failed to load areas"
            emptyText="No areas found for this city yet."
            onRetry={() => void areasQuery.refetch()}
          >
            <DataTable
              rows={areas}
              rowKey={(row) => String(row.id)}
              columns={[
                { key: "name", header: "Area Name", render: (row) => row.name },
                { key: "slug", header: "Slug", render: (row) => row.slug },
                {
                  key: "status",
                  header: "Show/Hide",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() =>
                        updateAreaStatusMutation.mutate(
                          { areaId: row.id, active: !row.active },
                          {
                            onSuccess: () => toast.success(`Area ${row.active ? "hidden" : "shown"}`),
                            onError: (error) => toast.error(extractApiError(error, "Unable to update area status")),
                          },
                        )
                      }
                      className={`rounded border px-2 py-1 text-xs ${
                        row.active
                          ? "border-emerald-500/40 text-emerald-300"
                          : "border-zinc-500/40 text-zinc-300"
                      }`}
                    >
                      {row.active ? "Shown" : "Hidden"}
                    </button>
                  ),
                },
                {
                  key: "displayOrder",
                  header: "Display Order",
                  render: (row) => (
                    <input
                      type="number"
                      min={1}
                      value={areaOrderDraft[row.id] ?? row.displayOrder}
                      onChange={(event) =>
                        setAreaOrderDraft((prev) => ({
                          ...prev,
                          [row.id]: Math.max(1, Number(event.target.value || row.displayOrder)),
                        }))
                      }
                      className="w-20 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                    />
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditArea(row)}
                        className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteAreaTarget(row)}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </DataState>
        </form>
      </ModalFormLayout>

      <ModalFormLayout
        open={areaModal.open}
        onClose={() => setAreaModal({ open: false, area: null })}
        title={areaModal.area ? "Edit Area" : "Create Area"}
        formId="website-area-form"
        submitLabel={areaModal.area ? "Update Area" : "Create Area"}
        isSubmitting={createAreaMutation.isPending || updateAreaMutation.isPending}
      >
        <LocationForm
          formId="website-area-form"
          value={areaForm}
          onChange={setAreaForm}
          onSubmit={submitArea}
        />
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deleteCityTarget)}
        title="Delete City"
        description={`Are you sure you want to delete ${deleteCityTarget?.name}?`}
        confirmLabel="Delete"
        isLoading={deleteCityMutation.isPending}
        onClose={() => setDeleteCityTarget(null)}
        onConfirm={() => {
          if (!deleteCityTarget) return;
          deleteCityMutation.mutate(deleteCityTarget.id, {
            onSuccess: () => {
              toast.success("City deleted");
              setDeleteCityTarget(null);
            },
            onError: (error) => toast.error(extractApiError(error, "Unable to delete city")),
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteAreaTarget)}
        title="Delete Area"
        description={`Are you sure you want to delete ${deleteAreaTarget?.name}?`}
        confirmLabel="Delete"
        isLoading={deleteAreaMutation.isPending}
        onClose={() => setDeleteAreaTarget(null)}
        onConfirm={() => {
          if (!deleteAreaTarget) return;
          deleteAreaMutation.mutate(deleteAreaTarget.id, {
            onSuccess: () => {
              toast.success("Area deleted");
              setDeleteAreaTarget(null);
            },
            onError: (error) => toast.error(extractApiError(error, "Unable to delete area")),
          });
        }}
      />
    </div>
  );
}

function LocationForm({
  formId,
  value,
  onChange,
  onSubmit,
}: {
  formId: string;
  value: WebsiteLocationPayload;
  onChange: (value: WebsiteLocationPayload) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      id={formId}
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="grid gap-1 text-sm">
        <span>Name</span>
        <input
          value={value.name}
          onChange={(event) =>
            onChange({
              ...value,
              name: event.target.value,
              slug: value.slug === toSlug(value.name) || !value.slug ? toSlug(event.target.value) : value.slug,
            })
          }
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span>Slug</span>
        <input
          value={value.slug}
          onChange={(event) => onChange({ ...value, slug: toSlug(event.target.value) })}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span>Display Order</span>
        <input
          type="number"
          min={1}
          value={value.displayOrder}
          onChange={(event) => onChange({ ...value, displayOrder: Math.max(1, Number(event.target.value || 1)) })}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(event) => onChange({ ...value, active: event.target.checked })}
        />
        Active
      </label>
    </form>
  );
}

function sanitizePayload(value: WebsiteLocationPayload): WebsiteLocationPayload {
  return {
    name: value.name.trim(),
    slug: toSlug(value.slug || value.name),
    displayOrder: Math.max(1, Number(value.displayOrder || 1)),
    active: Boolean(value.active),
  };
}

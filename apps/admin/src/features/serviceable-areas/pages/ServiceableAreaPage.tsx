import { useMemo, useState } from "react";

import { ConfirmDialog, DataState } from "@/components/admin";

import { AddEditServiceableAreaModal, type ServiceableAreaFormValues } from "../components/AddEditServiceableAreaModal";
import { PaginationControls } from "../components/PaginationControls";
import { SearchBar } from "../components/SearchBar";
import { ServiceableAreaTable, ServiceableAreaTableSkeleton } from "../components/ServiceableAreaTable";
import {
  useCreateServiceableArea,
  useDeleteServiceableArea,
  useGeoCities,
  useGeoZones,
  useServiceableAreas,
  useToggleServiceableAreaStatus,
  useUpdateServiceableArea,
} from "../hooks/useServiceableAreas";
import type { ServiceableAreaItem, ServiceableAreaStatus, SortDir } from "../types";

export default function ServiceableAreaPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [status, setStatus] = useState<ServiceableAreaStatus | "ALL">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceableAreaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceableAreaItem | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);

  const queryParams = useMemo(
    () => ({
      page,
      size,
      sortBy,
      sortDir,
      query: query.trim() || undefined,
      status,
    }),
    [page, size, sortBy, sortDir, query, status],
  );

  const listQuery = useServiceableAreas(queryParams);
  const citiesQuery = useGeoCities();
  const zonesQuery = useGeoZones(selectedCityId);
  const createMutation = useCreateServiceableArea();
  const updateMutation = useUpdateServiceableArea();
  const deleteMutation = useDeleteServiceableArea();
  const toggleStatusMutation = useToggleServiceableAreaStatus();

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const duplicateCheck = (values: ServiceableAreaFormValues, id?: string) => {
    const normalizedPincode = values.pincode.trim();
    const normalizedCity = values.city.trim().toLowerCase();
    return items.some(
      (item) => item.id !== id && item.pincode === normalizedPincode && item.city.trim().toLowerCase() === normalizedCity,
    );
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedCityId(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Serviceable Area Management</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage pincodes, city-level availability and activation.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Add Serviceable Area
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-4">
        <SearchBar
          value={query}
          onChange={(value) => {
            setPage(0);
            setQuery(value);
          }}
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(0);
            setStatus(event.target.value as ServiceableAreaStatus | "ALL");
          }}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="ALL">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="id">Sort by ID</option>
          <option value="pincode">Sort by Pincode</option>
          <option value="city">Sort by City</option>
        </select>
        <select
          value={sortDir}
          onChange={(event) => setSortDir(event.target.value as SortDir)}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {listQuery.isLoading ? <ServiceableAreaTableSkeleton /> : null}

      <DataState
        isLoading={false}
        isError={listQuery.isError}
        isEmpty={!listQuery.isLoading && items.length === 0}
        errorText="Failed to load serviceable areas"
        emptyText="No serviceable areas found. Add one to get started."
        onRetry={() => {
          void listQuery.refetch();
        }}
      >
        {!listQuery.isLoading ? (
          <>
            <ServiceableAreaTable
              items={items}
              statusPendingId={toggleStatusMutation.variables?.id ?? null}
              deletePendingId={deleteMutation.variables ?? null}
              onEdit={(item) => {
                setEditingItem(item);
                setSelectedCityId(item.cityId);
                setIsModalOpen(true);
              }}
              onDelete={(item) => setDeleteTarget(item)}
              onToggleStatus={(item) => {
                toggleStatusMutation.mutate({ id: item.id, active: !item.active });
              }}
            />
            <PaginationControls
              page={page}
              size={size}
              total={total}
              onPageChange={setPage}
              onSizeChange={(nextSize) => {
                setPage(0);
                setSize(nextSize);
              }}
            />
          </>
        ) : null}
      </DataState>

      <AddEditServiceableAreaModal
        open={isModalOpen}
        editingItem={editingItem}
        cities={citiesQuery.data}
        zones={zonesQuery.data}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        duplicateCheck={duplicateCheck}
        onClose={closeModal}
        onCityChange={(cityId) => setSelectedCityId(cityId)}
        onSubmit={(payload, id) => {
          if (id) {
            updateMutation.mutate(
              { id, payload },
              {
                onSuccess: () => {
                  closeModal();
                },
              },
            );
            return;
          }

          createMutation.mutate(payload, {
            onSuccess: () => {
              closeModal();
            },
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Serviceable Area"
        description={`Are you sure you want to delete ${deleteTarget?.pincode} (${deleteTarget?.city})?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
            },
          });
        }}
      />
    </div>
  );
}

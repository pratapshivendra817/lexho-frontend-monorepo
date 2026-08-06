import { useMemo, useState } from "react";

import { ConfirmDialog, DataState } from "@/components/admin";

import { AddEditServiceableAreaModal, type ServiceableAreaFormValues } from "../components/AddEditServiceableAreaModal";
import { PaginationControls } from "../components/PaginationControls";
import { SearchBar } from "../components/SearchBar";
import { ServiceableAreaTable, ServiceableAreaTableSkeleton } from "../components/ServiceableAreaTable";
import {
  useCreateServiceableArea,
  useDeleteServiceableArea,
  useServiceableAreas,
  useToggleServiceableAreaStatus,
  useUpdateServiceableArea,
} from "../hooks/useServiceableAreas";
import type { ServiceableAreaItem, ServiceableAreaStatus, SortDir } from "../types";
import GeoManagementPage from "./GeoManagementPage";
import SettingsPage from "../../settings/pages/SettingsPage";
import LiveDispatchMonitorPage from "../../live-dispatch/pages/LiveDispatchMonitorPage";

type ServiceableAreaMode = "serviceable-areas" | "geo" | "settings" | "live-dispatch";

export default function ServiceableAreaPage() {
  const [mode, setMode] = useState<ServiceableAreaMode>("serviceable-areas");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [status, setStatus] = useState<ServiceableAreaStatus | "ALL">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceableAreaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceableAreaItem | null>(null);

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
  };

  if (mode === "geo") {
    return (
      <div className="space-y-4">
        <ServiceableAreaModeTabs mode={mode} onModeChange={setMode} />
        <GeoManagementPage />
      </div>
    );
  }

  if (mode === "settings") {
    return (
      <div className="space-y-4">
        <ServiceableAreaModeTabs mode={mode} onModeChange={setMode} />
        <SettingsPage />
      </div>
    );
  }

  if (mode === "live-dispatch") {
    return (
      <div className="space-y-4">
        <ServiceableAreaModeTabs mode={mode} onModeChange={setMode} />
        <LiveDispatchMonitorPage />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServiceableAreaModeTabs mode={mode} onModeChange={setMode} />

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
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        duplicateCheck={duplicateCheck}
        onClose={closeModal}
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

function ServiceableAreaModeTabs({
  mode,
  onModeChange,
}: {
  mode: ServiceableAreaMode;
  onModeChange: (mode: ServiceableAreaMode) => void;
}) {
  const tabs: Array<{ label: string; value: ServiceableAreaMode }> = [
    { label: "Serviceable Areas", value: "serviceable-areas" },
    { label: "Geo Cities & Zones", value: "geo" },
    { label: "Settings", value: "settings" },
    { label: "Live Dispatch", value: "live-dispatch" },
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

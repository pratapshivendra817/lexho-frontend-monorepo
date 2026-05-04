import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ConfirmDialog, DataState, Pagination, Skeleton } from "@/components/admin";
import { useDebounce } from "@/hooks/useDebounce";
import { extractApiError } from "@/utils/apiError";

import { BookingStatsCards, BookingsFiltersBar, BookingsTable } from "../components";
import { useBookingMutations, useBookingsQuery, useBookingStatsQuery } from "../hooks/useBookings";
import { exportBookingsToCsv } from "../utils/exportBookingsToCsv";
import type { BookingListItem, BookingStatus, ServiceType, SortDirection } from "../types";

type PendingAction = {
  type: "cancel" | "delete";
  booking: BookingListItem;
};

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

const parseSortDir = (value: string | null): SortDirection => (value === "asc" ? "asc" : "desc");

export default function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePage(searchParams.get("page"));
  const status = (searchParams.get("status") ?? "") as BookingStatus | "";
  const serviceType = (searchParams.get("serviceType") ?? "") as ServiceType | "";
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = parseSortDir(searchParams.get("sortDir"));
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const search = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [activeActionBookingId, setActiveActionBookingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === search) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      next.set("search", debouncedSearch);
    } else {
      next.delete("search");
    }
    next.set("page", "0");
    setSearchParams(next);
  }, [debouncedSearch, search, searchParams, setSearchParams]);

  const updateParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.length > 0) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    if (resetPage) {
      next.set("page", "0");
    }

    setSearchParams(next);
  };

  const listQuery = useBookingsQuery({
    page,
    size: 10,
    sortBy,
    sortDir,
    status,
    serviceType,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const statsQuery = useBookingStatsQuery();
  const { cancelBookingMutation, deleteBookingMutation } = useBookingMutations();

  const rows = listQuery.data?.content ?? [];
  const total = listQuery.data?.totalElements ?? 0;

  const stats = useMemo(
    () =>
      statsQuery.data ?? {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      },
    [statsQuery.data],
  );

  const handleActionConfirm = () => {
    if (!pendingAction) {
      return;
    }

    setActiveActionBookingId(pendingAction.booking.id);

    const mutation = pendingAction.type === "cancel" ? cancelBookingMutation : deleteBookingMutation;
    mutation.mutate(pendingAction.booking.id, {
      onSuccess: () => {
        toast.success(pendingAction.type === "cancel" ? "Booking cancelled" : "Booking deleted");
        setPendingAction(null);
        setActiveActionBookingId(null);
      },
      onError: (error) => {
        toast.error(
          extractApiError(
            error,
            pendingAction.type === "cancel" ? "Unable to cancel booking" : "Unable to delete booking",
          ),
        );
        setActiveActionBookingId(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Booking Management</h2>
        <p className="text-sm text-[var(--color-muted)]">Monitor, filter and manage all bookings</p>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <BookingStatsCards stats={stats} />
      )}

      <BookingsFiltersBar
        search={searchInput}
        status={status}
        serviceType={serviceType}
        startDate={startDate}
        endDate={endDate}
        sortBy={sortBy}
        sortDir={sortDir}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => updateParams({ status: value || undefined })}
        onServiceTypeChange={(value) => updateParams({ serviceType: value || undefined })}
        onStartDateChange={(value) => updateParams({ startDate: value || undefined })}
        onEndDateChange={(value) => updateParams({ endDate: value || undefined })}
        onSortByChange={(value) => updateParams({ sortBy: value })}
        onSortDirChange={(value) => updateParams({ sortDir: value })}
        onExport={() => exportBookingsToCsv(rows)}
        onReset={() => {
          setSearchInput("");
          setSearchParams(
            new URLSearchParams({
              page: "0",
              sortBy: "createdAt",
              sortDir: "desc",
            }),
          );
        }}
      />

      <DataState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading bookings..."
        errorText="Failed to load bookings"
        emptyText="No bookings found for selected filters"
        onRetry={() => {
          void listQuery.refetch();
          void statsQuery.refetch();
        }}
      >
        <BookingsTable
          rows={rows}
          activeActionBookingId={activeActionBookingId}
          onView={(booking) => navigate(`/bookings/${booking.id}`)}
          onEdit={(booking) => navigate(`/bookings/edit/${booking.id}`)}
          onCancel={(booking) => setPendingAction({ type: "cancel", booking })}
          onDelete={(booking) => setPendingAction({ type: "delete", booking })}
        />

        <Pagination
          page={page + 1}
          total={total}
          limit={10}
          onPageChange={(nextPage) => {
            updateParams({ page: String(Math.max(0, nextPage - 1)) }, false);
          }}
        />
      </DataState>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.type === "cancel" ? "Cancel Booking" : "Delete Booking"}
        description={
          pendingAction
            ? pendingAction.type === "cancel"
              ? `Cancel booking ${pendingAction.booking.id}?`
              : `Delete booking ${pendingAction.booking.id}?`
            : ""
        }
        confirmLabel={pendingAction?.type === "cancel" ? "Cancel Booking" : "Delete Booking"}
        onClose={() => setPendingAction(null)}
        onConfirm={handleActionConfirm}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { DataState, Pagination } from "@/components/admin";
import { fetchBookingLiveTracking, updateBookingPartnerLocation } from "@/api/admin";
import { extractApiError } from "@/utils/apiError";

import { useBookingMutations, useBookingsQuery } from "@/features/bookings/hooks/useBookings";
import type { DispatchLifecycleStatus } from "@/features/bookings/types";

const LIFECYCLE_VALUES: DispatchLifecycleStatus[] = [
  "BOOKING_CREATED",
  "PARTNER_SEARCH",
  "PARTNER_ASSIGNED",
  "PARTNER_ACCEPTED",
  "PARTNER_REACHED",
  "SERVICE_STARTED",
  "SERVICE_COMPLETED",
  "PAYMENT_COMPLETED",
];

export default function LiveDispatchMonitorPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [trackingBookingId, setTrackingBookingId] = useState("");
  const [overrideLatitude, setOverrideLatitude] = useState("");
  const [overrideLongitude, setOverrideLongitude] = useState("");
  const [overridePincode, setOverridePincode] = useState("");
  const [lifecycleByOrder, setLifecycleByOrder] = useState<Record<string, DispatchLifecycleStatus>>({});
  const debouncedSearch = search.trim();
  const listQuery = useBookingsQuery({
    page: page - 1,
    size: 10,
    sortBy: "createdAt",
    sortDir: "desc",
    search: debouncedSearch || undefined,
    status: "",
    serviceType: "",
  });
  const { manualDispatchMutation, updateLifecycleMutation } = useBookingMutations();

  const rows = listQuery.data?.content ?? [];
  const total = listQuery.data?.totalElements ?? 0;
  const activeRows = useMemo(() => rows.filter((row) => row.status !== "COMPLETED" && row.status !== "CANCELLED"), [rows]);
  const trackingQuery = useQuery({
    queryKey: ["admin-booking-live-tracking", trackingBookingId],
    queryFn: () => fetchBookingLiveTracking(trackingBookingId),
    enabled: trackingBookingId.trim().length > 0,
    retry: false,
  });
  const overrideMutation = useMutation({
    mutationFn: (payload: { bookingId: string; latitude: number; longitude: number; pincode?: string }) =>
      updateBookingPartnerLocation(payload.bookingId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        pincode: payload.pincode,
      }),
    onSuccess: async () => {
      toast.success("Partner location overridden");
      await trackingQuery.refetch();
    },
    onError: (error) => toast.error(extractApiError(error, "Location override failed")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Live Dispatch Monitor</h2>
          <p className="text-sm text-[var(--color-muted)]">Track active bookings and trigger dispatch lifecycle actions.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-4 grid gap-3 rounded-lg border border-[var(--color-border)] p-3 lg:grid-cols-4">
          <input value={trackingBookingId} onChange={(event) => setTrackingBookingId(event.target.value)} placeholder="Booking ID for live tracking" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <input value={overrideLatitude} onChange={(event) => setOverrideLatitude(event.target.value)} placeholder="Override latitude" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <input value={overrideLongitude} onChange={(event) => setOverrideLongitude(event.target.value)} placeholder="Override longitude" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <input value={overridePincode} onChange={(event) => setOverridePincode(event.target.value)} placeholder="Pincode (optional)" className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm" />
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
            onClick={() =>
              void trackingQuery.refetch().then((res) => {
                if (!res.error) toast.success("Tracking refreshed");
              })
            }
          >
            Fetch Live Snapshot
          </button>
          <button
            type="button"
            className="rounded bg-amber-600 px-3 py-2 text-sm text-white"
            onClick={() => {
              const lat = Number(overrideLatitude);
              const lng = Number(overrideLongitude);
              if (!trackingBookingId || Number.isNaN(lat) || Number.isNaN(lng)) {
                toast.error("Booking ID, latitude and longitude are required");
                return;
              }
              overrideMutation.mutate({ bookingId: trackingBookingId, latitude: lat, longitude: lng, pincode: overridePincode || undefined });
            }}
          >
            Override Partner Location
          </button>
          <div className="text-xs text-[var(--color-muted)] lg:col-span-2">
            {trackingQuery.data ? `Status: ${trackingQuery.data.status} | Payment: ${trackingQuery.data.paymentStatus} | Partner: ${trackingQuery.data.partnerId ?? "N/A"}` : "Enter booking id and fetch live snapshot."}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search booking id / customer / service"
            className="w-full max-w-md rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        <DataState
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          isEmpty={activeRows.length === 0}
          loadingText="Loading live dispatch queue..."
          errorText="Failed to load dispatch queue"
          emptyText="No active dispatch bookings found"
          onRetry={() => void listQuery.refetch()}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--color-muted)]">
                <tr>
                  <th className="py-2">Booking</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Service</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Partner</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border)] text-[var(--color-text)]">
                    <td className="py-2 font-medium">{row.id}</td>
                    <td className="py-2">{row.customerName || "-"}</td>
                    <td className="py-2">{row.service || "-"}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2">{row.partnerName || "Unassigned"}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/bookings/${row.id}`)}
                          className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            manualDispatchMutation.mutate(row.id, {
                              onSuccess: () => toast.success("Manual dispatch triggered"),
                              onError: (error) => toast.error(extractApiError(error, "Manual dispatch failed")),
                            });
                          }}
                          className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                        >
                          Manual Dispatch
                        </button>
                        <select
                          value={lifecycleByOrder[row.id] ?? "PARTNER_SEARCH"}
                          onChange={(event) =>
                            setLifecycleByOrder((previous) => ({
                              ...previous,
                              [row.id]: event.target.value as DispatchLifecycleStatus,
                            }))
                          }
                          className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
                        >
                          {LIFECYCLE_VALUES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            updateLifecycleMutation.mutate(
                              { orderId: row.id, lifecycle: lifecycleByOrder[row.id] ?? "PARTNER_SEARCH" },
                              {
                                onSuccess: () => toast.success("Lifecycle updated"),
                                onError: (error) => toast.error(extractApiError(error, "Lifecycle update failed")),
                              },
                            );
                          }}
                          className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} total={total} limit={10} onPageChange={setPage} />
        </DataState>
      </div>
    </div>
  );
}

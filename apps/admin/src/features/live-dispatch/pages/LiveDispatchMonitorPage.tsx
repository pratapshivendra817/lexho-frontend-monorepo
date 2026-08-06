import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { DataState, Pagination } from "@/components/admin";
import {
  fetchBookingLiveTracking,
  fetchBookingNavigation,
  updateBookingPartnerLocation,
} from "@/api/admin";
import { extractApiError } from "@/utils/apiError";

import { useBookingMutations, useBookingsQuery } from "@/features/bookings/hooks/useBookings";
import type { DispatchLifecycleStatus } from "@/features/bookings/types";
import { BookingRouteMap } from "../components";
import { useAdminBookingEtaSocket } from "../hooks/useAdminBookingEtaSocket";
import { formatDistanceMeters, formatEtaMinutes } from "../utils";

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
  const activeRows = useMemo(
    () => rows.filter((row) => row.status !== "COMPLETED" && row.status !== "CANCELLED"),
    [rows],
  );

  useEffect(() => {
    if (!trackingBookingId && activeRows[0]?.id) {
      setTrackingBookingId(activeRows[0].id);
    }
  }, [activeRows, trackingBookingId]);
  const trackingQuery = useQuery({
    queryKey: ["admin-booking-live-tracking", trackingBookingId],
    queryFn: () => fetchBookingLiveTracking(trackingBookingId),
    enabled: trackingBookingId.trim().length > 0,
    retry: false,
  });
  const navigationQuery = useQuery({
    queryKey: ["admin-booking-navigation", trackingBookingId],
    queryFn: () => fetchBookingNavigation(trackingBookingId),
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
      await Promise.all([trackingQuery.refetch(), navigationQuery.refetch()]);
    },
    onError: (error) => toast.error(extractApiError(error, "Location override failed")),
  });

  useAdminBookingEtaSocket({
    bookingId: trackingBookingId,
    enabled: trackingBookingId.trim().length > 0,
    onEtaUpdate: () => {
      void Promise.all([trackingQuery.refetch(), navigationQuery.refetch()]);
    },
  });

  const trackingSnapshot = trackingQuery.data;
  const navigationSnapshot = navigationQuery.data;

  const refreshTracking = () =>
    void Promise.all([trackingQuery.refetch(), navigationQuery.refetch()]).then((responses) => {
      if (!responses[0].error && !responses[1].error) {
        toast.success("Tracking refreshed");
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Live Dispatch Monitor</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Track active bookings, draw backend route polyline, and override partner location.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-4 grid gap-3 rounded-lg border border-[var(--color-border)] p-3 lg:grid-cols-4">
          <input
            value={trackingBookingId}
            onChange={(event) => setTrackingBookingId(event.target.value)}
            placeholder="Booking ID for live tracking"
            className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={overrideLatitude}
            onChange={(event) => setOverrideLatitude(event.target.value)}
            placeholder="Override latitude"
            className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={overrideLongitude}
            onChange={(event) => setOverrideLongitude(event.target.value)}
            placeholder="Override longitude"
            className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={overridePincode}
            onChange={(event) => setOverridePincode(event.target.value)}
            placeholder="Pincode (optional)"
            className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          <button type="button" className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={refreshTracking}>
            Refresh Tracking
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
              overrideMutation.mutate({
                bookingId: trackingBookingId,
                latitude: lat,
                longitude: lng,
                pincode: overridePincode || undefined,
              });
            }}
          >
            Override Partner Location
          </button>
          <div className="text-xs text-[var(--color-muted)] lg:col-span-2">
            {trackingSnapshot
              ? `Status: ${trackingSnapshot.status} | Payment: ${trackingSnapshot.paymentStatus ?? "N/A"} | Partner: ${trackingSnapshot.partnerId ?? "N/A"}`
              : "Enter booking id and refresh tracking."}
          </div>
        </div>

        {trackingBookingId.trim() ? (
          <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">Route & Tracking</h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    Backend polyline rendered with partner and customer markers.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                  onClick={refreshTracking}
                >
                  Refresh
                </button>
              </div>

              <BookingRouteMap
                routeCoordinates={navigationSnapshot?.routeCoordinates ?? []}
                partnerLocation={trackingSnapshot?.partnerLocation ?? navigationSnapshot?.partnerLocation}
                customerLocation={navigationSnapshot?.customerLocation}
              />
            </section>

            <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Navigation Panel</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-[var(--color-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Status</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {navigationSnapshot?.status ?? trackingSnapshot?.status ?? "N/A"}
                  </p>
                </div>
                <div className="rounded border border-[var(--color-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">ETA</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {formatEtaMinutes(navigationSnapshot?.etaMinutes)}
                  </p>
                </div>
                <div className="rounded border border-[var(--color-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Distance</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {formatDistanceMeters(navigationSnapshot?.distanceMeters, navigationSnapshot?.distanceText)}
                  </p>
                </div>
                <div className="rounded border border-[var(--color-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Partner location</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {trackingSnapshot?.partnerLocation
                      ? `${trackingSnapshot.partnerLocation.latitude.toFixed(5)}, ${trackingSnapshot.partnerLocation.longitude.toFixed(5)}`
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded border border-[var(--color-border)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Tracking events</p>
                {trackingSnapshot?.events?.length ? (
                  <ul className="mt-2 space-y-2 text-sm">
                    {trackingSnapshot.events.slice(0, 6).map((event) => (
                      <li
                        key={`${event.id}-${event.createdAt ?? "event"}`}
                        className="rounded border border-[var(--color-border)] p-2"
                      >
                        <p className="font-medium text-[var(--color-text)]">{event.eventType}</p>
                        <p className="text-xs text-[var(--color-muted)]">{event.createdAt ?? "Time unavailable"}</p>
                        {event.eventPayload ? (
                          <p className="mt-1 break-words text-xs text-[var(--color-muted)]">{event.eventPayload}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">No tracking events available yet.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}

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
                            setTrackingBookingId(row.id);
                          }}
                          className="rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                        >
                          Track
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

import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { DataState } from "@/components/admin";

import { BookingStatusBadge } from "../components";
import { useBookingDetailsQuery } from "../hooks/useBookings";

export default function BookingDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const detailsQuery = useBookingDetailsQuery(id);
  const booking = detailsQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/bookings" className="inline-flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-1.5 text-sm">
            <ArrowLeft size={14} /> Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Booking Details</h2>
            <p className="text-sm text-[var(--color-muted)]">Booking #{id}</p>
          </div>
        </div>

        {id ? (
          <button
            type="button"
            onClick={() => navigate(`/bookings/edit/${id}`)}
            className="inline-flex items-center gap-2 rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            <Pencil size={14} /> Edit booking
          </button>
        ) : null}
      </div>

      <DataState
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        isEmpty={!booking}
        loadingText="Loading booking details..."
        errorText="Failed to load booking details"
        emptyText="Booking not found"
        onRetry={() => {
          void detailsQuery.refetch();
        }}
      >
        {booking ? (
          <>
            <section className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Booking Info</p>
                <p><span className="text-[var(--color-muted)]">Service:</span> {booking.service}</p>
                <p><span className="text-[var(--color-muted)]">Service Type:</span> {booking.serviceType}</p>
                <p><span className="text-[var(--color-muted)]">Date:</span> {booking.bookingDate}</p>
                <p><span className="text-[var(--color-muted)]">Time:</span> {booking.bookingTime || "N/A"}</p>
                <div><BookingStatusBadge status={booking.status} /></div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Payment</p>
                <p><span className="text-[var(--color-muted)]">Amount:</span> INR {booking.payment.amount.toFixed(2)}</p>
                <p><span className="text-[var(--color-muted)]">Method:</span> {booking.payment.method || "N/A"}</p>
                <p><span className="text-[var(--color-muted)]">Status:</span> {booking.payment.status || "N/A"}</p>
                <p><span className="text-[var(--color-muted)]">Txn ID:</span> {booking.payment.transactionId || "N/A"}</p>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Customer Details</h3>
                <p>{booking.customer.name || "N/A"}</p>
                <p className="text-sm text-[var(--color-muted)]">{booking.customer.phone || "N/A"}</p>
                <p className="text-sm text-[var(--color-muted)]">{booking.customer.email || "N/A"}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{booking.customer.address || "Address not available"}</p>
              </article>

              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Provider Details</h3>
                <p>{booking.provider.name || "Not assigned"}</p>
                <p className="text-sm text-[var(--color-muted)]">{booking.provider.phone || "N/A"}</p>
                <p className="text-sm text-[var(--color-muted)]">{booking.provider.email || "N/A"}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">Rating: {booking.provider.rating?.toFixed(1) ?? "N/A"}</p>
              </article>
            </section>

            <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Booking Timeline</h3>
              {booking.timeline.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">Timeline not available</p>
              ) : (
                <ul className="space-y-3">
                  {booking.timeline.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="rounded border border-[var(--color-border)] p-3">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-[var(--color-muted)]">{item.at || "Time N/A"}{item.actor ? ` • ${item.actor}` : ""}</p>
                      {item.notes ? <p className="mt-1 text-sm text-[var(--color-muted)]">{item.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Notes</h3>
              <p className="text-sm text-[var(--color-muted)]">{booking.notes || "No notes available."}</p>
            </article>
          </>
        ) : null}
      </DataState>
    </div>
  );
}

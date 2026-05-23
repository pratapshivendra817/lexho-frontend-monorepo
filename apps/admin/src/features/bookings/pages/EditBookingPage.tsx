import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { DataState, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { useBookingDetailsQuery, useBookingMutations } from "../hooks/useBookings";
import { updateBookingSchema, type UpdateBookingFormValues } from "../schema";

export default function EditBookingPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const detailsQuery = useBookingDetailsQuery(id);
  const { updateBookingMutation } = useBookingMutations();

  const form = useForm<UpdateBookingFormValues>({
    resolver: zodResolver(updateBookingSchema),
    defaultValues: {
      bookingDate: "",
      bookingTime: "",
      partnerId: 0,
      amount: 0,
      notes: "",
    },
  });

  useEffect(() => {
    const booking = detailsQuery.data;
    if (!booking) {
      return;
    }

    form.reset({
      bookingDate: booking.bookingDate || "",
      bookingTime: booking.bookingTime || "",
      partnerId: Number(booking.partner.id || 0),
      amount: booking.payment.amount || 0,
      notes: booking.notes || "",
    });
  }, [detailsQuery.data, form]);

  const onSubmit = (values: UpdateBookingFormValues) => {
    if (!id) {
      return;
    }

    updateBookingMutation.mutate(
      {
        id,
        payload: {
          bookingDate: values.bookingDate,
          bookingTime: values.bookingTime,
          partnerId: values.partnerId,
          amount: values.amount,
          notes: values.notes,
        },
      },
      {
        onSuccess: () => {
          toast.success("Booking updated");
          navigate(`/bookings/${id}`, { replace: true });
        },
        onError: (error) => {
          toast.error(extractApiError(error, "Unable to update booking"));
        },
      },
    );
  };

  return (
    <ModalFormLayout
      open
      title="Edit Booking"
      formId="edit-booking-form"
      submitLabel="Save changes"
      isSubmitting={updateBookingMutation.isPending}
      onClose={() => {
        navigate(id ? `/bookings/${id}` : "/bookings", { replace: true });
      }}
      maxWidthClassName="max-w-3xl"
    >
      <p className="text-sm text-[var(--color-muted)]">Update booking schedule and assignment</p>

      <DataState
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        isEmpty={!detailsQuery.data}
        loadingText="Loading booking for edit..."
        errorText="Failed to load booking"
        emptyText="Booking not found"
        onRetry={() => {
          void detailsQuery.refetch();
        }}
      >
        <form id="edit-booking-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>Booking Date</span>
            <input type="date" {...form.register("bookingDate")} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2" />
            {form.formState.errors.bookingDate ? <span className="text-xs text-red-300">{form.formState.errors.bookingDate.message}</span> : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span>Booking Time</span>
            <input type="time" {...form.register("bookingTime")} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2" />
            {form.formState.errors.bookingTime ? <span className="text-xs text-red-300">{form.formState.errors.bookingTime.message}</span> : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span>Partner ID</span>
            <input
              type="number"
              {...form.register("partnerId", { valueAsNumber: true })}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
            />
            {form.formState.errors.partnerId ? <span className="text-xs text-red-300">{form.formState.errors.partnerId.message}</span> : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span>Amount</span>
            <input
              type="number"
              step="0.01"
              {...form.register("amount", { valueAsNumber: true })}
              className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2"
            />
            {form.formState.errors.amount ? <span className="text-xs text-red-300">{form.formState.errors.amount.message}</span> : null}
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span>Notes</span>
            <textarea {...form.register("notes")} rows={3} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2" />
            {form.formState.errors.notes ? <span className="text-xs text-red-300">{form.formState.errors.notes.message}</span> : null}
          </label>
        </form>
      </DataState>
    </ModalFormLayout>
  );
}



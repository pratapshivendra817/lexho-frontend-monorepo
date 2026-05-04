import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@lexho/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { fetchCustomerBookings } from "@/api/customer";
import { useRemoteResource } from "@/hooks/useRemoteResource";

import { useCustomerReviewMutations, useCustomerReviewsQuery } from "../hooks/useCustomerReviews";
import type { CustomerReview } from "../types";
import { customerReviewSchema, type CustomerReviewFormValues } from "../validation/reviewSchema";
import { StarRatingInput } from "../components/StarRatingInput";

type EditState = { mode: "create" | "edit"; review?: CustomerReview } | null;

export function CustomerReviewsPage() {
  const [editState, setEditState] = useState<EditState>(null);
  const [reportTarget, setReportTarget] = useState<CustomerReview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerReview | null>(null);
  const [reportConfirmOpen, setReportConfirmOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const bookingsResource = useRemoteResource(fetchCustomerBookings, []);
  const reviewsQuery = useCustomerReviewsQuery();
  const {
    createReviewMutation,
    updateReviewMutation,
    deleteReviewMutation,
    reportReviewMutation,
  } = useCustomerReviewMutations();

  const form = useForm<CustomerReviewFormValues>({
    resolver: zodResolver(customerReviewSchema),
    defaultValues: {
      bookingId: "",
      rating: 0,
      comment: "",
    },
  });

  const openCreate = () => {
    setFiles([]);
    form.reset({ bookingId: "", rating: 0, comment: "" });
    setEditState({ mode: "create" });
  };

  const openEdit = (review: CustomerReview) => {
    setFiles([]);
    form.reset({
      bookingId: review.bookingId,
      rating: review.rating,
      comment: review.comment,
    });
    setEditState({ mode: "edit", review });
  };

  const submitForm = (values: CustomerReviewFormValues) => {
    if (editState?.mode === "edit" && editState.review) {
      updateReviewMutation.mutate(
        {
          id: editState.review.id,
          payload: { ...values, images: files },
        },
        {
          onSuccess: () => {
            toast.success("Review updated");
            setEditState(null);
          },
          onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update review"),
        },
      );
      return;
    }

    createReviewMutation.mutate(
      { ...values, images: files },
      {
        onSuccess: () => {
          toast.success("Review submitted");
          setEditState(null);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to submit review"),
      },
    );
  };

  const rows = reviewsQuery.data ?? [];

  return (
    <div className="stack">
      <div className="panel light-panel">
        <div className="panel-header">
          <h2>My Reviews</h2>
          <button className="small-action" type="button" onClick={openCreate}>
            Add Review
          </button>
        </div>

        {reviewsQuery.isLoading ? (
          <p className="item-subtitle">Loading reviews...</p>
        ) : reviewsQuery.isError ? (
          <p className="error-text">Failed to load reviews</p>
        ) : rows.length === 0 ? (
          <p className="item-subtitle">No reviews submitted yet.</p>
        ) : (
          <div className="list">
            {rows.map((review) => (
              <div key={review.id} className="list-item light">
                <div>
                  <p className="item-title">{review.bookingLabel ?? `Booking ${review.bookingId}`}</p>
                  <p className="item-subtitle">{review.comment}</p>
                  <p className="item-subtitle">Rating: {review.rating} / 5</p>
                  {review.images.length > 0 ? (
                    <div className="review-image-row">
                      {review.images.map((url, index) => (
                        <img key={`${url}-${index}`} src={url} alt={`review-${index + 1}`} className="review-thumb" />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="inline-actions">
                  <button className="small-action" type="button" onClick={() => openEdit(review)}>
                    Edit
                  </button>
                  <button
                    className="small-action"
                    type="button"
                    onClick={() => setDeleteTarget(review)}
                  >
                    Delete
                  </button>
                  <button className="small-action" type="button" onClick={() => setReportTarget(review)}>
                    Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editState ? (
        <div className="panel light-panel">
          <div className="panel-header">
            <h2>{editState.mode === "create" ? "Submit Review" : "Edit Review"}</h2>
            <button type="button" className="small-action" onClick={() => setEditState(null)}>
              Close
            </button>
          </div>

          <form
            className="profile-grid"
            onSubmit={form.handleSubmit((values) => {
              submitForm(values);
            })}
          >
            <div>
              <p className="field-label">Booking</p>
              <select className="text-input" {...form.register("bookingId")}>
                <option value="">Select booking</option>
                {(bookingsResource.data ?? []).map((booking: { id: string; service?: string }) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.service ? `${booking.service} (${booking.id})` : booking.id}
                  </option>
                ))}
              </select>
              {form.formState.errors.bookingId ? <p className="error-text">{form.formState.errors.bookingId.message}</p> : null}
            </div>

            <div>
              <p className="field-label">Rating</p>
              <StarRatingInput
                value={form.watch("rating")}
                onChange={(value) => form.setValue("rating", value, { shouldValidate: true })}
              />
              {form.formState.errors.rating ? <p className="error-text">{form.formState.errors.rating.message}</p> : null}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <p className="field-label">Comment</p>
              <textarea className="text-input" rows={4} {...form.register("comment")} />
              {form.formState.errors.comment ? <p className="error-text">{form.formState.errors.comment.message}</p> : null}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <p className="field-label">Review Images</p>
              <input
                className="text-input"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  setFiles(selected);
                }}
              />
              {files.length > 0 ? (
                <div className="review-image-row">
                  {files.map((file) => (
                    <img key={file.name} src={URL.createObjectURL(file)} alt={file.name} className="review-thumb" />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="inline-actions" style={{ gridColumn: "1 / -1" }}>
              <button
                type="submit"
                className="small-action"
                disabled={createReviewMutation.isPending || updateReviewMutation.isPending}
              >
                {editState.mode === "create" ? "Submit Review" : "Update Review"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {reportTarget ? (
        <div className="panel light-panel">
          <div className="panel-header">
            <h2>Report Review</h2>
            <button
              type="button"
              className="small-action"
              onClick={() => {
                setReportConfirmOpen(false);
                setReportTarget(null);
              }}
            >
              Close
            </button>
          </div>
          <p className="item-subtitle">{reportTarget.comment}</p>
          <textarea
            rows={3}
            className="text-input"
            placeholder="Reason for report"
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
          />
          <div className="inline-actions">
            <button
              type="button"
              className="small-action"
              disabled={!reportReason || reportReviewMutation.isPending}
              onClick={() => {
                setReportConfirmOpen(true);
              }}
            >
              Submit Report
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Review"
        description="This will remove your review permanently. Are you sure?"
        confirmLabel="Delete"
        isLoading={deleteReviewMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteReviewMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Review deleted");
              setDeleteTarget(null);
            },
            onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to delete review"),
          });
        }}
      />

      <ConfirmDialog
        open={reportConfirmOpen}
        title="Report Review"
        description="You are about to submit this review report to admin moderation."
        confirmLabel="Submit Report"
        isLoading={reportReviewMutation.isPending}
        onCancel={() => setReportConfirmOpen(false)}
        onConfirm={() => {
          if (!reportTarget) return;
          reportReviewMutation.mutate(
            { id: reportTarget.id, reason: reportReason },
            {
              onSuccess: () => {
                toast.success("Review reported");
                setReportReason("");
                setReportTarget(null);
                setReportConfirmOpen(false);
              },
              onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to report review"),
            },
          );
        }}
      />
    </div>
  );
}

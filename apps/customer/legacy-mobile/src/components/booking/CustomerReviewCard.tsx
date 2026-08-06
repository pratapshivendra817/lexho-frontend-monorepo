import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

import { submitCustomerReview } from "../../api/reviewApi";
import { radii, shadows, spacing } from "../../constants/theme";
import type { BookingSummaryDto } from "../../types/contracts";
import { bookingTheme } from "./bookingTheme";

const MAX_REVIEW_CHARS = 500;

function getReviewMeta(booking?: BookingSummaryDto | null) {
  return {
    canReview: booking?.meta?.canReview === true,
    reviewSubmitted: booking?.meta?.reviewSubmitted === true,
  };
}

export function CustomerReviewCard({
  booking,
  onSubmitted,
}: {
  booking?: BookingSummaryDto | null;
  onSubmitted?: () => void;
}) {
  const { canReview, reviewSubmitted } = getReviewMeta(booking);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [validationError, setValidationError] = useState("");

  const submitted = reviewSubmitted || localSubmitted;
  const bookingId = String(booking?.bookingId ?? booking?.id ?? "").trim();

  const submitReview = useMutation({
    mutationFn: () =>
      submitCustomerReview({
        bookingId,
        rating,
        reviewText: comment.trim(),
      }),
    onSuccess: () => {
      setLocalSubmitted(true);
      setValidationError("");
      onSubmitted?.();
    },
    onError: (error: any) => {
      setValidationError(String(error?.message ?? "Unable to submit review. Please try again."));
    },
  });

  if (!canReview && !submitted) {
    return null;
  }

  if (submitted) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Thank you for your feedback</Text>
        <Text style={styles.successStars}>★★★★★</Text>
        <Text style={styles.successText}>Your review has been submitted</Text>
      </View>
    );
  }

  const handleSubmit = () => {
    if (submitReview.isPending) return;
    if (!bookingId) {
      setValidationError("Booking not found.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setValidationError("Rating is mandatory.");
      return;
    }
    if (comment.length > MAX_REVIEW_CHARS) {
      setValidationError(`Comment cannot exceed ${MAX_REVIEW_CHARS} characters.`);
      return;
    }
    setValidationError("");
    submitReview.mutate();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Rate Your Experience</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = value <= rating;
          return (
            <Pressable
              key={value}
              onPress={() => {
                setRating(value);
                setValidationError("");
              }}
              style={styles.starHit}
              accessibilityRole="button"
              accessibilityLabel={`${value} star rating`}
            >
              <Text style={[styles.star, selected && styles.starSelected]}>{selected ? "★" : "☆"}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        mode="outlined"
        label="Comment (optional)"
        value={comment}
        onChangeText={(value: string) => {
          setComment(value.slice(0, MAX_REVIEW_CHARS));
          setValidationError("");
        }}
        multiline
        numberOfLines={4}
        maxLength={MAX_REVIEW_CHARS}
        style={styles.input}
        placeholder="Share your experience"
      />
      <Text style={styles.counter}>{comment.length}/{MAX_REVIEW_CHARS}</Text>
      {validationError ? <Text style={styles.error}>{validationError}</Text> : null}
      <Pressable
        style={[styles.submitBtn, submitReview.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitReview.isPending}
      >
        {submitReview.isPending ? <ActivityIndicator color={bookingTheme.colors.primaryBtnText} /> : <Text style={styles.submitText}>Submit Review</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: bookingTheme.colors.cardBorder,
    backgroundColor: bookingTheme.colors.cardBg,
    padding: spacing.md + 2,
    gap: spacing.sm + 2,
    ...shadows.sm,
  },
  title: { color: bookingTheme.colors.title, fontSize: 18, fontWeight: "900" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  starHit: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  star: { color: bookingTheme.colors.secondaryBtnBorder, fontSize: 34, fontWeight: "900" },
  starSelected: { color: bookingTheme.colors.warning },
  input: { backgroundColor: bookingTheme.colors.cardBg },
  counter: { alignSelf: "flex-end", color: bookingTheme.colors.textMuted, fontSize: 12, fontWeight: "700" },
  error: { color: bookingTheme.colors.danger, fontSize: 12, fontWeight: "800" },
  submitBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: bookingTheme.colors.primaryBtn,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { color: bookingTheme.colors.primaryBtnText, fontWeight: "900" },
  successStars: { color: bookingTheme.colors.warning, fontSize: 28, fontWeight: "900" },
  successText: { color: bookingTheme.colors.textMuted, fontSize: 14, fontWeight: "800" },
});

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { RatingModal } from "../../components/booking/RatingModal";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { addReview } from "../../api/reviewApi";
import { bookingTheme } from "../../components/booking/bookingTheme";

type RatePartnerRoute = { params?: { bookingId?: string } };

export function RatePartnerScreen({ route }: { route: RatePartnerRoute }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const resolvedBookingId = bookingQuery.data?.id ?? bookingId ?? "-";
  const serviceId = String(bookingQuery.data?.serviceId ?? "").trim();
  const [rating, setRating] = useState(5);
  const [open, setOpen] = useState(true);
  const [comment, setComment] = useState("");
  const submitRating = useMutation({
    mutationFn: async () => {
      if (!serviceId) throw new Error("Service id not available yet.");
      const fallbackComment =
        rating >= 5 ? "Excellent service experience." : rating >= 4 ? "Great service." : rating >= 3 ? "Good service." : "Needs improvement.";
      const normalizedComment = String(comment ?? "").trim() || fallbackComment;
      return addReview({ serviceId, rating, comment: normalizedComment });
    },
    onSuccess: () => {
      setOpen(false);
      Alert.alert("Thank you", "Your rating has been submitted.");
    },
    onError: (e: any) => {
      Alert.alert("Rating failed", String(e?.message ?? "Could not submit rating. Please try again."));
    },
  });

  return (
    <BookingStageShell title="Rate Your Experience" subtitle="Your feedback helps us improve partner quality and service consistency.">
      <View style={styles.card}>
        <Text style={styles.row}>Booking ID: {resolvedBookingId}</Text>
        <Text style={styles.row}>Partner: {bookingQuery.data?.partnerName ?? "-"}</Text>
      </View>
      <TextInput
        mode="outlined"
        label="Comment (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        style={styles.input}
        placeholder="Share a quick feedback"
      />
      <Pressable style={styles.btn} onPress={() => setOpen(true)}>
        <Text style={styles.btnText}>Give Rating</Text>
      </Pressable>

      <RatingModal
        visible={open}
        value={rating}
        onChange={setRating}
        onClose={() => setOpen(false)}
        onSubmit={() => {
          if (submitRating.isPending) return;
          submitRating.mutate();
        }}
      />
      {submitRating.isPending ? <Text style={styles.info}>Submitting your rating...</Text> : null}
      {!serviceId ? <Text style={styles.warn}>Service details are loading. Rating submit may fail until loaded.</Text> : null}
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: bookingTheme.radius.card,
    backgroundColor: bookingTheme.colors.cardBg,
    borderWidth: 1,
    borderColor: bookingTheme.colors.cardBorder,
    padding: 14,
    gap: 7,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: "#FFFFFF" },
  btn: { borderRadius: bookingTheme.radius.button, backgroundColor: bookingTheme.colors.primaryBtn, alignItems: "center", paddingVertical: 13, marginTop: 8 },
  btnText: { color: bookingTheme.colors.primaryBtnText, fontWeight: "900", letterSpacing: 0.2 },
  info: { color: bookingTheme.colors.success, fontSize: 12, fontWeight: "800" },
  warn: { color: bookingTheme.colors.warning, fontSize: 12, fontWeight: "800" },
});

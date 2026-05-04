import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useEffect } from "react";
import LinearGradient from "react-native-linear-gradient";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchBookingHistory } from "../../redux/bookingSlice";
import { palette } from "../../constants/theme";

export function BookingHistoryScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { history, loading, error } = useAppSelector((s) => s.booking);
  useEffect(() => { dispatch(fetchBookingHistory()); }, [dispatch]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.hero}>
        <Text style={styles.heroTitle}>Track every booking live</Text>
        <Text style={styles.heroSub}>Reschedule, cancel, and follow provider ETA in real time.</Text>
      </LinearGradient>
      <View style={styles.actionRow}>
        <Button mode="outlined" onPress={() => navigation.navigate("BookingDetail")}>Booking Detail</Button>
        <Button mode="contained-tonal" onPress={() => navigation.navigate("LiveTracking")}>Live Tracking</Button>
      </View>
      {loading ? <SkeletonList rows={4} /> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {!loading ? (
        <FlatList
          data={history}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.item}>{item?.serviceName ?? "Service booking"}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>Status</Text>
                  <View style={styles.statusChip}>
                    <Text style={styles.statusText}>{String(item?.status ?? "Scheduled")}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={<EmptyStateCard title="No bookings yet" subtitle="Your upcoming bookings will appear here." />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12, backgroundColor: palette.surfaceAlt },
  hero: { borderRadius: 18, padding: 14, marginBottom: 2 },
  heroTitle: { color: "#F8FAFC", fontWeight: "800", fontSize: 18 },
  heroSub: { color: "#CBD5E1", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10 },
  card: { borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.card },
  item: { fontWeight: "700", color: palette.text, fontSize: 15 },
  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { color: palette.muted, fontSize: 12 },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  statusText: { color: "#1D4ED8", fontWeight: "700", fontSize: 11 },
  err: { color: "#DC2626" },
});

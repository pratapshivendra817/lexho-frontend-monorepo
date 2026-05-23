import { useQuery } from "@tanstack/react-query";
import { Animated, FlatList, PanResponder, Pressable, Share, StyleSheet, TouchableOpacity, Vibration, View } from "react-native";
import { ActivityIndicator, Chip, Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { getBookingsHistory } from "../../api/bookingApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import type { BookingSummaryDto } from "../../types/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { ENABLE_LIVE_TRACKING } from "../../constants/env";

const STATUS_FILTERS = ["ALL", "PENDING", "COMPLETED", "CANCELLED"] as const;
const STATUS_META: Record<(typeof STATUS_FILTERS)[number], { label: string; icon: string }> = {
  ALL: { label: "All", icon: "view-grid-outline" },
  PENDING: { label: "Pending", icon: "clock-outline" },
  COMPLETED: { label: "Completed", icon: "check-circle-outline" },
  CANCELLED: { label: "Cancelled", icon: "close-circle-outline" },
};

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString();
}

function statusColor(status?: string) {
  const s = String(status ?? "").toUpperCase();
  if (s.includes("CANCEL")) return "#B91C1C";
  if (s.includes("COMPLETE")) return "#166534";
  if (s.includes("PENDING")) return "#92400E";
  return "#1D4ED8";
}

function triggerHaptic(ms = 8) {
  try {
    if (typeof Vibration?.vibrate === "function") Vibration.vibrate(ms);
  } catch {
    // Ignore on devices/simulators where vibration is unavailable.
  }
}

export function BookingHistoryScreen({
  navigation,
}: {
  navigation: { navigate: (route: string, params?: Record<string, unknown>) => void };
}) {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [segmentWidth, setSegmentWidth] = useState(0);
  const sliderX = useRef(new Animated.Value(0)).current;

  const selectFilter = useMemo(
    () => (next: (typeof STATUS_FILTERS)[number]) => {
      if (next === filter) return;
      setFilter(next);
      triggerHaptic(8);
    },
    [filter],
  );

  const moveToNextFilter = useMemo(() => {
    return (direction: "left" | "right") => {
      const currentIndex = STATUS_FILTERS.indexOf(filter);
      const nextIndex =
        direction === "left"
          ? Math.min(STATUS_FILTERS.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      if (nextIndex !== currentIndex) selectFilter(STATUS_FILTERS[nextIndex]);
    };
  }, [filter, selectFilter]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 22 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) moveToNextFilter("left");
          if (gestureState.dx > 40) moveToNextFilter("right");
        },
      }),
    [moveToNextFilter],
  );

  useEffect(() => {
    const index = STATUS_FILTERS.indexOf(filter);
    const width = segmentWidth > 0 ? segmentWidth / STATUS_FILTERS.length : 0;
    Animated.spring(sliderX, {
      toValue: width * Math.max(index, 0),
      stiffness: 180,
      damping: 18,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [filter, segmentWidth, sliderX]);

  const historyQuery = useQuery({
    queryKey: ["customer-booking-history"],
    queryFn: getBookingsHistory,
  });

  const rows = useMemo(
    () => (Array.isArray(historyQuery.data) ? historyQuery.data : []),
    [historyQuery.data],
  );
  const filteredRows = useMemo(() => {
    if (filter === "ALL") return rows;
    return rows.filter((row) => String(row?.status ?? "").toUpperCase().includes(filter));
  }, [filter, rows]);

  const onShareBooking = async (item: BookingSummaryDto) => {
    const message = [
      `Booking Summary`,
      `Booking ID: ${String(item?.id ?? "N/A")}`,
      `Service: ${item?.serviceName ?? "N/A"}`,
      `Status: ${String(item?.status ?? "PENDING")}`,
      `Created: ${formatDate(item?.createdAt)}`,
    ].join("\n");
    await Share.share({ title: "Booking Summary", message });
  };

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>My Bookings</Text>
        </View>
        <Text style={styles.heroSub}>Track status, schedule, and payment in one place.</Text>
      </View>

      <View style={styles.segmentWrap} onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width)}>
        {segmentWidth > 0 ? (
          <Animated.View
            style={[
              styles.segmentSlider,
              { width: segmentWidth / STATUS_FILTERS.length, transform: [{ translateX: sliderX }] },
            ]}
          />
        ) : null}
        {STATUS_FILTERS.map((key) => (
          <Pressable key={key} style={styles.segmentItem} onPress={() => selectFilter(key)}>
            <View style={styles.segmentInner}>
              <MaterialCommunityIcon
                name={STATUS_META[key].icon}
                size={14}
                color={filter === key ? "#0F172A" : "#64748B"}
              />
              <Text style={[styles.segmentText, filter === key ? styles.segmentTextActive : null]}>
                {STATUS_META[key].label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {historyQuery.isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator />
        </View>
      ) : null}

      {historyQuery.isError ? (
        <EmptyStateCard title="Could not load bookings" subtitle="Please retry after a moment." />
      ) : null}

      {!historyQuery.isLoading && !historyQuery.isError ? (
        <FlatList
          data={filteredRows}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: BookingSummaryDto }) => {
            const status = String(item?.status ?? "PENDING");
            const bookingType = String(item?.bookingType ?? "").toUpperCase();
            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("BookingDetail", { bookingId: String(item?.id ?? "") })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.serviceName}>{item?.serviceName ?? "Service booking"}</Text>
                  <Chip
                    compact
                    textStyle={styles.statusText}
                    style={[styles.statusChip, { backgroundColor: `${statusColor(status)}22` }]}
                  >
                    {status}
                  </Chip>
                </View>
                <Text style={styles.meta}>Booking ID: {String(item?.id ?? "N/A")}</Text>
                <Text style={styles.meta}>{formatDate(item?.createdAt)}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() =>
                      bookingType === "SCHEDULED"
                        ? navigation.navigate("ScheduledBookingStatus", { bookingId: String(item?.id ?? "") })
                        : ENABLE_LIVE_TRACKING
                          ? navigation.navigate("LiveTracking", { bookingId: String(item?.id ?? "") })
                          : navigation.navigate("PaymentStatus", { bookingId: String(item?.id ?? "") })
                    }
                  >
                    <Text style={styles.actionHint}>Track status</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareBooking(item)}>
                    <MaterialCommunityIcon name="share-variant-outline" size={16} color="#1D4ED8" />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyStateCard title="No bookings found" subtitle="Try a different status filter." />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EEF4FF", padding: 14, gap: 12 },
  hero: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 24,
    minHeight: 120,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  heroTitle: { color: "#F8FAFC", fontSize: 22, fontWeight: "900" },
  heroSub: { color: "#CBD5E1", marginTop: 6, fontSize: 13 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segmentWrap: {
    borderRadius: 999,
    backgroundColor: "#DDE8FF",
    flexDirection: "row",
    padding: 4,
    position: "relative",
    overflow: "hidden",
  },
  segmentSlider: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  segmentInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  segmentText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  segmentTextActive: { color: "#0F172A" },
  loaderWrap: { paddingTop: 14, alignItems: "center" },
  listContent: { gap: 10, paddingVertical: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 15,
    gap: 7,
    shadowColor: "#93C5FD",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  serviceName: { color: "#0F172A", fontWeight: "800", fontSize: 16, flex: 1 },
  statusChip: { borderRadius: 999, borderWidth: 1, borderColor: "#E2E8F0" },
  statusText: { fontSize: 11, fontWeight: "800", color: "#0F172A" },
  meta: { color: "#475569", fontSize: 12 },
  actionHint: { color: "#1D4ED8", fontWeight: "700", marginTop: 4, fontSize: 12 },
  cardActions: { marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
  },
  shareBtnText: { color: "#1D4ED8", fontSize: 11, fontWeight: "700" },
});

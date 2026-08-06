// @refresh reset
import {
  Animated,
  FlatList,
  Linking,
  Pressable,
  SectionList,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { Chip, Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { getBookingsHistoryPage } from "../../api/bookingApi";
import { getBookingDetails } from "../../api/bookingExtrasApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { resolveLifecycleTarget } from "../../hooks/useBookingLifecycleNavigation";
import type { BookingSummaryDto } from "../../types/contracts";
import { getBookingMeta } from "../../utils/bookingMeta";
import { BookingTimeline } from "../../components/booking/BookingTimeline";
import { useEffect, useRef, useState } from "react";
import { COLORS } from "../../theme/colors";
import { radii, shadows, spacing } from "../../constants/theme";

const BOOKING_TABS = ["INSTANT", "SCHEDULED", "SUBSCRIPTIONS"] as const;
const PAGE_SIZE = 12;

const TAB_META: Record<(typeof BOOKING_TABS)[number], { label: string; icon: string }> = {
  INSTANT: { label: "Instant", icon: "flash-outline" },
  SCHEDULED: { label: "Scheduled", icon: "calendar-clock" },
  SUBSCRIPTIONS: { label: "Subscriptions", icon: "calendar-refresh-outline" },
};

type RowSection = { title: string; data: BookingSummaryDto[] };
type HistorySectionsState = {
  instantBookings: BookingSummaryDto[];
  scheduledBookings: BookingSummaryDto[];
  subscriptions: BookingSummaryDto[];
};

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString();
}

function formatShortDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function triggerHaptic(ms = 8) {
  try {
    if (typeof Vibration?.vibrate === "function") Vibration.vibrate(ms);
  } catch {
    // Ignore unsupported vibration.
  }
}

function sortRows(rows: BookingSummaryDto[]) {
  const list = [...rows];
  return list.sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime());
}

function isSubscription(row: BookingSummaryDto) {
  return String(row?.bookingType ?? "").toUpperCase() === "SUBSCRIPTION" || Boolean((row as any)?.subscriptionId);
}

function metaSection(row: BookingSummaryDto, fallback: string) {
  const meta = getBookingMeta(row);
  return String((meta as any)?.historySection ?? (meta as any)?.subscriptionSection ?? fallback).trim() || fallback;
}

function createTabSections(rows: BookingSummaryDto[], tab: (typeof BOOKING_TABS)[number]): RowSection[] {
  if (tab === "SUBSCRIPTIONS") {
    const buckets = new Map<string, BookingSummaryDto[]>();
    rows.filter(isSubscription).forEach((row) => {
      const title = metaSection(row, "Subscription Plans");
      buckets.set(title, [...(buckets.get(title) ?? []), row]);
    });
    return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
  }

  if (tab === "INSTANT") {
    const instant = rows.filter((row) => !isSubscription(row) && String(row?.bookingType ?? "").toUpperCase() === "INSTANT");
    const buckets = new Map<string, BookingSummaryDto[]>();
    instant.forEach((row) => {
      const title = metaSection(row, "Instant Bookings");
      buckets.set(title, [...(buckets.get(title) ?? []), row]);
    });
    return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
  }

  const scheduled = rows.filter((row) => !isSubscription(row) && String(row?.bookingType ?? "").toUpperCase() === "SCHEDULED");
  const buckets = new Map<string, BookingSummaryDto[]>();
  scheduled.forEach((row) => {
    const title = metaSection(row, "Scheduled Bookings");
    buckets.set(title, [...(buckets.get(title) ?? []), row]);
  });
  return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
}

function BookingCard({
  item,
  onTrack,
  onShare,
  onSupport,
  onRebook,
  navigation,
}: {
  item: BookingSummaryDto;
  onTrack: (row: BookingSummaryDto) => void;
  onShare: (row: BookingSummaryDto) => void;
  onSupport: () => void;
  onRebook: (row: BookingSummaryDto) => void;
  navigation: { navigate: (route: string, params?: Record<string, unknown>) => void };
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const status = String(item?.status ?? "PENDING");
  const bookingType = String(item?.bookingType ?? "").toUpperCase();
  const isSubscription = bookingType === "SUBSCRIPTION" || Boolean((item as any)?.subscriptionId);
  const amount = Number(item?.totalAmount ?? item?.amount ?? 0);
  const subscriptionPlan =
    String((item as any)?.frequencyLabel ?? "").trim() ||
    (Array.isArray((item as any)?.frequencyDays) ? (item as any).frequencyDays.filter(Boolean).join(", ") : "");
  const nextVisit = String((item as any)?.nextVisitDate ?? (item as any)?.nextServiceDate ?? "").trim();
  const remainingVisits = Number((item as any)?.remainingVisits ?? (item as any)?.visits ?? 0);
  const meta = getBookingMeta(item);
  const statusColor = String((meta as any)?.statusColor ?? COLORS.blue600);
  const paymentLabel = String((meta as any)?.paymentLabel ?? item?.paymentStatus ?? "").trim();

  return (
    <View style={styles.swipeWrap}>
      <View style={styles.swipeBgRow} pointerEvents="none">
        <View style={styles.swipeLeftBg}><Text style={styles.swipeLabel}>Rebook</Text></View>
        <View style={styles.swipeRightBg}><Text style={styles.swipeLabel}>Cancel</Text></View>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }}>
        <Pressable
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={`Booking ${String(item?.id ?? "")} ${item?.serviceName ?? "Service"} ${status}`}
          onPress={() => navigation.navigate("BookingDetail", { bookingId: String(item?.id ?? "") })}
        >
          <View style={styles.cardTop}>
            <Text style={styles.serviceName} numberOfLines={1}>{item?.serviceName ?? "Service booking"}</Text>
            <Chip compact textStyle={styles.statusText} style={[styles.statusChip, { backgroundColor: `${statusColor}22` }]}>
              {status}
            </Chip>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>#{String(item?.id ?? "N/A")}</Text>
            <Text style={styles.meta}>{isSubscription ? "SUBSCRIPTION" : bookingType || "N/A"}</Text>
            {paymentLabel ? <Text style={styles.meta}>{paymentLabel}</Text> : null}
            <Text style={styles.amount}>{amount > 0 ? `Rs ${amount}` : "-"}</Text>
          </View>

          {isSubscription ? (
            <>
              <Text style={styles.meta} numberOfLines={1}>{subscriptionPlan ? `Plan: ${subscriptionPlan}` : "Plan: Subscription"}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {nextVisit ? `Next visit: ${formatShortDate(nextVisit)}` : "Upcoming visits will appear here"}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {remainingVisits > 0 ? `Remaining visits: ${remainingVisits}` : "Remaining visits: -"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.meta}>{formatDate(item?.createdAt)}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item?.partnerName ? `Partner: ${item.partnerName}` : "Partner: Not assigned"}</Text>
            </>
          )}

          <BookingTimeline history={item.statusHistory} compact />

          <View style={styles.cardActions}>
            <TouchableOpacity accessibilityLabel="Track booking" onPress={() => onTrack(item)} style={styles.actionIconBtn}>
              <MaterialCommunityIcon name={isSubscription ? "calendar-text-outline" : "crosshairs-gps"} size={15} color={COLORS.goldSoft} />
              <Text style={styles.actionIconText}>{isSubscription ? "View Plan" : meta.canTrackPartner === false ? "View" : "Track"}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Call support" onPress={onSupport} style={styles.actionIconBtn}>
              <MaterialCommunityIcon name="headset" size={15} color={COLORS.goldSoft} />
              <Text style={styles.actionIconText}>{isSubscription ? "Call Support" : "Support"}</Text>
            </TouchableOpacity>
            {(isSubscription || meta.canReschedule) ? (
            <TouchableOpacity accessibilityLabel="Rebook" onPress={() => onRebook(item)} style={styles.actionIconBtn}>
              <MaterialCommunityIcon name={isSubscription ? "calendar-edit" : "refresh"} size={15} color={COLORS.goldSoft} />
              <Text style={styles.actionIconText}>{isSubscription ? "Manage" : "Rebook"}</Text>
            </TouchableOpacity>
            ) : null}
            {isSubscription && meta.canPause ? (
              <TouchableOpacity accessibilityLabel="Pause subscription" onPress={() => onSupport()} style={styles.actionIconBtn}>
                <MaterialCommunityIcon name="pause-circle-outline" size={15} color={COLORS.goldSoft} />
                <Text style={styles.actionIconText}>Pause</Text>
              </TouchableOpacity>
            ) : null}
            {isSubscription && meta.canResume ? (
              <TouchableOpacity accessibilityLabel="Resume subscription" onPress={() => onSupport()} style={styles.actionIconBtn}>
                <MaterialCommunityIcon name="play-circle-outline" size={15} color={COLORS.goldSoft} />
                <Text style={styles.actionIconText}>Resume</Text>
              </TouchableOpacity>
            ) : null}
            {isSubscription && meta.canCancel ? (
              <TouchableOpacity accessibilityLabel="Cancel subscription" onPress={() => onSupport()} style={styles.actionIconBtn}>
                <MaterialCommunityIcon name="close-circle-outline" size={15} color={COLORS.goldSoft} />
                <Text style={styles.actionIconText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity accessibilityLabel="Share booking" onPress={() => onShare(item)} style={styles.actionIconBtn}>
              <MaterialCommunityIcon name="share-variant-outline" size={15} color={COLORS.goldSoft} />
              <Text style={styles.actionIconText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skLong} />
      <View style={styles.skMed} />
      <View style={styles.skShort} />
      <View style={styles.timelineRow}>
        <View style={styles.skDot} />
        <View style={styles.skDot} />
        <View style={styles.skDot} />
        <View style={styles.skDot} />
      </View>
    </View>
  );
}

export function BookingHistoryScreen({
  navigation,
}: {
  navigation: { navigate: (route: string, params?: Record<string, unknown>) => void; goBack?: () => void };
}) {
  const [activeTab, setActiveTab] = useState<(typeof BOOKING_TABS)[number]>("INSTANT");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BookingSummaryDto[]>([]);
  const [backendSections, setBackendSections] = useState<HistorySectionsState>({
    instantBookings: [],
    scheduledBookings: [],
    subscriptions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = async (nextPage = 0, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setIsError(false);
    try {
      const data = await getBookingsHistoryPage({ page: nextPage, size: PAGE_SIZE });
      const incoming = Array.isArray(data.items) ? data.items : [];
      const previousIds = new Set(rows.map((row) => String(row.id)));
      const appendedNewRows = !append || incoming.some((row) => !previousIds.has(String(row.id)));
      setRows((previous) => {
        if (!append) return incoming;
        const merged = new Map<string, BookingSummaryDto>();
        previous.forEach((row) => merged.set(String(row.id), row));
        incoming.forEach((row) => merged.set(String(row.id), row));
        return Array.from(merged.values());
      });
      setBackendSections((previous) => ({
        instantBookings: append ? [...previous.instantBookings, ...(data.instantBookings ?? [])] : (data.instantBookings ?? []),
        scheduledBookings: append ? [...previous.scheduledBookings, ...(data.scheduledBookings ?? [])] : (data.scheduledBookings ?? []),
        subscriptions: append ? [...previous.subscriptions, ...(data.subscriptions ?? [])] : (data.subscriptions ?? []),
      }));
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore) && appendedNewRows);
    } catch {
      if (!append) setRows([]);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    // Initial load only.
    void fetchHistory();
  }, []);

  const q = String(query ?? "").trim().toLowerCase();
  const sectionSource =
    activeTab === "INSTANT"
      ? backendSections.instantBookings
      : activeTab === "SCHEDULED"
        ? backendSections.scheduledBookings
        : backendSections.subscriptions;
  let filteredRows = sectionSource.length > 0 ? sectionSource : Array.isArray(rows) ? rows : [];

  if (q) {
    filteredRows = filteredRows.filter((row) => {
      const id = String(row?.id ?? "").toLowerCase();
      const service = String(row?.serviceName ?? "").toLowerCase();
      const partner = String(row?.partnerName ?? "").toLowerCase();
      return id.indexOf(q) !== -1 || service.indexOf(q) !== -1 || partner.indexOf(q) !== -1;
    });
  }

  if (sectionSource.length === 0 && activeTab === "SUBSCRIPTIONS") {
    filteredRows = filteredRows.filter(isSubscription);
  } else if (sectionSource.length === 0) {
    filteredRows = filteredRows.filter((row) => {
      if (isSubscription(row)) return false;
      return String(row?.bookingType ?? "").toUpperCase() === activeTab;
    });
  }

  filteredRows = sortRows(filteredRows);

  const sections = createTabSections(filteredRows, activeTab);

  const onShareBooking = async (item: BookingSummaryDto) => {
    const message = [
      "Booking Summary",
      `Booking ID: ${String(item?.id ?? "N/A")}`,
      `Service: ${item?.serviceName ?? "N/A"}`,
      `Status: ${String(item?.status ?? "PENDING")}`,
      `Created: ${formatDate(item?.createdAt)}`,
    ].join("\n");
    await Share.share({ title: "Booking Summary", message });
  };

  const onTrack = async (item: BookingSummaryDto) => {
    const bookingId = String(item?.id ?? "").trim();
    if (!bookingId) return;
    if (isSubscription(item)) {
      navigation.navigate("SubscriptionPlan", { subscriptionId: String((item as any)?.subscriptionId ?? item?.id ?? "").trim() });
      return;
    }
    try {
      const latest = await getBookingDetails(bookingId);
      const target = resolveLifecycleTarget(latest);
      navigation.navigate(target.name ?? "BookingDetail", { bookingId });
    } catch {
      navigation.navigate("BookingDetail", { bookingId });
    }
  };

  const onSupport = async () => {
    const supportPhone = "18001234567";
    try {
      await Linking.openURL(`tel:${supportPhone}`);
    } catch {
      navigation.navigate("Support");
    }
  };

  const onRebook = (item: BookingSummaryDto) => {
    const bookingType = String(item?.bookingType ?? "").toUpperCase();
    if (bookingType === "SUBSCRIPTION" || Boolean((item as any)?.subscriptionId)) {
      navigation.navigate("RecurringBooking");
      return;
    }
    const serviceId = String(item?.serviceId ?? "").trim();
    if (serviceId) {
      navigation.navigate("CartCrud", { serviceId: Number(serviceId) });
      return;
    }
    navigation.navigate("ServiceList", { categoryId: "all", categoryName: "Services" });
  };

  const loadMore = () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void fetchHistory(page + 1, true);
  };

  const emptyState = (() => {
    if (isError) {
      return <EmptyStateCard title="Could not load bookings" subtitle="Please retry after a moment." onPress={() => void fetchHistory()} />;
    }
    if (String(query ?? "").trim().length > 0) {
      return <EmptyStateCard title="No matching bookings" subtitle="Try another keyword or clear search." />;
    }
    if (activeTab === "SUBSCRIPTIONS") return <EmptyStateCard title="No subscriptions yet" subtitle="Active plans will appear here." />;
    return <EmptyStateCard title={`No ${TAB_META[activeTab].label.toLowerCase()} bookings yet`} subtitle="Book your first service now." />;
  })();

  return (
    <View style={styles.root}>
      <View style={styles.heroPlain}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (typeof navigation.goBack === "function") navigation.goBack();
              else navigation.navigate("Home");
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
          >
            <MaterialCommunityIcon name="arrow-left" size={20} color={COLORS.goldSoft} />
          </Pressable>
          <Text style={styles.heroTitle}>My Bookings</Text>
        </View>
      </View>

      <View style={styles.controlsWrap}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcon name="magnify" size={18} color={COLORS.goldSoft} />
          <TextInput
            placeholder="Search by Booking ID"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.slate500}
            accessibilityLabel="Search bookings"
          />
        </View>

        <FlatList
          horizontal
          data={BOOKING_TABS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const active = activeTab === item;
            const label = TAB_META[item].label;
            const icon = TAB_META[item].icon;
            return (
              <Pressable
                onPress={() => {
                  setActiveTab(item);
                  triggerHaptic(8);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${label} bookings`}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <MaterialCommunityIcon name={icon} size={14} color={COLORS.white} />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              </Pressable>
            );
          }}
        />

      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : null}

      {!isLoading ? (
        sections.length > 0 ? (
          <SectionList
            sections={sections}
            keyExtractor={(item, idx) => `${String(item?.id ?? "")}-${idx}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{section.title}</Text></View>
            )}
            renderItem={({ item }) => (
              <BookingCard
                item={item}
                navigation={navigation}
                onTrack={onTrack}
                onShare={(row) => void onShareBooking(row)}
                onSupport={() => void onSupport()}
                onRebook={onRebook}
              />
            )}
            onEndReachedThreshold={0.5}
            onEndReached={loadMore}
            ListFooterComponent={
              hasMore ? (
                <Pressable style={styles.loadMoreBtn} onPress={loadMore}>
                  <Text style={styles.loadMoreText}>{isLoadingMore ? "Loading..." : "Load more"}</Text>
                </Pressable>
              ) : null
            }
          />
        ) : (
          <View style={styles.emptyStateWrap}>{emptyState}</View>
        )
      ) : null}

      {!isLoading && filteredRows.length > 0 && String(query ?? "").trim() ? (
        <Pressable
          style={styles.clearBtn}
          onPress={() => {
            setQuery("");
          }}
        >
          <Text style={styles.clearBtnText}>Clear filters</Text>
        </Pressable>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark, paddingHorizontal: 0, paddingTop: 0, gap: spacing.sm },
  heroPlain: { paddingHorizontal: spacing.md + 2, paddingTop: spacing.md, paddingBottom: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: {
    minHeight: 34,
    minWidth: 34,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#001a4d",
  },
  heroTitle: { color: COLORS.white, fontSize: 22, fontWeight: "900" },
  controlsWrap: { gap: 8, paddingTop: 2, paddingBottom: 2, paddingHorizontal: 0 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#001a4d",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: COLORS.white,
    minHeight: 44,
  },
  chipsRow: { gap: 8, paddingVertical: 2, paddingLeft: 0, paddingRight: spacing.md + 2 },
  filterChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "#001a4d",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
  },
  filterChipActive: { backgroundColor: "rgba(217,164,65,0.2)", borderColor: COLORS.goldSoft },
  filterChipText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: COLORS.goldSoft },
  quickRow: { gap: 8 },
  quickGroup: { flexDirection: "row", gap: 8 },
  compactFilterRow: { flexDirection: "row", gap: 8 },
  compactSelector: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    backgroundColor: "rgba(217,164,65,0.12)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 52,
  },
  compactSelectorLabel: { color: COLORS.neutral100, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  compactSelectorValue: { color: COLORS.white, fontSize: 12, fontWeight: "900", marginTop: 3 },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(217,164,65,0.1)",
  },
  advancedToggleText: { color: COLORS.goldSoft, fontSize: 11, fontWeight: "800" },
  quickPill: { minHeight: 38, borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: radii.pill, paddingHorizontal: 10, justifyContent: "center", backgroundColor: "#001a4d" },
  quickPillActive: { backgroundColor: "rgba(217,164,65,0.2)", borderColor: COLORS.goldSoft },
  quickText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  quickTextActive: { color: COLORS.goldSoft },
  sortPill: { minHeight: 36, borderRadius: radii.pill, borderWidth: 1, borderColor: COLORS.goldSoft, paddingHorizontal: 10, justifyContent: "center", backgroundColor: "#001a4d" },
  sortPillActive: { backgroundColor: "rgba(217,164,65,0.2)" },
  sortText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  sortTextActive: { color: COLORS.goldSoft },
  loaderWrap: { gap: 10, paddingTop: 4, paddingHorizontal: spacing.md + 2 },
  emptyStateWrap: { gap: 10, paddingTop: 4, paddingHorizontal: 0 },
  listContent: { paddingBottom: spacing.xl, gap: 8, paddingHorizontal: spacing.md + 2 },
  sectionHeader: { paddingVertical: 6, backgroundColor: COLORS.navyDark },
  sectionHeaderText: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.3 },
  swipeWrap: { position: "relative" },
  swipeBgRow: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", justifyContent: "space-between" },
  swipeLeftBg: { flex: 1, justifyContent: "center", alignItems: "flex-start", paddingLeft: 16, backgroundColor: "rgba(217,164,65,0.22)", borderRadius: radii.lg },
  swipeRightBg: { flex: 1, justifyContent: "center", alignItems: "flex-end", paddingRight: 16, backgroundColor: "rgba(217,164,65,0.22)", borderRadius: radii.lg },
  swipeLabel: { color: COLORS.white, fontWeight: "800", fontSize: 12 },
  card: {
    backgroundColor: "#001a4d",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    padding: spacing.md + 3,
    gap: spacing.xs + 2,
    minHeight: 154,
    ...shadows.md,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  serviceName: { color: COLORS.white, fontWeight: "900", fontSize: 17, flex: 1 },
  statusChip: { borderRadius: radii.pill, borderWidth: 1, borderColor: COLORS.goldSoft },
  statusText: { fontSize: 11, fontWeight: "900", color: COLORS.white },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { color: COLORS.neutral100, fontSize: 12, fontWeight: "600" },
  amount: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "900", marginLeft: "auto" },
  paid: { color: COLORS.goldSoft },
  unpaid: { color: COLORS.error },
  timelineRow: { marginTop: 3, flexDirection: "row", gap: 6 },
  timelineStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" },
  timelineStepActive: { backgroundColor: COLORS.goldSoft },
  cardActions: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  actionIconBtn: {
    minHeight: 36,
    minWidth: 72,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    paddingHorizontal: 6,
    backgroundColor: "rgba(217,164,65,0.12)",
  },
  actionIconText: { color: COLORS.goldSoft, fontWeight: "800", fontSize: 11 },
  loadMoreBtn: { borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: radii.md, backgroundColor: "#001a4d", alignItems: "center", paddingVertical: 10, marginTop: 10 },
  loadMoreText: { color: COLORS.white, fontWeight: "800" },
  clearBtn: { borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: radii.md, paddingVertical: 10, alignItems: "center", backgroundColor: "#001a4d" },
  clearBtnText: { color: COLORS.goldSoft, fontWeight: "800" },
  skLong: { height: 14, borderRadius: 7, width: "86%", backgroundColor: "rgba(148,163,184,0.25)" },
  skMed: { height: 12, borderRadius: 6, width: "66%", backgroundColor: "rgba(148,163,184,0.22)" },
  skShort: { height: 12, borderRadius: 6, width: "42%", backgroundColor: "rgba(148,163,184,0.18)" },
  skDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(148,163,184,0.24)" },
});

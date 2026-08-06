import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Animated, PanResponder, Pressable, ScrollView, SectionList, Share, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Searchbar, Text } from "react-native-paper";
import { deleteNotification, getNotifications, markNotificationRead } from "../../api/notificationApi";
import { ENABLE_LIVE_TRACKING } from "../../constants/env";
import { COLORS } from "../../theme/colors";
import { useAppSelector } from "../../redux/hooks";

type RawNotification = Record<string, any>;
type Category = "BOOKING" | "PAYMENT" | "SUPPORT" | "GENERAL";
type TabKey = "ALL" | "UNREAD";
type SectionRow = { title: string; data: RawNotification[] };

const SWIPE_ACTION_WIDTH = 152;

function toStringSafe(value: unknown) {
  return String(value ?? "").trim();
}

function parseDate(value: unknown) {
  const raw = toStringSafe(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCreatedAt(row: RawNotification) {
  return (
    row?.createdAt ??
    row?.created_on ??
    row?.createdDate ??
    row?.timestamp ??
    row?.time ??
    null
  );
}

function getNotificationId(row: RawNotification, idx: number) {
  const id = toStringSafe(row?.id ?? row?.notificationId ?? row?.eventId ?? row?._id ?? "");
  return id || `notification-${idx}`;
}

function getTitle(row: RawNotification) {
  return toStringSafe(row?.title ?? row?.subject ?? "Notification");
}

function getMessage(row: RawNotification) {
  return toStringSafe(row?.message ?? row?.body ?? row?.description ?? "");
}

function isRead(row: RawNotification) {
  const readValue = row?.read ?? row?.isRead ?? row?.seen ?? row?.is_seen;
  if (typeof readValue === "boolean") return readValue;
  const text = toStringSafe(readValue).toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "read";
}

function getRedirectType(row: RawNotification) {
  return toStringSafe(
    row?.redirectType ??
      row?.referenceType ??
      row?.notificationType ??
      row?.type ??
      row?.data?.redirectType ??
      row?.data?.referenceType ??
      row?.data?.notificationType ??
      row?.data?.type ??
      row?.meta?.redirectType ??
      "",
  ).toUpperCase();
}

function getBookingId(row: RawNotification) {
  return toStringSafe(
    row?.bookingId ??
      row?.booking_id ??
      row?.redirectValue ??
      row?.referenceId ??
      row?.data?.bookingId ??
      row?.data?.redirectValue ??
      row?.data?.referenceId ??
      row?.data?.id ??
      "",
  );
}

function getCategory(row: RawNotification): Category {
  const redirectType = getRedirectType(row);
  const text = `${getTitle(row)} ${getMessage(row)} ${redirectType}`.toUpperCase();
  if (text.includes("PAYMENT") || text.includes("REFUND")) return "PAYMENT";
  if (text.includes("BOOKING") || text.includes("PARTNER") || text.includes("TRACKING")) return "BOOKING";
  if (text.includes("SUPPORT") || text.includes("TICKET")) return "SUPPORT";
  return "GENERAL";
}

function getCategoryLabel(category: Category) {
  if (category === "GENERAL") return "INFO";
  return category;
}

function formatWhen(row: RawNotification) {
  const parsed = parseDate(getCreatedAt(row));
  if (!parsed) return "Just now";
  const now = Date.now();
  const diffMs = Math.max(0, now - parsed.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return parsed.toLocaleString();
}

function getGroup(row: RawNotification) {
  const parsed = parseDate(getCreatedAt(row));
  if (!parsed) return "Earlier";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const days = Math.floor((startToday - startTarget) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return "Earlier";
}

function routeFromNotification(item: RawNotification) {
  const redirectType = getRedirectType(item);
  const bookingId = getBookingId(item);
  if (redirectType === "NOTIFICATIONS") return { name: "Notifications" as const, params: undefined };
  if (redirectType === "PROMOTION" || redirectType === "PROMOTIONAL_OFFER") return { name: "Coupon" as const, params: undefined };
  if (redirectType === "SUBSCRIPTION" || redirectType === "SUBSCRIPTION_REMINDER") {
    return { name: "Main" as const, params: { screen: "Bookings" } };
  }
  if (redirectType === "PAYMENT" || redirectType === "PAYMENTSTATUS") {
    return { name: "PaymentStatus" as const, params: bookingId ? { bookingId } : undefined };
  }
  if (redirectType === "INSTANT_BOOKING" || redirectType === "SEARCHING_PARTNER") {
    return { name: "InstantBookingStatus" as const, params: bookingId ? { bookingId } : undefined };
  }
  if (redirectType === "SCHEDULED_BOOKING") {
    return { name: "ScheduledBookingStatus" as const, params: bookingId ? { bookingId } : undefined };
  }
  if (redirectType === "TRACKING") {
    if (ENABLE_LIVE_TRACKING) {
      return { name: "LiveTracking" as const, params: bookingId ? { bookingId } : undefined };
    }
    if (bookingId) return { name: "BookingDetail" as const, params: { bookingId } };
    return { name: "Main" as const, params: { screen: "Bookings" } };
  }
  if (redirectType === "SUPPORT" || redirectType === "TICKET") return { name: "Support" as const, params: undefined };
  if (
    redirectType === "BOOKING" ||
    redirectType === "BOOKING_CONFIRMED" ||
    redirectType === "PROFESSIONAL_ASSIGNED" ||
    redirectType === "PROFESSIONAL_ON_THE_WAY" ||
    redirectType === "SERVICE_STARTED" ||
    redirectType === "SERVICE_COMPLETED"
  ) {
    if (bookingId) return { name: "BookingDetail" as const, params: { bookingId } };
    return { name: "Main" as const, params: { screen: "Bookings" } };
  }
  if (bookingId) return { name: "BookingDetail" as const, params: { bookingId } };
  return { name: "Notifications" as const, params: undefined };
}

function NotificationSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map((idx) => (
        <View key={`s-${idx}`} style={styles.skeletonCard}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcon name="bell-off-outline" size={30} color={COLORS.goldSoft} />
      </View>
      <Text style={styles.emptyTitle}>No notifications found</Text>
      <Text style={styles.emptySubtitle}>Try changing tab/filter or check again later.</Text>
    </View>
  );
}

function NotificationRow({
  item,
  onOpen,
  onMarkRead,
  onDelete,
  onShare,
}: {
  item: RawNotification;
  onOpen: (row: RawNotification) => void;
  onMarkRead: (row: RawNotification) => void;
  onDelete: (row: RawNotification) => void;
  onShare: (row: RawNotification) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openedRef = useRef(false);
  const read = isRead(item);
  const category = getCategory(item);
  const iconName =
    category === "BOOKING"
      ? "calendar-check-outline"
      : category === "PAYMENT"
        ? "credit-card-check-outline"
        : category === "SUPPORT"
          ? "lifebuoy"
          : "bell-outline";

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_evt, g) => {
          const value = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, g.dx + (openedRef.current ? -SWIPE_ACTION_WIDTH : 0)));
          translateX.setValue(value);
        },
        onPanResponderRelease: (_evt, g) => {
          const shouldOpen = g.dx < -45 || (openedRef.current && g.dx < 20);
          openedRef.current = shouldOpen;
          Animated.spring(translateX, {
            toValue: shouldOpen ? -SWIPE_ACTION_WIDTH : 0,
            useNativeDriver: true,
            stiffness: 210,
            damping: 24,
          }).start();
        },
      }),
    [translateX],
  );

  return (
    <View style={styles.swipeWrap}>
      <View style={styles.swipeActions}>
        <Pressable style={styles.actionBtnRead} onPress={() => onMarkRead(item)}>
          <MaterialCommunityIcon name="check-circle-outline" size={16} color={COLORS.navyDark} />
          <Text style={styles.actionBtnTextDark}>Mark Read</Text>
        </Pressable>
        <Pressable style={styles.actionBtnDelete} onPress={() => onDelete(item)}>
          <MaterialCommunityIcon name="delete-outline" size={16} color={COLORS.white} />
          <Text style={styles.actionBtnTextLight}>Delete</Text>
        </Pressable>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable style={[styles.card, !read && styles.cardUnread]} onPress={() => onOpen(item)}>
          <View style={styles.cardTop}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcon name={iconName} size={18} color={COLORS.goldSoft} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.title, !read && styles.titleUnread]} numberOfLines={1}>
                {getTitle(item)}
              </Text>
              <Text style={styles.timeText}>{formatWhen(item)}</Text>
            </View>
          </View>

          {getMessage(item) ? (
            <Text style={[styles.message, !read && styles.messageUnread]} numberOfLines={2}>
              {getMessage(item)}
            </Text>
          ) : null}

          <View style={styles.cardMeta}>
            <Text style={styles.categoryPill}>{getCategoryLabel(getCategory(item))}</Text>
            <Pressable style={styles.shareBtn} onPress={() => onShare(item)}>
              <MaterialCommunityIcon name="share-variant-outline" size={14} color={COLORS.goldSoft} />
              <Text style={styles.shareText}>Share</Text>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function NotificationsScreen({ navigation, route }: { navigation: any; route?: any }) {
  const authUserId = Number(useAppSelector((s) => s.auth.user?.id ?? 0));
  const [tab, setTab] = useState<TabKey>("ALL");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Category | "ALL">("ALL");
  const headerSearchOpen = Boolean(route?.params?.notificationSearchOpen);

  useEffect(() => {
    setShowSearch(headerSearchOpen);
    if (!headerSearchOpen) setSearch("");
  }, [headerSearchOpen]);

  const notifications = useQuery<RawNotification[]>({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ userId: authUserId, page: 0, size: 100 }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    enabled: Number.isFinite(authUserId) && authUserId > 0,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: async () => {
      await notifications.refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: async () => {
      await notifications.refetch();
    },
  });

  const raw = useMemo(() => (Array.isArray(notifications.data) ? notifications.data : []), [notifications.data]);
  const sorted = useMemo(() => {
    const next = [...raw];
    return next.sort((a, b) => {
      const ta = parseDate(getCreatedAt(a))?.getTime() ?? 0;
      const tb = parseDate(getCreatedAt(b))?.getTime() ?? 0;
      return tb - ta;
    });
  }, [raw]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return sorted.filter((row) => {
      if (tab === "UNREAD" && isRead(row)) return false;
      if (categoryFilter !== "ALL" && getCategory(row) !== categoryFilter) return false;
      if (!text) return true;
      const hay = `${getTitle(row)} ${getMessage(row)} ${getCategory(row)}`.toLowerCase();
      return hay.includes(text);
    });
  }, [categoryFilter, search, sorted, tab]);

  const sections = useMemo<SectionRow[]>(() => {
    const buckets: Record<string, RawNotification[]> = { Today: [], Yesterday: [], Earlier: [] };
    filtered.forEach((row) => buckets[getGroup(row)].push(row));
    return ["Today", "Yesterday", "Earlier"]
      .map((title) => ({ title, data: buckets[title] }))
      .filter((section) => section.data.length > 0);
  }, [filtered]);

  const unreadCount = useMemo(() => sorted.filter((row) => !isRead(row)).length, [sorted]);

  const markAllAsRead = async () => {
    const unread = sorted.filter((row) => !isRead(row));
    if (unread.length === 0) return;
    await Promise.allSettled(
      unread.map((row, idx) => markNotificationRead(getNotificationId(row, idx))),
    );
    await notifications.refetch();
  };

  const onShare = async (item: RawNotification) => {
    const message = [`Important Notification`, `Title: ${getTitle(item)}`, getMessage(item) ? `Message: ${getMessage(item)}` : ""]
      .filter(Boolean)
      .join("\n");
    await Share.share({ title: getTitle(item), message });
  };

  const onOpen = async (item: RawNotification) => {
    if (!isRead(item)) {
      await markNotificationRead(getNotificationId(item, 0)).catch(() => null);
    }
    const route = routeFromNotification(item);
    navigation.navigate(route.name, route.params);
  };

  const onMarkRead = (item: RawNotification) => {
    markReadMutation.mutate(getNotificationId(item, 0));
  };

  const onDelete = (item: RawNotification) => {
    deleteMutation.mutate(getNotificationId(item, 0));
  };

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          <Pressable style={[styles.tabBtn, tab === "ALL" && styles.tabBtnActive]} onPress={() => setTab("ALL")}>
            <Text style={[styles.tabText, tab === "ALL" && styles.tabTextActive]}>All</Text>
          </Pressable>
          <Pressable style={[styles.tabBtn, tab === "UNREAD" && styles.tabBtnActive]} onPress={() => setTab("UNREAD")}>
            <Text style={[styles.tabText, tab === "UNREAD" && styles.tabTextActive]}>{`Unread (${unreadCount})`}</Text>
          </Pressable>
          {(["BOOKING", "PAYMENT", "SUPPORT"] as const).map((key) => {
            const active = categoryFilter === key;
            return (
              <Pressable
                key={key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setCategoryFilter(active ? "ALL" : key)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{key}</Text>
              </Pressable>
            );
          })}
          <Button
            mode="contained"
            compact
            buttonColor={COLORS.goldSoft}
            textColor={COLORS.navyDark}
            onPress={() => void markAllAsRead()}
            disabled={unreadCount === 0}
            style={styles.markAllBtn}
          >
            Mark All Read
          </Button>
        </ScrollView>
      </View>

      {showSearch ? (
        <Searchbar
          placeholder="Search notifications"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.neutral100}
          iconColor={COLORS.goldSoft}
          inputStyle={styles.searchInput}
          style={styles.searchbar}
        />
      ) : null}

      {notifications.isLoading ? (
        <NotificationSkeleton />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => getNotificationId(item, idx)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => (
            <NotificationRow item={item} onOpen={onOpen} onMarkRead={onMarkRead} onDelete={onDelete} onShare={onShare} />
          )}
          ListEmptyComponent={<EmptyState />}
          refreshing={notifications.isFetching}
          onRefresh={() => {
            void notifications.refetch();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark, paddingVertical: 12, gap: 10 },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  tabRow: { gap: 8, paddingRight: 8, alignItems: "center" },
  markAllBtn: { alignSelf: "center" },
  tabBtn: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: 999,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabBtnActive: { backgroundColor: "rgba(217,164,65,0.22)" },
  tabText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: COLORS.goldSoft },
  searchbar: { borderWidth: 1, borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark, marginHorizontal: 12 },
  searchInput: { color: COLORS.white, fontSize: 15 },
  filterPill: {
    borderWidth: 1.5,
    borderColor: COLORS.goldSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.navyDark,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  filterPillActive: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.goldSoft },
  filterText: { color: COLORS.white, fontSize: 12, fontWeight: "900", letterSpacing: 0.2 },
  filterTextActive: { color: COLORS.navyDark },
  listContent: { paddingBottom: 20 },
  sectionTitle: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "900", marginTop: 8, marginBottom: 6, marginHorizontal: 12 },

  swipeWrap: { marginBottom: 8 },
  swipeActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_ACTION_WIDTH,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
  },
  actionBtnRead: { flex: 1, backgroundColor: COLORS.goldSoft, alignItems: "center", justifyContent: "center", gap: 2 },
  actionBtnDelete: { flex: 1, backgroundColor: COLORS.red700, alignItems: "center", justifyContent: "center", gap: 2 },
  actionBtnTextDark: { color: COLORS.navyDark, fontSize: 11, fontWeight: "800" },
  actionBtnTextLight: { color: COLORS.white, fontSize: 11, fontWeight: "800" },

  card: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: 12,
    backgroundColor: COLORS.navyDark,
    padding: 10,
    gap: 8,
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: COLORS.goldSoft },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217,164,65,0.12)",
  },
  cardText: { flex: 1 },
  title: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  titleUnread: { fontWeight: "900" },
  timeText: { color: COLORS.neutral100, fontSize: 11, marginTop: 2 },
  message: { color: COLORS.neutral100, fontSize: 13, lineHeight: 18 },
  messageUnread: { color: COLORS.white, fontWeight: "700" },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryPill: {
    color: COLORS.navyDark,
    backgroundColor: COLORS.goldSoft,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  shareText: { color: COLORS.goldSoft, fontSize: 11, fontWeight: "700" },

  skeletonWrap: { gap: 8, marginTop: 2 },
  skeletonCard: { borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: 12, backgroundColor: COLORS.navyDark, padding: 10, gap: 8 },
  skeletonTitle: { height: 14, width: "62%", borderRadius: 6, backgroundColor: "rgba(217,164,65,0.3)" },
  skeletonLine: { height: 10, width: "96%", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.16)" },
  skeletonLineShort: { width: "70%" },

  emptyWrap: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: 14,
    backgroundColor: COLORS.navyDark,
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217,164,65,0.12)",
  },
  emptyTitle: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  emptySubtitle: { color: COLORS.neutral100, fontSize: 12, textAlign: "center" },
});

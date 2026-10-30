import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { getCanonicalPartnerOrderId, getOrderHistory } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { COLORS } from "../../constants/colors";
import { getOrderStatusLabel } from "../../utils/statusLabels";
import { isActiveOrderStatus } from "../../utils/partnerDispatch";

const tabs = ["COMPLETED", "CANCELLED", "PENDING"] as const;
const ORDER_HISTORY_COPY = {
  history: "Order History",
  bookingId: "Booking ID",
  customer: "Customer",
  service: "Service",
  amount: "Service Amount",
  status: "Status",
  title: "Order",
  currency: "INR",
  searchPlaceholder: "Search by customer/order id",
  shareAccessibility: "Share order",
  viewDetails: "View Details",
} as const;

export default function OrderHistoryScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<(typeof tabs)[number]>("COMPLETED");
  const [search, setSearch] = useState("");

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const nextPage = reset ? 0 : page;
      const rows = await getOrderHistory({ page: nextPage, size: 20, sortBy: "createdAt", direction: "desc" });
      setOrders(reset ? rows : [...orders, ...rows]);
      setPage(nextPage + 1);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { load(true).catch(() => null); }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = status === "PENDING" ? (["PENDING", "NEW"].includes(o.status) || isActiveOrderStatus(o.status)) : o.status === status;
      const needle = search.trim().toLowerCase();
      const matchSearch = !needle || (o.customerName ?? "").toLowerCase().includes(needle) || String(o.id).includes(needle);
      return matchStatus && matchSearch;
    });
  }, [orders, search, status]);

  const onShareHistoryItem = async (item: PartnerOrder) => {
    const message = [
      ORDER_HISTORY_COPY.history,
      `${ORDER_HISTORY_COPY.bookingId}: ${item.id}`,
      `${ORDER_HISTORY_COPY.customer}: ${item.customerName ?? "-"}`,
      `${ORDER_HISTORY_COPY.service}: ${formatServiceName(item)}`,
      `${ORDER_HISTORY_COPY.amount}: ${formatServiceAmount(item)}`,
      `${ORDER_HISTORY_COPY.status}: ${getOrderStatusLabel(item.status, (_key, fallback) => fallback)}`,
    ].join("\n");
    await Share.share({ title: `${ORDER_HISTORY_COPY.title} #${item.id}`, message });
  };

  return (
    <View style={styles.container}>
      <TextInput value={search} onChangeText={setSearch} placeholder={ORDER_HISTORY_COPY.searchPlaceholder} placeholderTextColor={COLORS.textMuted} style={styles.search} />
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, status === tab && styles.tabActive]} onPress={() => setStatus(tab)}>
            <Text style={[styles.tabText, status === tab && styles.tabTextActive]}>{getOrderStatusLabel(tab, (_key, fallback) => fallback)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        testID="order-history-list"
        data={filtered}
        style={styles.historyList}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} />}
        onEndReached={() => { if (!loading) load(false).catch(() => null); }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.historyListContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.customerName ?? ORDER_HISTORY_COPY.customer}</Text>
              <TouchableOpacity style={styles.shareIconBtn} onPress={() => onShareHistoryItem(item)} accessibilityLabel={ORDER_HISTORY_COPY.shareAccessibility}>
                <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.meta}>{`${ORDER_HISTORY_COPY.title} #${item.id}`}</Text>
            <Text style={styles.meta}>{`${ORDER_HISTORY_COPY.service}: ${formatServiceName(item)}`}</Text>
            <Text style={styles.meta}>{`${ORDER_HISTORY_COPY.amount}: ${formatServiceAmount(item)}`}</Text>
            <Text style={styles.meta}>{`Address: ${item.address ?? "-"}`}</Text>
            {String(item.bookingType ?? "").toUpperCase() === "SCHEDULED" ? (
              <Text testID={`history-scheduled-${item.id}`} style={styles.scheduledMeta}>
                Scheduled service: {item.scheduledDate ?? "-"} {item.scheduledTime ?? item.promisedStartTime ?? ""}
              </Text>
            ) : null}
            <Text style={styles.meta}>{`${ORDER_HISTORY_COPY.status}: ${getOrderStatusLabel(item.status, (_key, fallback) => fallback)}`}</Text>
            <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate("OrderDetails", { orderId: getCanonicalPartnerOrderId(item), requestId: item.requestId })}>
              <Text style={styles.viewBtnText}>{ORDER_HISTORY_COPY.viewDetails}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

function formatServiceName(order: PartnerOrder) {
  const primary = order.serviceType ?? ORDER_HISTORY_COPY.service;
  const secondary = order.subService;
  if (secondary && secondary !== primary) return `${primary} - ${secondary}`;
  return primary;
}

function formatServiceAmount(order: Pick<PartnerOrder, "amount" | "payout">) {
  return `\u20B9${order.amount ?? order.payout ?? 0}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 10 },
  search: { marginHorizontal: -16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  tabs: { flexDirection: "row", gap: 8, marginHorizontal: -16 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: COLORS.background },
  historyList: { marginHorizontal: -16 },
  historyListContent: { paddingBottom: 24 },
  card: { marginTop: 8, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { flex: 1, color: COLORS.textPrimary, fontWeight: "800" },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  scheduledMeta: { color: COLORS.secondary, fontSize: 12, fontWeight: "800" },
  viewBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  viewBtnText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  shareIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});

import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { getCanonicalPartnerOrderId, getOrderHistory } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { COLORS } from "../../constants/colors";

const tabs = ["COMPLETED", "CANCELLED", "PENDING"] as const;

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
      const matchStatus = status === "PENDING" ? ["PENDING", "NEW", "ACCEPTED", "STARTED"].includes(o.status) : o.status === status;
      const needle = search.trim().toLowerCase();
      const matchSearch = !needle || (o.customerName ?? "").toLowerCase().includes(needle) || String(o.id).includes(needle);
      return matchStatus && matchSearch;
    });
  }, [orders, search, status]);

  const onShareHistoryItem = async (item: PartnerOrder) => {
    const message = [
      "Order History",
      `Order ID: ${item.id}`,
      `Customer: ${item.customerName ?? "-"}`,
      `Service: ${item.serviceType ?? "-"}`,
      `Amount: INR ${item.amount ?? 0}`,
      `Status: ${item.status}`,
    ].join("\n");
    await Share.share({ title: `Order #${item.id}`, message });
  };

  return (
    <View style={styles.container}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search by customer/order id" placeholderTextColor={COLORS.textMuted} style={styles.search} />
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, status === tab && styles.tabActive]} onPress={() => setStatus(tab)}>
            <Text style={[styles.tabText, status === tab && styles.tabTextActive]}>{tab}</Text>
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
              <Text style={styles.name}>{item.customerName ?? "Customer"}</Text>
              <TouchableOpacity style={styles.shareIconBtn} onPress={() => onShareHistoryItem(item)} accessibilityLabel="Share order">
                <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.meta}>Order #{item.id}</Text>
            <Text style={styles.meta}>{item.serviceType ?? "Service"} | INR {item.amount ?? 0}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate("OrderDetails", { orderId: getCanonicalPartnerOrderId(item), requestId: item.requestId })}>
              <Text style={styles.viewBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
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

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { COLORS } from "../constants/colors";
import { getAdminProfile } from "../utils/storage";
import {
  acceptPartnerRequest,
  fetchPartnerRequestById,
  fetchPartnerRequests,
  rejectPartnerRequest,
  type PartnerRequestItem,
  updatePartnerOnlineStatus,
} from "../services/partnerService";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard"> & {
  onLogout: () => Promise<void>;
};

type RequestTab = "PENDING" | "ACCEPTED" | "REJECTED";

export default function DashboardScreen({ onLogout: _onLogout }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestTab>("PENDING");
  const [requests, setRequests] = useState<PartnerRequestItem[]>([]);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [selectedRequest, setSelectedRequest] = useState<PartnerRequestItem | null>(null);

  const loadRequests = useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true);
    setError(null);
    try {
      const rows = await fetchPartnerRequests({ status: activeTab, page: 0, size: 20 });
      setRequests(rows);
    } catch (e: any) {
      setError(e?.message ?? "Unable to load incoming requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await getAdminProfile();
      if (active) setEmail(profile?.email || "");
      await loadRequests(true);
    })();
    return () => {
      active = false;
    };
  }, [loadRequests]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadRequests(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadRequests]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests(false);
  }, [loadRequests]);

  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    try {
      await updatePartnerOnlineStatus(value);
    } catch (e: any) {
      setIsOnline(!value);
      setError(e?.message ?? "Unable to update status.");
    }
  };

  const handleAccept = async (requestId: number) => {
    setBusyRequestId(requestId);
    setError(null);
    try {
      await acceptPartnerRequest(requestId);
      const details = await fetchPartnerRequestById(requestId);
      setRequests((prev) => prev.map((row) => (row.id === requestId ? { ...row, status: "ACCEPTED", ...details } : row)));
      if (selectedRequest?.id === requestId) setSelectedRequest({ ...details, status: "ACCEPTED" });
      await loadRequests(false);
    } catch (e: any) {
      setError(e?.message ?? "Unable to accept request.");
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setBusyRequestId(requestId);
    setError(null);
    try {
      const reason = rejectReasons[requestId] || "Not available";
      await rejectPartnerRequest(requestId, reason);
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: "REJECTED", rejectionReason: reason });
      }
      await loadRequests(false);
    } catch (e: any) {
      setError(e?.message ?? "Unable to reject request.");
    } finally {
      setBusyRequestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Partner Console</Text>
          <Text style={styles.subtitle}>Welcome{email ? `, ${email}` : ""}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.onlineLabel}>{isOnline ? "You are Online" : "You are Offline"}</Text>
            <Switch value={isOnline} onValueChange={handleToggleOnline} thumbColor={COLORS.white} trackColor={{ false: "#475569", true: "#16A34A" }} />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Service Requests</Text>
        <View style={styles.tabRow}>
          {(["PENDING", "ACCEPTED", "REJECTED"] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabBtn, selected && styles.tabBtnActive]}>
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No {activeTab.toLowerCase()} requests right now.</Text>}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const busy = busyRequestId === item.id;
              return (
                <View style={styles.requestCard}>
                  <Text style={styles.requestName}>{item.serviceName || "Service Request"}</Text>
                  <Text style={styles.requestMeta}>Request ID: {item.id}</Text>
                  {item.distanceKm != null ? <Text style={styles.requestMeta}>Distance: {item.distanceKm.toFixed(1)} km</Text> : null}
                  {item.customerLocation ? <Text style={styles.requestMeta}>Location: {item.customerLocation}</Text> : null}
                  <Text style={styles.requestStatus}>Status: {item.status}</Text>

                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const detail = await fetchPartnerRequestById(item.id);
                        setSelectedRequest(detail);
                      } catch (e: any) {
                        setError(e?.message ?? "Unable to load request details.");
                      }
                    }}
                  >
                    <Text style={styles.detailLink}>View details</Text>
                  </TouchableOpacity>

                  {item.status === "PENDING" ? (
                    <>
                      <TextInput
                        placeholder="Reject reason (optional)"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.reasonInput}
                        value={rejectReasons[item.id] ?? ""}
                        onChangeText={(text) => setRejectReasons((prev) => ({ ...prev, [item.id]: text }))}
                      />
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          disabled={busy || !isOnline}
                          onPress={() => handleAccept(item.id)}
                          style={[styles.acceptBtn, (!isOnline || busy) && styles.disabledBtn]}
                        >
                          {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Accept</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={busy}
                          onPress={() => handleReject(item.id)}
                          style={[styles.rejectBtn, busy && styles.disabledBtn]}
                        >
                          <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : null}
                </View>
              );
            }}
          />
        )}

        {selectedRequest ? (
          <View style={styles.detailCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.detailTitle}>Request Detail</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Text style={styles.detailClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.requestMeta}>Request ID: {selectedRequest.id}</Text>
            <Text style={styles.requestMeta}>Service: {selectedRequest.serviceName || "-"}</Text>
            <Text style={styles.requestMeta}>Status: {selectedRequest.status}</Text>
            {selectedRequest.distanceKm != null ? <Text style={styles.requestMeta}>Distance: {selectedRequest.distanceKm.toFixed(1)} km</Text> : null}
            {selectedRequest.customerLocation ? <Text style={styles.requestMeta}>Location: {selectedRequest.customerLocation}</Text> : null}
            {selectedRequest.rejectionReason ? <Text style={styles.requestMeta}>Reason: {selectedRequest.rejectionReason}</Text> : null}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 14 },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.textSecondary, fontSize: 13 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  onlineLabel: { color: COLORS.textPrimary, fontWeight: "700" },
  error: { color: COLORS.error, marginBottom: 8, fontWeight: "600" },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 8 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.surfaceSoft,
  },
  tabBtnActive: { borderColor: "#60A5FA", backgroundColor: "#1E3A8A" },
  tabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#DBEAFE" },
  loaderWrap: { marginTop: 24, alignItems: "center" },
  listContent: { paddingBottom: 20 },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 20 },
  requestCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  requestName: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  requestMeta: { color: COLORS.textSecondary, fontSize: 12 },
  requestStatus: { color: "#93C5FD", fontWeight: "700", fontSize: 12, marginTop: 2 },
  detailLink: { color: "#7DD3FC", fontSize: 12, fontWeight: "700", marginTop: 3 },
  reasonInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  actionRow: { marginTop: 8, flexDirection: "row", gap: 8 },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.6 },
  actionText: { color: COLORS.white, fontWeight: "800" },
  detailCard: {
    marginTop: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    gap: 3,
  },
  detailTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "800" },
  detailClose: { color: "#93C5FD", fontSize: 12, fontWeight: "700" },
});

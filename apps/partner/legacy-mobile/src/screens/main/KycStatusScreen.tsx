import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import { getPartnerProfile } from "../../services/partnerService";
import type { PartnerProfile } from "../../types/partner";
import PaymentHeader from "../../components/payments/PaymentHeader";

const statusCopy: Record<string, { title: string; body: string; icon: string }> = {
  PENDING: { title: "Pending", body: "Submit documents to start verification.", icon: "clock-outline" },
  UNDER_REVIEW: { title: "Under Review", body: "Our team is reviewing your KYC documents.", icon: "file-search-outline" },
  APPROVED: { title: "Approved", body: "Your KYC is approved. You can receive dispatches.", icon: "check-decagram-outline" },
  REJECTED: { title: "Rejected", body: "Please review the reason and re-upload documents.", icon: "alert-circle-outline" },
};

export default function KycStatusScreen({ navigation }: any) {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await getPartnerProfile());
      setError("");
    } catch (nextError: any) {
      setError(nextError?.message ?? "Unable to load KYC status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const status = String(profile?.kycStatus ?? "PENDING").toUpperCase().replace(/\s+/g, "_");
  const copy = statusCopy[status] ?? statusCopy.PENDING;
  const rejected = status === "REJECTED";

  return (
    <ScrollView
      testID="kyc-status-scroll"
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
    >
      <PaymentHeader title="KYC Status" onBack={() => navigation.goBack()} />
      {loading && !profile ? <ActivityIndicator color={COLORS.secondary} /> : null}
      {error ? <RetryState message={error} onRetry={load} /> : null}
      <View style={styles.card}>
        <MaterialCommunityIcons name={copy.icon as any} size={34} color={rejected ? COLORS.danger : COLORS.secondary} />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {rejected ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Action Required</Text>
            <Text style={styles.bannerText}>{profile?.kycRejectionReason || "Documents could not be verified. Please re-upload clear documents."}</Text>
          </View>
        ) : null}
      </View>
      {(rejected || status === "PENDING") ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("DocumentUpload")} accessibilityRole="button">
          <Text style={styles.primaryText}>{rejected ? "Re-upload Documents" : "Upload Documents"}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function RetryState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.retryCard}>
      <Text style={styles.body}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 8, alignItems: "flex-start" },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "900" },
  body: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  banner: { width: "100%", borderRadius: 12, borderWidth: 1, borderColor: COLORS.danger, backgroundColor: "rgba(244,63,94,0.12)", padding: 12, gap: 4 },
  bannerTitle: { color: COLORS.danger, fontWeight: "900" },
  bannerText: { color: COLORS.textPrimary, fontSize: 12, lineHeight: 18 },
  primaryBtn: { borderRadius: 12, backgroundColor: COLORS.secondary, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: COLORS.background, fontWeight: "900" },
  retryCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSoft, borderRadius: 12, padding: 12, gap: 8 },
  retryBtn: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6 },
  retryText: { color: COLORS.textPrimary, fontWeight: "800" },
});

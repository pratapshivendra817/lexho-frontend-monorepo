import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PaymentHeader from "../../components/payments/PaymentHeader";
import { COLORS } from "../../constants/colors";
import { getPartnerScreeningCentre } from "../../services/partnerService";
import type { PartnerScreeningCentre } from "../../types/partner";
import ScreeningCentreCard from "./components/ScreeningCentreCard";

const SCREENING_CENTRE_COPY = {
  title: "Visit Centre",
  loadError: "Unable to load screening centre",
  loading: "Loading...",
  somethingWentWrong: "Something went wrong",
  retry: "Retry",
  emptyTitle: "Screening centre not configured",
  emptyDetail: "Your admin has not configured an active screening centre yet.",
  openInMaps: "Open in Maps",
  callSupport: "Call Support",
} as const;

type ScreeningCentreContentProps = {
  navigation: any;
  loading: boolean;
  refreshing: boolean;
  error: string;
  centre: PartnerScreeningCentre | null;
  onRefresh: () => void;
  onRetry: () => void;
};

export function ScreeningCentreContent({
  navigation,
  loading,
  refreshing,
  error,
  centre,
  onRefresh,
  onRetry,
}: ScreeningCentreContentProps) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.secondary}
          colors={[COLORS.secondary]}
        />
      }
    >
      <PaymentHeader title={SCREENING_CENTRE_COPY.title} onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={COLORS.secondary} />
          <Text style={styles.body}>{SCREENING_CENTRE_COPY.loading}</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View testID="screening-centre-error-state" style={styles.card}>
          <Text style={styles.errorTitle}>{SCREENING_CENTRE_COPY.somethingWentWrong}</Text>
          <Text style={styles.body}>{error}</Text>
          <TouchableOpacity testID="screening-centre-retry-button" style={styles.secondaryBtn} onPress={onRetry}>
            <Text style={styles.secondaryText}>{SCREENING_CENTRE_COPY.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && !centre ? (
        <View testID="screening-centre-empty-state" style={styles.card}>
          <Text style={styles.emptyTitle}>{SCREENING_CENTRE_COPY.emptyTitle}</Text>
          <Text style={styles.body}>{SCREENING_CENTRE_COPY.emptyDetail}</Text>
        </View>
      ) : null}

      {!loading && !error && centre ? (
        <ScreeningCentreCard
          centre={centre}
          openMapsLabel={SCREENING_CENTRE_COPY.openInMaps}
          callSupportLabel={SCREENING_CENTRE_COPY.callSupport}
        />
      ) : null}
    </ScrollView>
  );
}

export default function ScreeningCentreScreen({ navigation }: { navigation: any }) {
  const [centre, setCentre] = React.useState<PartnerScreeningCentre | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const next = await getPartnerScreeningCentre();
      setCentre(next);
      setError("");
    } catch (nextError: any) {
      setError(nextError?.message ?? SCREENING_CENTRE_COPY.loadError);
      setCentre(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreeningCentreContent
      navigation={navigation}
      loading={loading}
      refreshing={refreshing}
      error={error}
      centre={centre}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  centerState: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40 },
  card: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 10 },
  body: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800" },
  errorTitle: { color: COLORS.error, fontSize: 18, fontWeight: "800" },
  secondaryBtn: { alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.surfaceSoft },
  secondaryText: { color: COLORS.textPrimary, fontWeight: "800" },
});

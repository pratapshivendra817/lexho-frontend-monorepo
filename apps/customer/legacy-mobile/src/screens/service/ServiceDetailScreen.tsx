import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";

import { fetchServiceDetails, type CustomerServiceDetailsDto } from "../../api/serviceApi";
import { palette, spacing } from "../../constants/theme";

type LoadState = "idle" | "loading" | "success" | "error";

function SectionCard({
  title,
  icon,
  color,
  items,
  emptyText,
}: {
  title: string;
  icon: string;
  color: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcon name={icon} size={18} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.itemsWrap}>
          {items.map((item) => (
            <View key={`${title}-${item}`} style={styles.itemRow}>
              <MaterialCommunityIcon name={icon} size={14} color={color} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function ServiceDetailScreen({ route, navigation }: any) {
  const serviceIdParam = String(route?.params?.serviceId ?? "").trim();
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [details, setDetails] = useState<CustomerServiceDetailsDto | null>(null);

  const canLoad = useMemo(() => Number.isFinite(Number(serviceIdParam)) && Number(serviceIdParam) > 0, [serviceIdParam]);

  const load = useCallback(async () => {
    if (!canLoad) {
      setError("Invalid service id");
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    try {
      const payload = await fetchServiceDetails(serviceIdParam);
      setDetails(payload);
      setState("success");
    } catch (e: any) {
      setError(e?.message ?? "Unable to load service details");
      setState("error");
    }
  }, [canLoad, serviceIdParam]);

  const onShareService = useCallback(async () => {
    if (!details) return;
    const message = [
      `Check this service: ${details.serviceName}`,
      `Service ID: ${details.serviceId}`,
      "Book quickly from the Lexho app.",
    ].join("\n");
    await Share.share({
      title: details.serviceName,
      message,
    });
  }, [details]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {state === "loading" ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.primaryDark} />
          <Text style={styles.helper}>Loading service details...</Text>
        </View>
      ) : null}

      {state === "error" ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {state === "success" && details ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.title}>{details.serviceName}</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareService()}>
                <MaterialCommunityIcon name="share-variant-outline" size={18} color={palette.primaryDark} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>Review what this service includes before booking.</Text>
          </View>

          <SectionCard
            title="What is Included"
            icon="check-circle-outline"
            color={palette.success}
            items={details.included}
            emptyText="No items included"
          />

          <SectionCard
            title="What is Not Included"
            icon="close-circle-outline"
            color={palette.danger}
            items={details.excluded}
            emptyText="No exclusions"
          />

          <Pressable
            style={styles.bookBtn}
            onPress={() => navigation.navigate("CartCrud", { serviceId: Number(details.serviceId) })}
          >
            <Text style={styles.bookBtnText}>Book Now</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  centerState: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  helper: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  errorText: { color: palette.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  retryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { color: palette.primaryDark, fontWeight: "700" },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: palette.card,
    padding: spacing.md,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  shareBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.card,
  },
  title: { fontSize: 22, fontWeight: "900", color: palette.text },
  subtitle: { marginTop: 6, fontSize: 13, color: palette.muted, lineHeight: 19 },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: palette.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: palette.text },
  itemsWrap: { gap: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemText: { flex: 1, color: palette.text, fontSize: 14, fontWeight: "600" },
  emptyText: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  bookBtn: {
    borderRadius: 12,
    backgroundColor: palette.primaryDark,
    alignItems: "center",
    paddingVertical: 12,
  },
  bookBtnText: { color: palette.white, fontSize: 15, fontWeight: "900" },
});

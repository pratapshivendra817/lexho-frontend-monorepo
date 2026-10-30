import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

import { getCleaningCoverage, type CleaningCoverageTask } from "../../api/cleaningCoverageApi";
import { getCleaningCoverageForDuration } from "../../constants/cleaningCoverageConfig";
import { radii, shadows, spacing } from "../../constants/theme";
import { COLORS } from "../../theme/colors";

const ICON_BY_TASK: Record<string, string> = {
  balcony: "balcony",
  bathroom: "shower-head",
  dusting: "spray-bottle",
  fan: "fan",
  kitchen: "silverware-fork-knife",
  mopping: "broom",
  utensils: "silverware-clean",
  window: "window-closed-variant",
};

function getTaskIcon(task: CleaningCoverageTask) {
  return ICON_BY_TASK[task.icon] ?? "sparkles";
}

export function CleaningCoverageCard({ durationHours }: { durationHours?: number | null }) {
  const [expanded, setExpanded] = useState(true);
  const { width } = useWindowDimensions();
  const selectedDuration = Number(durationHours ?? 0);
  const hasSelectedDuration = Number.isFinite(selectedDuration) && selectedDuration > 0;
  const coverageQuery = useQuery({
    queryKey: ["cleaning-coverage", selectedDuration],
    queryFn: () => getCleaningCoverage(selectedDuration),
    enabled: hasSelectedDuration,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const coverage = useMemo(() => {
    const apiCoverage = coverageQuery.data?.find((item) => item.durationHours === selectedDuration) ?? null;
    return apiCoverage ?? getCleaningCoverageForDuration(durationHours);
  }, [coverageQuery.data, durationHours, selectedDuration]);
  const cardWidth = Math.max(132, Math.min(168, width * 0.38));

  return (
    <View style={styles.coverageCard}>
      <Pressable style={styles.headerRow} onPress={() => setExpanded((value) => !value)} accessibilityRole="button">
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>How much can be covered?</Text>
          <Text style={styles.subtitle}>Estimations are based on a standard 2BHK home</Text>
        </View>
        <View style={styles.chevronButton}>
          <MaterialCommunityIcon name={expanded ? "chevron-up" : "chevron-down"} size={22} color={COLORS.navyDark} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {coverage ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskRow}>
              {coverage.tasks.map((task, index) => (
                <View key={`${coverage.durationHours}-${task.name}-${index}`} style={[styles.taskCard, { width: cardWidth }]}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcon name={getTaskIcon(task)} size={26} color={COLORS.goldSoft} />
                  </View>
                  <Text style={styles.taskName} numberOfLines={2}>{task.name}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcon name={hasSelectedDuration ? "cloud-alert-outline" : "clock-edit-outline"} size={22} color={COLORS.goldSoft} />
              <Text style={styles.emptyText}>
                {hasSelectedDuration && coverageQuery.isFetching
                  ? "Loading coverage estimates..."
                  : hasSelectedDuration
                    ? "Coverage estimates are not available for this duration."
                    : "Select a duration to view coverage estimates."}
              </Text>
            </View>
          )}
          <Text style={styles.disclaimer}>
            Actual coverage may vary depending on home size, cleanliness level, furniture density, and service conditions.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coverageCard: {
    marginTop: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.72)",
    backgroundColor: COLORS.navyDark,
    overflow: "hidden",
    ...shadows.sm,
  },
  headerRow: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  title: { color: COLORS.white, fontSize: 16, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700", marginTop: 3, lineHeight: 17 },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingBottom: 14 },
  taskRow: { gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  taskCard: {
    minHeight: 112,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.48)",
    backgroundColor: COLORS.navy,
    padding: spacing.sm,
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.48)",
    backgroundColor: "rgba(224,169,75,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskName: { color: COLORS.white, fontSize: 13, fontWeight: "900", lineHeight: 18, minHeight: 36 },
  emptyState: {
    marginHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.44)",
    backgroundColor: COLORS.navy,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyText: { color: "rgba(255,255,255,0.76)", fontSize: 12, fontWeight: "800", flex: 1, lineHeight: 18 },
  disclaimer: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    paddingHorizontal: 14,
  },
});

import React, { useMemo } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS } from "../../../constants/colors";
import type { PartnerScreeningCentre } from "../../../types/partner";

type Props = {
  centre: PartnerScreeningCentre;
  openMapsLabel: string;
  callSupportLabel: string;
  onPress?: (() => void) | null;
  testIDPrefix?: string;
};

const SCREENING_CENTRE_CARD_COPY = {
  landmark: "Landmark",
  entrance: "Entrance",
  phone: "Phone",
} as const;

export default function ScreeningCentreCard({ centre, openMapsLabel, callSupportLabel, onPress, testIDPrefix = "screening-centre" }: Props) {
  const mapsUrl = useMemo(
    () => `https://www.google.com/maps/search/?api=1&query=${centre.latitude},${centre.longitude}`,
    [centre.latitude, centre.longitude],
  );
  const phoneUrl = useMemo(() => {
    const normalized = String(centre.phone ?? "").replace(/\s+/g, "");
    return normalized ? `tel:${normalized}` : "";
  }, [centre.phone]);

  const cardContent = (
    <>
      <Text style={styles.name}>{centre.name}</Text>
      <Text style={styles.body}>{centre.address}</Text>
      {centre.landmark ? <Text style={styles.meta}>{`${SCREENING_CENTRE_CARD_COPY.landmark}: ${centre.landmark}`}</Text> : null}
      {centre.entranceInfo ? <Text style={styles.meta}>{`${SCREENING_CENTRE_CARD_COPY.entrance}: ${centre.entranceInfo}`}</Text> : null}
      {centre.phone ? <Text style={styles.meta}>{`${SCREENING_CENTRE_CARD_COPY.phone}: ${centre.phone}`}</Text> : null}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          testID={`${testIDPrefix}-call-support-button`}
          style={[styles.secondaryBtn, !phoneUrl ? styles.secondaryBtnDisabled : null]}
          disabled={!phoneUrl}
          onPress={() => {
            if (!phoneUrl) return;
            void Linking.openURL(phoneUrl);
          }}
        >
          <Text style={styles.secondaryText}>{callSupportLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`${testIDPrefix}-open-maps-button`}
          style={styles.primaryBtn}
          onPress={() => {
            void Linking.openURL(mapsUrl);
          }}
        >
          <Text style={styles.primaryText}>{openMapsLabel}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity testID={`${testIDPrefix}-card`} activeOpacity={0.92} style={styles.card} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 10 },
  name: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "800" },
  body: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  meta: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  primaryBtn: { flex: 0.95, borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondary, backgroundColor: COLORS.surfaceSoft, paddingVertical: 11, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: COLORS.secondary, fontWeight: "900", fontSize: 13 },
  secondaryBtn: { flex: 1.05, borderRadius: 10, borderWidth: 1, borderColor: COLORS.secondary, backgroundColor: COLORS.secondary, paddingVertical: 11, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  secondaryBtnDisabled: { opacity: 0.55 },
  secondaryText: { color: COLORS.background, fontWeight: "800", fontSize: 13 },
});

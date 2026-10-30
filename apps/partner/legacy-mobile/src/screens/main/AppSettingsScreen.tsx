import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import { getCurrentAppLanguage, type AppLanguage } from "../../services/appSettingsService";

const APP_SETTINGS_COPY = {
  title: "App Settings",
  language: "Language",
  terms: "Terms & Conditions",
  visitCentre: "Visit Centre",
} as const;

export default function AppSettingsScreen({ navigation }: { navigation: any }) {
  const [language, setLanguage] = useState<AppLanguage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLanguage(await getCurrentAppLanguage());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settingsItems = [
    {
      id: "language",
      title: APP_SETTINGS_COPY.language,
      value: language?.nativeLabel ?? language?.label ?? language?.code ?? "",
      testID: "app-settings-language-button",
      onPress: () => navigation.navigate("LanguageSelection"),
    },
    {
      id: "terms",
      title: APP_SETTINGS_COPY.terms,
      value: "",
      testID: "app-settings-terms-button",
      onPress: () =>
        navigation.navigate("LegalDocument", {
          slug: "terms-and-conditions",
          title: APP_SETTINGS_COPY.terms,
        }),
    },
    {
      id: "screening-centre",
      title: APP_SETTINGS_COPY.visitCentre,
      value: "",
      testID: "app-settings-screening-centre-button",
      onPress: () => navigation.navigate("ScreeningCentre"),
    },
  ];

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{APP_SETTINGS_COPY.title}</Text>
      {loading ? <ActivityIndicator color={COLORS.secondary} /> : null}
      <FlatList
        data={settingsItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <TouchableOpacity testID={item.testID} style={styles.row} onPress={item.onPress} accessibilityRole="button">
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.value ? <Text style={styles.rowValue}>{item.value}</Text> : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" color={COLORS.textSecondary} size={24} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, paddingTop: 16 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800", paddingHorizontal: 16, marginBottom: 12 },
  content: { paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: COLORS.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },
  rowValue: { color: COLORS.textSecondary, fontSize: 13 },
});

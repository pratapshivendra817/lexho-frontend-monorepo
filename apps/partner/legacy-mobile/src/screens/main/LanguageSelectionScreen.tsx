import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import { getAvailableAppLanguages, getSelectedAppLanguage, saveSelectedAppLanguage, type AppLanguage } from "../../services/appSettingsService";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import { useAppLanguage } from "../../context/AppLanguageContext";

const LANGUAGE_SELECTION_COPY = {
  loadError: "Unable to load languages",
  saveError: "Unable to save language",
  title: "Select Language",
} as const;

export default function LanguageSelectionScreen({ navigation }: { navigation: any }) {
  const { toast } = useAppFeedback();
  const { refreshLanguage } = useAppLanguage();
  const [languages, setLanguages] = useState<AppLanguage[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [availableLanguages, selectedLanguage] = await Promise.all([getAvailableAppLanguages(), getSelectedAppLanguage()]);
        setLanguages(availableLanguages);
        setSelectedCode(selectedLanguage);
      } catch (error: any) {
        toast(error?.message ?? LANGUAGE_SELECTION_COPY.loadError);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const selectLanguage = async (language: AppLanguage) => {
    try {
      await saveSelectedAppLanguage(language.code);
      setSelectedCode(language.code);
      await refreshLanguage();
      navigation.goBack();
    } catch (error: any) {
      toast(error?.message ?? LANGUAGE_SELECTION_COPY.saveError);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{LANGUAGE_SELECTION_COPY.title}</Text>
      {loading ? <ActivityIndicator color={COLORS.secondary} /> : null}
      <FlatList
        data={languages}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const selected = selectedCode === item.code;
          return (
            <TouchableOpacity testID={`language-option-${item.code}`} style={styles.row} onPress={() => void selectLanguage(item)} accessibilityRole="radio" accessibilityState={{ selected }}>
              <Text style={styles.label}>{item.nativeLabel ?? item.label}</Text>
              <MaterialCommunityIcons name={selected ? "radiobox-marked" : "radiobox-blank"} color={selected ? COLORS.secondary : COLORS.textSecondary} size={22} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, paddingTop: 16 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800", paddingHorizontal: 16, marginBottom: 12 },
  content: { paddingBottom: 16 },
  row: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  label: { flex: 1, color: COLORS.textPrimary, fontSize: 16, fontWeight: "600" },
});

import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";

import { CustomerHomeBannerCarousel } from "../../components/home/CustomerHomeBannerCarousel";
import { useHomeSections } from "./useHomeSections";
import type { HomeSection } from "./types";

type DynamicHomeSectionsProps = {
  navigation: any;
};

function StatsSection({ section }: { section: HomeSection }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitleLarge}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
      {section.items.length > 0 ? (
        <View style={styles.statsGrid}>
          {section.items.map((item) => (
            <View key={item.id} style={styles.statTile}>
              <Text style={styles.statValue}>{item.value ?? "-"}</Text>
              <Text style={styles.statTitle} numberOfLines={2}>{item.title}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.sectionSubtitle}>No stats items available.</Text>
      )}
    </View>
  );
}

function TrustSection({ section }: { section: HomeSection }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitleLarge}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
      {section.items.length > 0 ? (
        <View style={styles.trustList}>
          {section.items.map((item) => (
            <View key={item.id} style={styles.trustRow}>
              <Text style={styles.trustText}>{item.title}</Text>
              {item.value ? <Text style={styles.trustValue}>{item.value}</Text> : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.sectionSubtitle}>No trust highlights available.</Text>
      )}
    </View>
  );
}

function TaglineSection({ section }: { section: HomeSection }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
      {section.items.map((item) => (
        <Text key={item.id} style={styles.taglineText}>{item.title}</Text>
      ))}
    </View>
  );
}

function HighlightsSection({ section }: { section: HomeSection }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
      <View style={styles.trustList}>
        {section.items.map((item) => (
          <View key={item.id} style={styles.trustRow}>
            <Text style={styles.trustText}>{item.title}</Text>
            {item.value ? <Text style={styles.trustValue}>{item.value}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function BannersSection({ section, navigation }: { section: HomeSection; navigation: any }) {
  return (
    <View>
      <Text style={styles.heading}>{section.title}</Text>
      {section.subtitle ? <Text style={styles.headingSub}>{section.subtitle}</Text> : null}
      <CustomerHomeBannerCarousel navigation={navigation} />
    </View>
  );
}

function DynamicHomeSectionsComponent({ navigation }: DynamicHomeSectionsProps) {
  const { loading, error, sections, reload } = useHomeSections();

  if (loading) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loading homepage sections...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Unable to load homepage sections</Text>
        <Text style={styles.sectionSubtitle}>{error}</Text>
        <Button mode="contained-tonal" onPress={() => void reload()}>Retry</Button>
      </View>
    );
  }

  if (sections.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {sections.map((section) => {
        if (section.type === "STATS") return <StatsSection key={section.id} section={section} />;
        if (section.type === "TRUST") return <TrustSection key={section.id} section={section} />;
        if (section.type === "TAGLINE") return <TaglineSection key={section.id} section={section} />;
        if (section.type === "HIGHLIGHTS") return <HighlightsSection key={section.id} section={section} />;
        if (section.type === "BANNERS") return <BannersSection key={section.id} section={section} navigation={navigation} />;
        return (
          <Pressable key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const DynamicHomeSections = memo(DynamicHomeSectionsComponent);

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D7E5F5",
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 10,
    shadowColor: "#0B1324",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  sectionTitleLarge: { fontSize: 28, fontWeight: "900", color: "#0A1F44", letterSpacing: 0.1, lineHeight: 34 },
  sectionSubtitle: { fontSize: 14, color: "#7A879B", lineHeight: 20, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statTile: {
    width: "48%",
    minHeight: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#B7D3F3",
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 13,
    paddingVertical: 11,
    justifyContent: "center",
    gap: 8,
  },
  statValue: { fontSize: 34, fontWeight: "900", color: "#0A2E66", letterSpacing: 0.1, lineHeight: 38 },
  statTitle: { fontSize: 12, fontWeight: "700", color: "#35547D", lineHeight: 17 },
  trustList: { gap: 10 },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#EBFFF4",
    borderWidth: 1,
    borderColor: "#B5EED2",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  trustText: { flex: 1, fontSize: 17, fontWeight: "800", color: "#0A5A40", lineHeight: 23 },
  trustValue: { fontSize: 15, fontWeight: "900", color: "#0C7A54" },
  taglineText: { fontSize: 16, fontWeight: "800", color: "#0F172A", lineHeight: 22 },
  heading: { fontSize: 30, fontWeight: "900", marginTop: 22, marginHorizontal: 16, color: "#0A1F44", lineHeight: 36 },
  headingSub: { fontSize: 16, color: "#11A36A", marginHorizontal: 16, marginTop: 6, fontWeight: "800" },
});

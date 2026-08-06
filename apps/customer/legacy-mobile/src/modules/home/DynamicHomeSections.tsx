import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useHomeSections } from "./useHomeSections";
import type { HomeSection, HomeSectionItem } from "./types";


import { COLORS } from '../../theme/colors';

const ICON_ALIASES: Record<string, string> = {
  shield: "shield-check-outline",
  users: "account-group-outline",
  user: "account-outline",
  star: "star-circle-outline",
  calendar: "calendar-check-outline",
  booking: "calendar-check-outline",
  support: "headset",
  service: "tools",
  services: "tools",
  professional: "account-hard-hat-outline",
  professionals: "account-hard-hat-outline",
  training: "school-outline",
  trained: "school-outline",
  verified: "shield-check-outline",
  check: "check-decagram-outline",
  quality: "star-circle-outline",
  highlight: "star-four-points-outline",
  highlights: "star-four-points-outline",
  tagline: "format-quote-open",
  quote: "format-quote-open",
  home: "home-heart",
  heart: "heart-outline",
  fast: "flash-outline",
  flash: "flash-outline",
  safe: "shield-check-outline",
  clean: "broom",
  cleaning: "broom",
  broom: "broom",
  cook: "chef-hat",
  cooking: "chef-hat",
  chef: "chef-hat",
  money: "cash-multiple",
  price: "cash-multiple",
  pricing: "cash-multiple",
  subscription: "calendar-refresh-outline",
  subscriptions: "calendar-refresh-outline",
  plan: "calendar-refresh-outline",
  plans: "calendar-refresh-outline",
  schedule: "calendar-check-outline",
  scheduling: "calendar-check-outline",
  book: "calendar-check-outline",
  hourly: "clock-outline",
  clock: "clock-outline",
};

function normalizeIconName(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/_/g, "-");
  if (
    normalized.includes("?") ||
    ["question", "question-mark", "question-circle", "help", "help-circle", "null", "undefined", "none", "na", "n/a"].includes(normalized)
  ) return "";
  const compact = normalized.replace(/[^a-z0-9]+/g, " ").trim();
  if (ICON_ALIASES[normalized]) return ICON_ALIASES[normalized];
  if (compact.includes("home cleaning") || compact.includes("clean")) return "broom";
  if (compact.includes("cook") || compact.includes("chef") || compact.includes("kitchen")) return "chef-hat";
  if (compact.includes("subscription") || compact.includes("recurring") || compact.includes("plan")) return "calendar-refresh-outline";
  if (compact.includes("hour") || compact.includes("time") || compact.includes("clock")) return "clock-outline";
  if (compact.includes("book") || compact.includes("schedule") || compact.includes("calendar")) return "calendar-check-outline";
  if (compact.includes("price") || compact.includes("charge") || compact.includes("money") || compact.includes("transparent")) return "cash-multiple";
  if (compact.includes("support") || compact.includes("help")) return "headset";
  if (compact.includes("service")) return "tools";
  if (compact.includes("professional")) return "account-hard-hat-outline";
  if (compact.includes("verified") || compact.includes("safe") || compact.includes("trust")) return "shield-check-outline";
  if (compact.includes("quality") || compact.includes("promise") || compact.includes("rated")) return "star-circle-outline";
  if (compact.includes("home")) return "home-heart";
  return normalized;
}

function getTitleIcon(value?: string | null, fallback = "check-decagram-outline") {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("clean")) return "broom";
  if (normalized.includes("cook") || normalized.includes("chef") || normalized.includes("kitchen")) return "chef-hat";
  if (normalized.includes("subscription") || normalized.includes("plan") || normalized.includes("recurring")) return "calendar-refresh-outline";
  if (normalized.includes("hour") || normalized.includes("time")) return "clock-outline";
  if (normalized.includes("book") || normalized.includes("schedule") || normalized.includes("flexible")) return "calendar-check-outline";
  if (normalized.includes("price") || normalized.includes("charge") || normalized.includes("transparent")) return "cash-multiple";
  if (normalized.includes("support") || normalized.includes("help")) return "headset";
  if (normalized.includes("service")) return "tools";
  if (normalized.includes("professional")) return "account-hard-hat-outline";
  if (normalized.includes("verified") || normalized.includes("safe") || normalized.includes("trust")) return "shield-check-outline";
  if (normalized.includes("quality") || normalized.includes("promise")) return "star-circle-outline";
  if (normalized.includes("home")) return "home-heart";
  return fallback;
}

function getItemIcon(item: HomeSectionItem, fallback: string) {
  return normalizeIconName(item.icon) || getTitleIcon(item.title, fallback);
}

function sectionKey(section: HomeSection, index: number) {
  return `section-${section.type}-${section.id}-${index}`;
}

function itemKey(section: HomeSection, item: HomeSectionItem, index: number) {
  return `section-${section.id}-item-${item.id}-${index}`;
}

function visualValue(value?: string | null) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : undefined;
}

function sectionCardVisual(section: HomeSection) {
  return {
    borderColor: visualValue(section.borderColor),
    backgroundColor: visualValue(section.backgroundColor),
  };
}

function darkSectionCardVisual(section: HomeSection) {
  return {
    borderColor: visualValue(section.borderColor) || COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  };
}

function hexWithAlpha(value: string | undefined, alpha = "22") {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return undefined;
  return `${value}${alpha}`;
}

function StatsSection({ section }: { section: HomeSection }) {
  const counterValuesRef = useRef<Animated.Value[]>([]);
  const [counterDisplayValues, setCounterDisplayValues] = useState<number[]>([]);
  const counterValues = useMemo(() => {
    if (counterValuesRef.current.length !== section.items.length) {
      counterValuesRef.current = section.items.map(() => new Animated.Value(0));
    }
    return counterValuesRef.current;
  }, [section.items]);

  const parseNumericValue = (value: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return { target: 0, suffix: "", decimals: 0 };
    const suffix = raw.includes("%") ? "%" : raw.toLowerCase().includes("k") ? "k+" : raw.toLowerCase().includes("x") ? "x" : "+";
    const numeric = Number(raw.replace(/[^0-9.]/g, ""));
    const target = Number.isFinite(numeric) ? numeric : 0;
    const decimals = target % 1 === 0 ? 0 : 1;
    return { target, suffix, decimals };
  };

  useEffect(() => {
    setCounterDisplayValues(section.items.map(() => 0));
  }, [section.items]);

  useEffect(() => {
    const listeners = counterValues.map((value, index) =>
      value.addListener(({ value: next }) => {
        setCounterDisplayValues((prev) => {
          const nextList = [...prev];
          nextList[index] = next;
          return nextList;
        });
      }),
    );
    return () => {
      counterValues.forEach((value, index) => {
        value.removeListener(listeners[index]);
      });
    };
  }, [counterValues]);

  useEffect(() => {
    const animations = counterValues.map((value, index) =>
      Animated.timing(value, {
        toValue: parseNumericValue(String(section.items[index]?.value ?? "")).target || 0,
        duration: 850,
        delay: index * 90,
        useNativeDriver: false,
      }),
    );
    Animated.stagger(80, animations).start();
  }, [counterValues, section.items]);

  const getStatTone = (title: string, index: number) => {
    const normalized = String(title ?? "").toLowerCase();
    if (normalized.includes("rating") || normalized.includes("quality") || normalized.includes("trust")) return "quality";
    if (normalized.includes("success") || normalized.includes("growth") || normalized.includes("booking")) return "growth";
    if (normalized.includes("support") || normalized.includes("ticket") || normalized.includes("response")) return "volume";
    return index % 3 === 0 ? "growth" : index % 3 === 1 ? "quality" : "volume";
  };

  const toneStyles: Record<string, { border: string; iconBg: string; icon: string; value: string; trendBg: string }> = {
    growth: {
      border: "rgba(34,197,94,0.52)",
      iconBg: "rgba(34,197,94,0.16)",
      icon: "#4ADE80",
      value: "#86EFAC",
      trendBg: "rgba(34,197,94,0.18)",
    },
    quality: {
      border: "rgba(224,169,75,0.62)",
      iconBg: "rgba(224,169,75,0.16)",
      icon: "#E0A94B",
      value: "#F8D79D",
      trendBg: "rgba(224,169,75,0.18)",
    },
    volume: {
      border: "rgba(59,130,246,0.58)",
      iconBg: "rgba(59,130,246,0.16)",
      icon: "#60A5FA",
      value: "#93C5FD",
      trendBg: "rgba(59,130,246,0.18)",
    },
  };

  const getStatIcon = (title: string) => {
    const normalized = String(title ?? "").toLowerCase();
    if (normalized.includes("rating") || normalized.includes("quality")) return "star-circle-outline";
    if (normalized.includes("booking") || normalized.includes("order")) return "calendar-check-outline";
    if (normalized.includes("support")) return "headset";
    if (normalized.includes("verified") || normalized.includes("trust")) return "shield-check-outline";
    if (normalized.includes("user") || normalized.includes("customer")) return "account-group-outline";
    return "chart-line";
  };

  const getTrendLabel = (item: any, index: number) => {
    const rawCandidates = [
      item?.trend,
      item?.trendLabel,
      item?.change,
      item?.delta,
      item?.meta?.trend,
      item?.meta?.change,
      item?.subtitle,
    ];
    const fromApi = rawCandidates
      .map((v) => String(v ?? "").trim())
      .find((v) => v.length > 0);
    if (fromApi) return fromApi;
    if (!item?.value) return "stable";
    const defaultPool = ["+12% this month", "+8% this week", "+5% today"];
    return defaultPool[index % defaultPool.length];
  };

  const getStatDisplayValue = (item: HomeSectionItem, animatedValue: number, parsed: { suffix: string; decimals: number }) => {
    const normalizedTitle = String(item.title ?? "").toLowerCase();
    const rawValue = String(item.value ?? "").trim().toLowerCase().replace(/\s+/g, "");
    const compactValue = rawValue.replace(/[^0-9a-z]/g, "");
    if ((normalizedTitle.includes("availability") || normalizedTitle.includes("day")) && ["7", "7days"].includes(compactValue)) return "7 days";
    if (
      (normalizedTitle.includes("support") || normalizedTitle.includes("assistance")) &&
      ["247", "24x7", "24by7", "24hours"].includes(compactValue)
    ) {
      return "24 * 7";
    }
    return `${animatedValue.toFixed(parsed.decimals)}${parsed.suffix}`;
  };

  return (
    <View style={[styles.sectionCard, styles.statsSectionCard]}>
      <Text style={[styles.sectionTitleLarge, styles.statsSectionTitle]}>{section.title}</Text>
      {section.subtitle ? <Text style={[styles.sectionSubtitle, styles.statsSectionSubtitle]}>{section.subtitle}</Text> : null}
      {section.items.length > 0 ? (
        <View style={styles.statsGrid}>
          {section.items.map((item, index) => {
            const tone = getStatTone(item.title, index);
            const paletteTone = toneStyles[tone];
            const parsed = parseNumericValue(String(item.value ?? "0"));
            const trend = getTrendLabel(item, index);
            const displayValue = getStatDisplayValue(item, counterDisplayValues[index] ?? 0, parsed);
            const compactValue = displayValue.includes("days") || displayValue.includes("*");
            return (
              <View key={itemKey(section, item, index)} style={[styles.statTile, { borderColor: paletteTone.border }]}>
                <View style={styles.statTopRow}>
                  <View style={[styles.statIconWrap, { backgroundColor: paletteTone.iconBg }]}>
                    <MaterialCommunityIcon name={getItemIcon(item, getStatIcon(item.title))} size={14} color={paletteTone.icon} />
                  </View>
                <View style={[styles.statTrendBadge, { backgroundColor: paletteTone.trendBg, borderColor: paletteTone.border }]}>
                  <Text style={styles.statTrendText} numberOfLines={2}>{trend}</Text>
                </View>
              </View>
                <Text
                  style={[styles.statValue, compactValue && styles.statValueCompact, { color: paletteTone.value }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {displayValue}
                </Text>
                <Text style={styles.statTitle} numberOfLines={2}>{item.title}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.sectionSubtitle}>No stats items available.</Text>
      )}
    </View>
  );
}

function TrustSection({ section }: { section: HomeSection }) {
  const revealValuesRef = useRef<Animated.Value[]>([]);
  const revealValues = useMemo(() => {
    if (revealValuesRef.current.length !== section.items.length) {
      revealValuesRef.current = section.items.map(() => new Animated.Value(0));
    }
    return revealValuesRef.current;
  }, [section.items]);

  useEffect(() => {
    const animations = revealValues.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 320,
        delay: index * 90,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(70, animations).start();
  }, [revealValues]);

  const getTrustIcon = (label?: string | null) => {
    const directIcon = normalizeIconName(label);
    if (directIcon && directIcon !== String(label ?? "").toLowerCase()) return directIcon;
    const normalized = String(label ?? "").toLowerCase();
    if (normalized.includes("verified")) return "shield-check-outline";
    if (normalized.includes("trained")) return "school-outline";
    if (normalized.includes("top") || normalized.includes("rated")) return "star-circle-outline";
    return "check-decagram-outline";
  };

  const trustItems = section.items.filter((item) => String(item?.title ?? "").trim().length > 0);
  const metricCards = trustItems.slice(0, 3);
  const formatMetricValue = (value?: string | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "--";
    const cleaned = raw.replace(/[, ]/g, "");
    const hasSignal =
      /\d/.test(cleaned) || /(?:%|k\+|x|\+)$/i.test(cleaned);
    return hasSignal ? raw : "--";
  };

  return (
    <View style={[styles.sectionCard, styles.trustSectionCard]}>
      <View style={styles.trustHeadRow}>
        <View style={styles.trustShieldWrap}>
          <MaterialCommunityIcon name={normalizeIconName(section.icon) || "shield-star-outline"} size={34} color={COLORS.goldSoft} />
        </View>
        <View style={styles.trustHeadText}>
          <Text style={[styles.sectionTitleLarge, styles.trustSectionTitle]}>{section.title}</Text>
          {section.subtitle ? <Text style={[styles.sectionSubtitle, styles.trustSectionSubtitle]}>{section.subtitle}</Text> : null}
        </View>
      </View>

      {metricCards.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trustMetricRow}>
          {metricCards.map((metric, index) => (
            <View key={itemKey(section, metric, index)} style={styles.trustMetricCard}>
              <MaterialCommunityIcon name={getItemIcon(metric, getTrustIcon(metric.title))} size={16} color={COLORS.goldSoft} />
              <Text style={styles.trustMetricValue}>{formatMetricValue(metric.value)}</Text>
              <Text style={styles.trustMetricLabel}>{metric.title}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {section.items.length > 0 ? (
        <View style={styles.trustList}>
          {section.items.map((item, index) => (
            <Animated.View
              key={itemKey(section, item, index)}
              style={{
                opacity: revealValues[index],
                transform: [
                  {
                    translateY: revealValues[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.trustRow}>
                <MaterialCommunityIcon name={getItemIcon(item, getTrustIcon(item.title))} size={18} color={COLORS.goldSoft} />
                <View style={styles.trustTextWrap}>
                  <Text style={styles.trustText}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.trustSubText}>{item.subtitle}</Text> : null}
                </View>
                {item.value ? <Text style={styles.trustValue}>{item.value}</Text> : null}
              </View>
              {index < section.items.length - 1 ? (
                <LinearGradient
                  colors={["rgba(224,169,75,0)", "rgba(224,169,75,0.55)", "rgba(224,169,75,0)"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.trustDivider}
                />
              ) : null}
            </Animated.View>
          ))}
        </View>
      ) : (
        <Text style={styles.sectionSubtitle}>No trust highlights available.</Text>
      )}

    </View>
  );
}

function TaglineSection({ section }: { section: HomeSection }) {
  const hasItems = section.items.length > 0;
  const sectionAccent = visualValue(section.iconColor) || visualValue(section.color) || COLORS.goldSoft;

  return (
    <View style={[styles.sectionCard, styles.taglineCard, darkSectionCardVisual(section)]}>
      <View style={styles.taglineHeadRow}>
        <MaterialCommunityIcon
          name={normalizeIconName(section.icon) || getTitleIcon(section.title, "format-quote-open")}
          size={30}
          color={sectionAccent}
        />
        <View style={styles.taglineHeadText}>
          {section.title ? <Text style={[styles.sectionTitleLarge, styles.taglineSectionTitle, { color: visualValue(section.color) || COLORS.white }]}>{section.title}</Text> : null}
          {section.subtitle ? <Text style={[styles.sectionSubtitle, styles.taglineSectionSubtitle]}>{section.subtitle}</Text> : null}
        </View>
      </View>
      {hasItems ? (
        <View style={styles.taglineItemsWrap}>
          {section.items.map((item, index) => (
            <View
              key={itemKey(section, item, index)}
              style={[
                styles.taglineItem,
                {
                  borderColor: visualValue(item.borderColor) || COLORS.goldSoft,
                  backgroundColor: visualValue(item.backgroundColor) || "rgba(255,255,255,0.06)",
                },
              ]}
            >
              <View
                style={[
                  styles.taglineIconWrap,
                  { backgroundColor: hexWithAlpha(visualValue(item.iconColor)) || "rgba(224,169,75,0.16)" },
                ]}
              >
                <MaterialCommunityIcon
                  name={getItemIcon(item, "format-quote-open")}
                  size={16}
                  color={visualValue(item.iconColor) || sectionAccent}
                />
              </View>
              <View style={styles.taglineItemTextWrap}>
                <Text style={[styles.taglineText, { color: visualValue(item.color) || COLORS.white }]}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.taglineSubText}>{item.subtitle}</Text> : null}
              </View>
              {item.value ? <Text style={[styles.taglineValue, { color: visualValue(item.iconColor) || sectionAccent }]}>{item.value}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HighlightsSection({ section }: { section: HomeSection }) {
  const sectionAccent = visualValue(section.iconColor) || visualValue(section.color) || COLORS.goldSoft;

  return (
    <View style={[styles.sectionCard, styles.highlightsCard, darkSectionCardVisual(section)]}>
      <View style={styles.highlightsHeadRow}>
        <MaterialCommunityIcon
          name={normalizeIconName(section.icon) || getTitleIcon(section.title, "star-four-points-outline")}
          size={30}
          color={sectionAccent}
        />
        <View style={styles.highlightsHeadText}>
          <Text style={[styles.sectionTitleLarge, styles.highlightsSectionTitle, { color: visualValue(section.color) || COLORS.white }]}>{section.title}</Text>
          {section.subtitle ? <Text style={[styles.sectionSubtitle, styles.highlightsSectionSubtitle]}>{section.subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.highlightsList}>
        {section.items.map((item, index) => (
          <View
            key={itemKey(section, item, index)}
            style={[
              styles.highlightRow,
              {
                borderColor: visualValue(item.borderColor) || COLORS.goldSoft,
                backgroundColor: visualValue(item.backgroundColor) || "rgba(255,255,255,0.06)",
              },
            ]}
          >
            <View
              style={[
                styles.highlightIconWrap,
                { backgroundColor: hexWithAlpha(visualValue(item.iconColor)) || visualValue(item.backgroundColor) || "rgba(224,169,75,0.16)" },
              ]}
            >
              <MaterialCommunityIcon
                name={getItemIcon(item, "check-decagram-outline")}
                size={18}
                color={visualValue(item.iconColor) || sectionAccent}
              />
            </View>
            <View style={styles.highlightTextWrap}>
              <Text style={[styles.highlightTitle, { color: visualValue(item.color) || COLORS.white }]}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.highlightSubText}>{item.subtitle}</Text> : null}
            </View>
            {item.value ? <Text style={[styles.highlightValue, { color: visualValue(item.iconColor) || sectionAccent }]}>{item.value}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function DynamicHomeSectionsComponent() {
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
      {sections.map((section, index) => {
        const key = sectionKey(section, index);
        if (section.type === "STATS") return <StatsSection key={key} section={section} />;
        if (section.type === "TRUST") return <TrustSection key={key} section={section} />;
        if (section.type === "TAGLINE") return <TaglineSection key={key} section={section} />;
        if (section.type === "HIGHLIGHTS") return <HighlightsSection key={key} section={section} />;
        return null;
      })}
    </View>
  );
}

export const DynamicHomeSections = memo(DynamicHomeSectionsComponent);

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "stretch", gap: 14 },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    alignSelf: "stretch",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.white,
    padding: 18,
    gap: 10,
    shadowColor: COLORS.slate900,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statsSectionCard: {
    marginHorizontal: 0,
    borderRadius: 20,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.slate900 },
  sectionTitleLarge: { fontSize: 28, fontWeight: "900", color: COLORS.navy, letterSpacing: 0.1, lineHeight: 34 },
  sectionSubtitle: { fontSize: 14, color: COLORS.slate500, lineHeight: 20, fontWeight: "600" },
  statsSectionTitle: { color: COLORS.white },
  statsSectionSubtitle: { color: "rgba(255,255,255,0.82)" },
  trustSectionCard: {
    marginHorizontal: 0,
    borderRadius: 20,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  trustSectionTitle: { color: COLORS.white },
  trustSectionSubtitle: { color: "rgba(255,255,255,0.82)" },
  trustHeadRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  trustShieldWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  trustHeadText: { flex: 1, gap: 6 },
  trustMetricRow: { paddingTop: 2, paddingBottom: 2, gap: 8 },
  trustMetricCard: {
    minWidth: 96,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 4,
  },
  trustMetricValue: { color: COLORS.goldSoft, fontSize: 16, fontWeight: "900" },
  trustMetricLabel: { color: COLORS.white, fontSize: 10, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statTile: {
    width: "48%",
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 13,
    paddingVertical: 11,
    justifyContent: "space-between",
    gap: 6,
  },
  statTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statTrendBadge: {
    flex: 1,
    minWidth: 0,
    maxWidth: "82%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statTrendText: { color: COLORS.white, fontSize: 9, fontWeight: "800", flexShrink: 1, lineHeight: 11 },
  statValue: { fontSize: 34, fontWeight: "900", color: COLORS.goldSoft, letterSpacing: 0.1, lineHeight: 38 },
  statValueCompact: { fontSize: 27, lineHeight: 32 },
  statTitle: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.92)", lineHeight: 16 },
  trustList: { gap: 10 },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  trustDivider: {
    height: 1,
    marginHorizontal: 10,
    marginTop: 7,
    marginBottom: 3,
  },
  trustText: { flex: 1, fontSize: 15, fontWeight: "800", color: COLORS.white, lineHeight: 21 },
  trustTextWrap: { flex: 1, gap: 2 },
  trustSubText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  trustValue: { fontSize: 13, fontWeight: "900", color: COLORS.goldSoft },
  taglineCard: {
    marginHorizontal: 0,
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 20,
    paddingHorizontal: 0,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  taglineHeadRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 18 },
  taglineHeadText: { flex: 1, gap: 6 },
  taglineSectionTitle: { color: COLORS.white },
  taglineSectionSubtitle: { color: "rgba(255,255,255,0.82)" },
  taglineItemsWrap: { gap: 8, paddingHorizontal: 18 },
  taglineText: { fontSize: 15, fontWeight: "800", color: COLORS.white, lineHeight: 21 },
  taglineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  taglineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224,169,75,0.16)",
  },
  taglineItemTextWrap: { flex: 1, gap: 2 },
  taglineSubText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  taglineValue: { fontSize: 13, fontWeight: "900", color: COLORS.goldSoft },
  highlightsCard: {
    marginHorizontal: 0,
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 20,
    paddingHorizontal: 0,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  highlightsHeadRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 18 },
  highlightsHeadText: { flex: 1, gap: 6 },
  highlightsSectionTitle: { color: COLORS.white },
  highlightsSectionSubtitle: { color: "rgba(255,255,255,0.82)" },
  highlightsList: { gap: 10, paddingHorizontal: 18 },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  highlightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224,169,75,0.16)",
  },
  highlightTextWrap: { flex: 1, gap: 2 },
  highlightTitle: { fontSize: 15, fontWeight: "800", color: COLORS.white, lineHeight: 21 },
  highlightSubText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  highlightValue: { fontSize: 13, fontWeight: "900", color: COLORS.goldSoft },
  heading: { fontSize: 30, fontWeight: "900", marginTop: 22, marginHorizontal: 16, color: COLORS.navy, lineHeight: 36 },
  headingSub: { fontSize: 16, color: COLORS.green600, marginHorizontal: 16, marginTop: 6, fontWeight: "800" },
});

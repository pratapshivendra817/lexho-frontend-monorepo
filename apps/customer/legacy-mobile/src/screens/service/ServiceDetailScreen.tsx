import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Alert, Animated, ImageBackground, PanResponder, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";

import { getCookCoverage, getDisplayCookCoverageItems } from "../../api/cookCoverageApi";
import { getCookFamilySizes, type CookFamilySizeOptionDto } from "../../api/cookFamilySizeApi";
import { fetchServiceDetails, type CustomerServiceDetailsDto, type ServiceAddonDto } from "../../api/serviceApi";
import { getCookSubscriptionPriceQuote, getSubscriptionPricing, type CookFamilySize, type SubscriptionDurationPrice } from "../../api/subscriptionPricingApi";
import { CLEANING_COVERAGE_OPTIONS } from "../../constants/cleaningCoverageConfig";
import { palette, spacing } from "../../constants/theme";
import { addToCartThunk, setScheduledTime } from "../../redux/cartSlice";
import { useAppDispatch } from "../../redux/hooks";
import { trackServiceAddedToCart, trackServiceViewed } from "../../services/customerAnalyticsEvents";

type LoadState = "idle" | "loading" | "success" | "error";
type AddonSelection = Record<number, { selected: boolean; quantity: number }>;
type CookCoverageOption = {
  key: CookFamilySize;
  label: string;
  subtitle: string;
  items: string[];
};

const COOK_COVERAGE_OPTIONS: CookCoverageOption[] = [
  { key: "SMALL", label: "1-2 Members", subtitle: "Small family", items: ["Dal", "Rice", "1 Sabzi", "8-10 Rotis"] },
  { key: "MEDIUM", label: "3-4 Members", subtitle: "Most popular", items: ["Dal", "Rice", "2 Sabzi", "12-15 Rotis", "Salad"] },
  { key: "LARGE", label: "5-6 Members", subtitle: "Medium family", items: ["Dal", "Rice", "2-3 Sabzi", "18-20 Rotis", "Salad"] },
  { key: "XLARGE", label: "6-8 Members", subtitle: "Large family", items: ["Dal", "Rice", "3 Sabzi", "25+ Rotis", "Salad", "Basic meal prep"] },
];
const MIN_SUBSCRIPTION_VISITS = 3;

function clampQuantity(value: number, addon: ServiceAddonDto) {
  return Math.max(addon.minQuantity, Math.min(addon.maxQuantity, value));
}

function parseAmount(value: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `Rs. ${amount.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;
}

function formatDurationLabel(value?: number | null) {
  const duration = Number(value ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return "";
  return duration === 1 ? "1 hr" : `${duration} hrs`;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function buildInitialAddonSelection(addons: ServiceAddonDto[]): AddonSelection {
  return addons.reduce<AddonSelection>((acc, addon) => {
    acc[addon.addonId] = {
      selected: addon.required,
      quantity: addon.minQuantity,
    };
    return acc;
  }, {});
}

function buildCleaningDurationOptions(pricing: SubscriptionDurationPrice[]) {
  const rows = pricing.length > 0
    ? pricing
    : CLEANING_COVERAGE_OPTIONS.map((item) => ({ id: 0, serviceId: null, durationHours: item.durationHours, perVisitPrice: 0, active: true }));
  const byDuration = new Map<number, { hours: number; price: number }>();
  rows.forEach((item) => {
    const hours = Number(item.durationHours);
    if (!Number.isFinite(hours) || hours <= 0) return;
    const current = byDuration.get(hours);
    if (!current || item.serviceId != null) {
      byDuration.set(hours, { hours, price: Number(item.perVisitPrice ?? 0) });
    }
  });
  return Array.from(byDuration.values()).sort((first, second) => first.hours - second.hours);
}

function SectionCard({
  title,
  icon,
  color,
  borderColor,
  items,
  emptyText,
  expanded,
  onToggle,
}: {
  title: string;
  icon: string;
  color: string;
  borderColor: string;
  items: string[];
  emptyText: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isFaq = title === "FAQs";
  const [expandedFaqIndexes, setExpandedFaqIndexes] = useState<Record<number, boolean>>({});

  const parseFaqItem = (value: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return { question: "", answer: "", prefixedQuestion: false, prefixedAnswer: false };
    const normalized = raw.replace(/\s+/g, " ");
    const qPrefixed = /^\s*Q\d*[\s:.)-]+/i.test(normalized);
    const aPrefixed = /^\s*A\d*[\s:.)-]+/i.test(normalized);
    const bothMatch = normalized.match(/^\s*Q\d*[\s:.)-]+(.+?)\s+A\d*[\s:.)-]+(.+)$/i);
    if (bothMatch) {
      return {
        question: bothMatch[1].trim(),
        answer: bothMatch[2].trim(),
        prefixedQuestion: true,
        prefixedAnswer: true,
      };
    }
    if (qPrefixed) {
      return {
        question: normalized.replace(/^\s*Q\d*[\s:.)-]+/i, "").trim(),
        answer: "",
        prefixedQuestion: true,
        prefixedAnswer: false,
      };
    }
    if (aPrefixed) {
      return {
        question: "",
        answer: normalized.replace(/^\s*A\d*[\s:.)-]+/i, "").trim(),
        prefixedQuestion: false,
        prefixedAnswer: true,
      };
    }
    return { question: normalized, answer: "", prefixedQuestion: false, prefixedAnswer: false };
  };

  const buildFaqPairs = (rows: string[]) => {
    const pairs: Array<{ question: string; answer: string }> = [];
    let pendingQuestion = "";
    rows.forEach((row) => {
      const parsed = parseFaqItem(row);
      if (!parsed.question && !parsed.answer) return;
      if (parsed.prefixedQuestion && parsed.prefixedAnswer) {
        if (pendingQuestion) {
          pairs.push({ question: pendingQuestion, answer: "" });
          pendingQuestion = "";
        }
        pairs.push({ question: parsed.question, answer: parsed.answer });
        return;
      }
      if (parsed.prefixedQuestion) {
        if (pendingQuestion) pairs.push({ question: pendingQuestion, answer: "" });
        pendingQuestion = parsed.question;
        return;
      }
      if (parsed.prefixedAnswer) {
        if (pendingQuestion) {
          pairs.push({ question: pendingQuestion, answer: parsed.answer });
          pendingQuestion = "";
        } else {
          pairs.push({ question: "", answer: parsed.answer });
        }
        return;
      }
      if (pendingQuestion) {
        pairs.push({ question: pendingQuestion, answer: parsed.question });
        pendingQuestion = "";
      } else {
        pendingQuestion = parsed.question;
      }
    });
    if (pendingQuestion) pairs.push({ question: pendingQuestion, answer: "" });
    return pairs;
  };

  const faqPairs = isFaq ? buildFaqPairs(items) : [];

  const toggleFaqItem = (index: number) => {
    setExpandedFaqIndexes((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <View style={[styles.sectionCard, { borderColor }]}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <MaterialCommunityIcon name={icon} size={18} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <MaterialCommunityIcon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={color}
          style={styles.sectionChevron}
        />
      </Pressable>
      {expanded ? (
        items.length === 0 ? (
          <Text style={styles.emptyText}>{emptyText}</Text>
        ) : (
          isFaq ? (
            <View style={styles.itemsWrap}>
              {faqPairs.map((faq, index) => (
                <View key={`${title}-faq-${index}`} style={styles.faqAccordionItem}>
                  <Pressable style={styles.faqAccordionHeader} onPress={() => toggleFaqItem(index)}>
                    <MaterialCommunityIcon name={icon} size={14} color={color} />
                    <Text style={styles.faqQuestionText}>{`Q: ${faq.question}`}</Text>
                    <MaterialCommunityIcon
                      name={expandedFaqIndexes[index] ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={color}
                      style={styles.faqChevron}
                    />
                  </Pressable>
                  {expandedFaqIndexes[index] && faq.answer ? (
                    <View style={styles.faqAnswerRow}>
                      <Text style={styles.faqAnswerText}>{`A: ${faq.answer}`}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.itemsWrap}>
              {items.map((item, index) => (
                <View key={`${title}-${item}-${index}`} style={styles.itemRow}>
                  <MaterialCommunityIcon name={icon} size={14} color={color} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          )
        )
      ) : null}
    </View>
  );
}

export function ServiceDetailScreen({ route, navigation }: any) {
  const dispatch = useAppDispatch();
  const { height: windowHeight } = useWindowDimensions();
  const serviceIdParam = String(route?.params?.serviceId ?? "").trim();
  const serviceNameParam = String(route?.params?.serviceName ?? "").trim();
  const servicePriceLabelParam = String(route?.params?.servicePriceLabel ?? "").trim();
  const serviceImageUrlParam = String(route?.params?.serviceImageUrl ?? "").trim();
  const sourceParam = String(route?.params?.source ?? "").trim();
  const bookingModeParam = String(route?.params?.bookingMode ?? "").trim();
  const scheduleModeParam = String(route?.params?.scheduleMode ?? "").trim();
  const categoryIdParam = String(route?.params?.categoryId ?? "").trim();
  const categoryNameParam = String(route?.params?.categoryName ?? "").trim();
  const cookFamilySizeIdParam = Number(route?.params?.cookFamilySizeId ?? 0);
  const cookFamilySizeParam = String(route?.params?.cookFamilySize ?? "").trim();
  const cookFamilySizeLabelParam = String(route?.params?.cookFamilySizeLabel ?? "").trim();
  const durationHoursParam = Number(route?.params?.durationHours ?? 0);
  const durationLabelParam = String(route?.params?.durationLabel ?? "").trim();
  const requiresCookFamilySize = Boolean(route?.params?.requiresCookFamilySize);
  const showCookCoverageParam = Boolean(route?.params?.showCookCoverage);
  const showCleaningCoverageParam = Boolean(route?.params?.showCleaningCoverage);
  const isScheduleWizardSource = sourceParam === "schedule_booking_wizard";
  const isBookingWizardSource = isScheduleWizardSource || sourceParam === "instant_booking_wizard";

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [details, setDetails] = useState<CustomerServiceDetailsDto | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection>({});
  const [selectedCookCoverage, setSelectedCookCoverage] = useState<string | null>(
    (cookFamilySizeParam as CookFamilySize) || null,
  );
  const [selectedCleaningDuration, setSelectedCleaningDuration] = useState<number | null>(
    Number.isFinite(durationHoursParam) && durationHoursParam > 0 ? durationHoursParam : null,
  );
  const [cartNavigating, setCartNavigating] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    included: true,
    faqs: true,
    instructions: false,
    excluded: false,
  });
  const autoSectionSyncDoneRef = useRef(false);
  const trackedServiceViewRef = useRef("");

  const contentOffsetYRef = useRef(0);
  const sheetHeightAnim = useRef(new Animated.Value(0)).current;
  const dragStartHeightRef = useRef(0);

  const collapsedHeight = Math.max(windowHeight - 252, windowHeight * 0.52);

  useEffect(() => {
    sheetHeightAnim.setValue(sheetExpanded ? windowHeight : collapsedHeight);
  }, [collapsedHeight, sheetExpanded, sheetHeightAnim, windowHeight]);

  useEffect(() => {
    let alive = true;
    const canLoad = Number.isFinite(Number(serviceIdParam)) && Number(serviceIdParam) > 0;
    if (!canLoad) {
      setError("Invalid service id");
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    fetchServiceDetails(serviceIdParam)
      .then((payload) => {
        if (!alive) return;
        setDetails(payload);
        setSelectedAddons(buildInitialAddonSelection(payload.addons));
        setState("success");
        const trackedKey = String(payload.serviceId || serviceIdParam);
        if (trackedServiceViewRef.current !== trackedKey) {
          trackedServiceViewRef.current = trackedKey;
          void trackServiceViewed({
            service_id: Number(payload.serviceId || serviceIdParam),
            service_name: payload.serviceName,
            source: "service_detail",
          });
        }
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Unable to load service details");
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [serviceIdParam]);

  useEffect(() => {
    autoSectionSyncDoneRef.current = false;
    setExpandedSections({
      included: true,
      faqs: true,
      instructions: false,
      excluded: false,
    });
  }, [serviceIdParam]);

  const expandSheet = () => {
    if (sheetExpanded) return;
    Animated.timing(sheetHeightAnim, {
      toValue: windowHeight,
      duration: 220,
      useNativeDriver: false,
    }).start(() => setSheetExpanded(true));
  };

  const collapseSheet = () => {
    if (!sheetExpanded) return;
    Animated.timing(sheetHeightAnim, {
      toValue: collapsedHeight,
      duration: 190,
      useNativeDriver: false,
    }).start(() => {
      setSheetExpanded(false);
      contentOffsetYRef.current = 0;
    });
  };

  const sheetPanResponder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
      const vertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      if (!vertical) return false;
      if (!sheetExpanded && gestureState.dy < -6) return true;
      if (sheetExpanded && gestureState.dy > 2) return true;
      return false;
    },
    onPanResponderGrant: () => {
      dragStartHeightRef.current = (sheetHeightAnim as any).__getValue?.() ?? collapsedHeight;
    },
    onPanResponderMove: (_evt, gestureState) => {
      const next = Math.max(collapsedHeight, Math.min(windowHeight, dragStartHeightRef.current - gestureState.dy));
      sheetHeightAnim.setValue(next);
    },
    onPanResponderRelease: (_evt, gestureState) => {
      const current = (sheetHeightAnim as any).__getValue?.() ?? collapsedHeight;
      const mid = (collapsedHeight + windowHeight) / 2;
      if (!sheetExpanded) {
        if (-gestureState.dy > 5 || current > mid) expandSheet();
        else {
          Animated.timing(sheetHeightAnim, { toValue: collapsedHeight, duration: 180, useNativeDriver: false }).start();
        }
        return;
      }
      if (gestureState.dy > 5 || current < mid) collapseSheet();
      else {
        Animated.timing(sheetHeightAnim, { toValue: windowHeight, duration: 180, useNativeDriver: false }).start();
      }
    },
  });

  const closeSheet = () => {
    sheetHeightAnim.stopAnimation();
    navigation.goBack();
  };

  const shareService = async () => {
    if (!details) return;
    await Share.share({
      title: details.serviceName,
      message: `Check this service: ${details.serviceName}\nService ID: ${details.serviceId}\nBook quickly from the Lexho app.`,
    });
  };

  const bannerImageUrl = serviceImageUrlParam || details?.imageUrl || "";
  const shouldShowCookCoverage = useMemo(() => {
    const normalized = normalizeSearch(`${categoryNameParam} ${details?.serviceName ?? serviceNameParam}`);
    return showCookCoverageParam
      || requiresCookFamilySize
      || normalized.includes("cook")
      || normalized.includes("chef")
      || normalized.includes("breakfast")
      || normalized.includes("party")
      || normalized.includes("parties");
  }, [categoryNameParam, details?.serviceName, requiresCookFamilySize, serviceNameParam, showCookCoverageParam]);
  const shouldShowCleaningCoverage = useMemo(() => {
    const normalized = normalizeSearch(`${categoryNameParam} ${details?.serviceName ?? serviceNameParam}`);
    return showCleaningCoverageParam || normalized.includes("clean");
  }, [categoryNameParam, details?.serviceName, serviceNameParam, showCleaningCoverageParam]);
  const cookFamilySizeQuery = useQuery({
    queryKey: ["customer-cook-family-sizes"],
    queryFn: getCookFamilySizes,
    enabled: shouldShowCookCoverage,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const effectiveCookServiceId = Number(details?.serviceId ?? serviceIdParam) || undefined;
  const cleaningPricingQuery = useQuery({
    queryKey: ["service-detail-cleaning-pricing", details?.serviceId ?? serviceIdParam],
    queryFn: () => getSubscriptionPricing(Number(details?.serviceId ?? serviceIdParam) || undefined),
    enabled: shouldShowCleaningCoverage,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const cleaningDurationOptions = useMemo(
    () => buildCleaningDurationOptions(cleaningPricingQuery.data ?? []),
    [cleaningPricingQuery.data],
  );
  const selectedCleaningDurationOption = useMemo(
    () => cleaningDurationOptions.find((item) => item.hours === selectedCleaningDuration) ?? null,
    [cleaningDurationOptions, selectedCleaningDuration],
  );
  const cookFamilySizeOptions: CookFamilySizeOptionDto[] = cookFamilySizeQuery.data ?? [];
  const selectedCookCoverageOption = cookFamilySizeOptions.find((item) =>
    String(item.familySize) === String(selectedCookCoverage) ||
    Number(item.familySizeId) === Number(cookFamilySizeIdParam),
  ) ?? null;
  const resolvedCookFamilySizeId = selectedCookCoverageOption?.familySizeId ?? (cookFamilySizeIdParam > 0 ? cookFamilySizeIdParam : undefined);
  const resolvedCookFamilySize = (selectedCookCoverageOption?.familySize ?? cookFamilySizeParam ?? "SMALL") as CookFamilySize;
  const resolvedCookFamilySizeLabel = selectedCookCoverageOption?.label ?? cookFamilySizeLabelParam;
  const displayCookCoverageFamily: CookFamilySize = "SMALL";
  const cookCoverageBaseQuery = useQuery({
    queryKey: ["service-detail-cook-coverage", effectiveCookServiceId ?? "global", displayCookCoverageFamily],
    queryFn: () => getCookCoverage({ serviceId: effectiveCookServiceId, familySize: displayCookCoverageFamily }),
    enabled: shouldShowCookCoverage,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const cookCoverageSelectedQuery = useQuery({
    queryKey: ["service-detail-cook-coverage", effectiveCookServiceId ?? "global", resolvedCookFamilySize],
    queryFn: () => getCookCoverage({ serviceId: effectiveCookServiceId, familySize: resolvedCookFamilySize }),
    enabled: shouldShowCookCoverage && resolvedCookFamilySize !== displayCookCoverageFamily,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const cookPriceQuoteQuery = useQuery({
    queryKey: ["service-detail-cook-price", effectiveCookServiceId ?? "global", resolvedCookFamilySize],
    queryFn: () => getCookSubscriptionPriceQuote({
      serviceId: effectiveCookServiceId,
      familySize: resolvedCookFamilySize,
      visits: MIN_SUBSCRIPTION_VISITS,
    }),
    enabled: shouldShowCookCoverage && Boolean(effectiveCookServiceId) && Boolean(resolvedCookFamilySize),
    retry: false,
    staleTime: 60 * 1000,
  });
  const resolvedDurationHours = selectedCleaningDuration ?? (Number.isFinite(durationHoursParam) && durationHoursParam > 0 ? durationHoursParam : null);
  const resolvedDurationLabel = resolvedDurationHours ? (durationLabelParam || formatDurationLabel(resolvedDurationHours)) : "";
  const cookCoverageItems = getDisplayCookCoverageItems({
    baseCoverageItems: cookCoverageBaseQuery.data?.items,
    selectedCoverageItems: resolvedCookFamilySize === displayCookCoverageFamily
      ? cookCoverageBaseQuery.data?.items
      : cookCoverageSelectedQuery.data?.items,
  });

  const goToCart = async () => {
    const resolvedServiceId = Number(details?.serviceId ?? serviceIdParam);
    if (!Number.isFinite(resolvedServiceId) || resolvedServiceId <= 0) {
      Alert.alert("Unable to open cart", "Service id is missing.");
      return;
    }
    if (shouldShowCookCoverage && !resolvedCookFamilySize) {
      Alert.alert("Select family size", "Please select a family size in Cook Coverage before going to cart.");
      return;
    }
    if (shouldShowCleaningCoverage && !resolvedDurationHours) {
      Alert.alert("Select duration", "Please select a time based duration before going to cart.");
      return;
    }
    if (cartNavigating) return;
    setCartNavigating(true);
    try {
      await dispatch(addToCartThunk({
        serviceId: resolvedServiceId,
        quantity: 1,
        addons: selectedAddonPayload,
        familySizeId: resolvedCookFamilySizeId,
        familySize: resolvedCookFamilySize || undefined,
        familySizeLabel: resolvedCookFamilySizeLabel || undefined,
      })).unwrap();
      void trackServiceAddedToCart({
        service_id: resolvedServiceId,
        service_name: details?.serviceName || serviceNameParam,
        category_id: categoryIdParam || undefined,
        category_name: categoryNameParam || undefined,
        booking_mode: isScheduleWizardSource ? "SCHEDULED" : undefined,
        schedule_mode: scheduleModeParam || undefined,
        quantity: 1,
        source: sourceParam || "service_detail",
      });
      if (isScheduleWizardSource) {
        dispatch(setScheduledTime(null));
      }
      navigation.navigate("CartCrud", {
        bookingMode: bookingModeParam || (isScheduleWizardSource ? "SCHEDULED" : undefined),
        scheduleMode: scheduleModeParam || undefined,
        serviceId: resolvedServiceId,
        cookFamilySizeId: resolvedCookFamilySizeId || undefined,
        cookFamilySize: resolvedCookFamilySize || undefined,
        cookFamilySizeLabel: resolvedCookFamilySizeLabel || undefined,
        durationHours: resolvedDurationHours || undefined,
        durationLabel: resolvedDurationLabel || undefined,
      });
    } catch (error: any) {
      Alert.alert("Unable to add service", String(error?.message ?? "Please try again."));
    } finally {
      setCartNavigating(false);
    }
  };

  const toggleAddon = (addon: ServiceAddonDto) => {
    if (addon.required) return;
    setSelectedAddons((prev) => {
      const current = prev[addon.addonId] ?? { selected: false, quantity: addon.minQuantity };
      return {
        ...prev,
        [addon.addonId]: {
          selected: !current.selected,
          quantity: clampQuantity(current.quantity || addon.minQuantity, addon),
        },
      };
    });
  };

  const changeAddonQuantity = (addon: ServiceAddonDto, delta: number) => {
    setSelectedAddons((prev) => {
      const current = prev[addon.addonId] ?? { selected: addon.required, quantity: addon.minQuantity };
      return {
        ...prev,
        [addon.addonId]: {
          selected: true,
          quantity: clampQuantity((current.quantity || addon.minQuantity) + delta, addon),
        },
      };
    });
  };

  const toggleSection = (key: "included" | "faqs" | "instructions" | "excluded") => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allSectionsExpanded =
    expandedSections.included &&
    expandedSections.faqs &&
    expandedSections.instructions &&
    expandedSections.excluded;
  const serviceBaseAmount = useMemo(() => {
    const cookPrice = Number(cookPriceQuoteQuery.data?.pricePerVisit ?? 0);
    if (shouldShowCookCoverage && cookPrice > 0) return cookPrice;
    const cleaningPrice = Number(selectedCleaningDurationOption?.price ?? 0);
    if (shouldShowCleaningCoverage && cleaningPrice > 0) return cleaningPrice;
    const detailPrice = Number(details?.price ?? 0);
    return detailPrice > 0 ? detailPrice : parseAmount(servicePriceLabelParam);
  }, [
    cookPriceQuoteQuery.data?.pricePerVisit,
    details?.price,
    selectedCleaningDurationOption?.price,
    servicePriceLabelParam,
    shouldShowCleaningCoverage,
    shouldShowCookCoverage,
  ]);
  const selectedAddonPayload = useMemo(
    () =>
      (details?.addons ?? [])
        .filter((addon) => {
          const selection = selectedAddons[addon.addonId];
          return addon.required || Boolean(selection?.selected);
        })
        .map((addon) => ({
          addonId: addon.addonId,
          quantity: clampQuantity(selectedAddons[addon.addonId]?.quantity ?? addon.minQuantity, addon),
        })),
    [details?.addons, selectedAddons],
  );
  const addonsTotal = useMemo(
    () =>
      (details?.addons ?? []).reduce((sum, addon) => {
        const selected = selectedAddonPayload.find((item) => item.addonId === addon.addonId);
        return selected ? sum + addon.price * selected.quantity : sum;
      }, 0),
    [details?.addons, selectedAddonPayload],
  );
  const totalAmount = serviceBaseAmount + addonsTotal;
  const serviceHeadlinePriceLabel = serviceBaseAmount > 0 ? formatAmount(serviceBaseAmount) : servicePriceLabelParam || "Rs --";
  const hasAddons = (details?.addons?.length ?? 0) > 0;

  const toggleAllSections = () => {
    if (allSectionsExpanded) {
      setExpandedSections({
        included: false,
        faqs: false,
        instructions: false,
        excluded: false,
      });
      return;
    }
    setExpandedSections({
      included: true,
      faqs: true,
      instructions: true,
      excluded: true,
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.backdrop} />
      {bannerImageUrl ? (
        <ImageBackground
          source={{ uri: bannerImageUrl }}
          style={styles.bannerImage}
          imageStyle={styles.bannerImageInner}
          resizeMode="cover"
        >
          <View style={styles.bannerOverlay} />
        </ImageBackground>
      ) : (
        <View style={styles.bannerFallback} />
      )}
      <Pressable style={styles.dismissLayer} onPress={closeSheet} />
      <Pressable style={styles.sheetBackButton} onPress={closeSheet} hitSlop={12}>
        <MaterialCommunityIcon name="chevron-left" size={22} color={palette.white} />
      </Pressable>
      {details ? (
        <Pressable style={styles.bannerShareBtn} onPress={() => void shareService()}>
          <MaterialCommunityIcon name="share-variant-outline" size={18} color={palette.white} />
        </Pressable>
      ) : null}

      <Animated.View style={[styles.sheet, { height: sheetHeightAnim }]} {...sheetPanResponder.panHandlers}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetExpanded}
          onScroll={(event) => {
            const y = Number(event?.nativeEvent?.contentOffset?.y ?? 0);
            contentOffsetYRef.current = y;
            if (!autoSectionSyncDoneRef.current && y > 18) {
              autoSectionSyncDoneRef.current = true;
              setExpandedSections({
                included: true,
                faqs: true,
                instructions: false,
                excluded: false,
              });
            }
          }}
          onScrollBeginDrag={(event) => {
            const y = Number(event?.nativeEvent?.contentOffset?.y ?? 0);
            if (sheetExpanded && y <= 1) {
              const vy = Number(event?.nativeEvent?.velocity?.y ?? 0);
              if (vy < -0.2) collapseSheet();
            }
          }}
          scrollEventThrottle={16}
        >
          {!sheetExpanded ? (
            <Pressable style={styles.expandTapZone} onPress={expandSheet}>
              <View style={styles.handle} />
            </Pressable>
          ) : null}

          {state === "loading" ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={palette.primaryDark} />
              <Text style={styles.helper}>Loading service details...</Text>
            </View>
          ) : null}

          {state === "error" ? (
            <View style={styles.centerState}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={expandSheet} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {state === "success" && details ? (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.title}>{details.serviceName || serviceNameParam || "Service"}</Text>
                <View style={styles.priceActionRow}>
                  <Text style={styles.priceText}>{serviceHeadlinePriceLabel}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isBookingWizardSource ? "Go to cart" : "Add service to cart"}
                    style={styles.quickAddBtn}
                    onPress={() => void goToCart()}
                  >
                    {cartNavigating ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <MaterialCommunityIcon name={isBookingWizardSource ? "cart-arrow-right" : "plus"} size={16} color={palette.white} />
                    )}
                  </Pressable>
                </View>
                <Text style={styles.subtitle}>Review what this service includes before booking.</Text>
              </View>

              {shouldShowCookCoverage ? (
                <View style={styles.cookCoverageSection}>
                  <View>
                    <Text style={styles.sectionTitle}>Cook Coverage</Text>
                    <Text style={styles.cookCoverageSubtitle}>Select family size to review meal coverage for this cook service.</Text>
                  </View>
                  <View style={styles.cookCoverageGrid}>
                    {cookFamilySizeOptions.map((option) => {
                      const active = selectedCookCoverage === String(option.familySize) || (!selectedCookCoverage && cookFamilySizeLabelParam === option.label);
                      return (
                        <Pressable
                          key={`${option.familySizeId}-${option.familySize}`}
                          style={[styles.cookCoverageCard, active && styles.cookCoverageCardActive]}
                          onPress={() => setSelectedCookCoverage(String(option.familySize))}
                        >
                          <View style={[styles.cookCoverageIcon, active && styles.cookCoverageIconActive]}>
                            <MaterialCommunityIcon name="account-group-outline" size={18} color={active ? palette.primaryDark : "#E0A94B"} />
                          </View>
                          <View style={styles.cookCoverageTextWrap}>
                            <Text style={[styles.cookCoverageTitle, active && styles.cookCoverageTitleActive]}>{option.label}</Text>
                            <Text style={styles.cookCoverageSub}>{option.subtitle ?? "Family size"}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.cookCoverageItems}>
                    {cookCoverageItems.length > 0 ? (
                      cookCoverageItems.map((item) => (
                        <View key={item} style={styles.cookCoverageItem}>
                          <MaterialCommunityIcon name="check-circle-outline" size={14} color="#22C55E" />
                          <Text style={styles.cookCoverageItemText}>{item}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.cookCoverageEmptyText}>No meal coverage available right now.</Text>
                    )}
                  </View>
                </View>
              ) : null}

              {shouldShowCleaningCoverage ? (
                <View style={styles.cleaningDurationSection}>
                  <View>
                    <Text style={styles.sectionTitle}>Time Based</Text>
                    <Text style={styles.cleaningDurationSubtitle}>Select cleaning duration.</Text>
                  </View>
                  <View style={styles.cleaningDurationGrid}>
                    {cleaningDurationOptions.map((option) => {
                      const active = selectedCleaningDuration === option.hours;
                      return (
                        <Pressable
                          key={`cleaning-duration-${option.hours}`}
                          style={[styles.cleaningDurationCard, active && styles.cleaningDurationCardActive]}
                          onPress={() => setSelectedCleaningDuration(option.hours)}
                        >
                          <MaterialCommunityIcon name="clock-time-four-outline" size={20} color={active ? palette.primaryDark : "#E0A94B"} />
                          <Text style={[styles.cleaningDurationTitle, active && styles.cleaningDurationTitleActive]}>
                            {formatDurationLabel(option.hours)}
                          </Text>
                          <Text style={[styles.cleaningDurationPrice, active && styles.cleaningDurationPriceActive]}>
                            {cleaningPricingQuery.isFetching && option.price <= 0 ? "Fetching price..." : option.price > 0 ? formatAmount(option.price) : "Price unavailable"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.addonsSection}>
                <View style={styles.addonsHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Recommended Add-ons</Text>
                    <Text style={styles.addonsSubtitle}>
                      {hasAddons ? "Enhance your service with additional options." : "No add-ons available for this service right now."}
                    </Text>
                  </View>
                </View>
                {hasAddons ? (
                  <>
                    {details.addons.map((addon) => {
                      const selection = selectedAddons[addon.addonId] ?? { selected: addon.required, quantity: addon.minQuantity };
                      const selected = addon.required || selection.selected;
                      const quantity = clampQuantity(selection.quantity, addon);
                      const canDecrease = quantity > addon.minQuantity;
                      const canIncrease = quantity < addon.maxQuantity;
                      return (
                        <Pressable
                          key={addon.addonId}
                          style={[styles.addonCard, selected && styles.addonCardSelected]}
                          onPress={() => toggleAddon(addon)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected, disabled: addon.required }}
                        >
                          <View style={styles.addonTopRow}>
                            <MaterialCommunityIcon
                              name={selected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                              size={21}
                              color={selected ? "#22C55E" : "rgba(255,255,255,0.65)"}
                            />
                            <View style={styles.addonTextWrap}>
                              <View style={styles.addonNameRow}>
                                <Text style={styles.addonName}>{addon.name}</Text>
                                {addon.required ? (
                                  <View style={styles.requiredBadge}>
                                    <Text style={styles.requiredBadgeText}>Required</Text>
                                  </View>
                                ) : null}
                              </View>
                              {addon.shortDescription ? <Text style={styles.addonDescription}>{addon.shortDescription}</Text> : null}
                              <Text style={styles.addonPrice}>
                                {addon.quantityAllowed ? `${formatAmount(addon.price)} each` : `+${formatAmount(addon.price)}`}
                              </Text>
                            </View>
                          </View>
                          {selected && addon.quantityAllowed ? (
                            <View style={styles.quantityRow}>
                              <Pressable
                                style={[styles.quantityButton, !canDecrease && styles.quantityButtonDisabled]}
                                onPress={() => changeAddonQuantity(addon, -1)}
                                disabled={!canDecrease}
                              >
                                <MaterialCommunityIcon name="minus" size={15} color={canDecrease ? palette.white : "rgba(255,255,255,0.42)"} />
                              </Pressable>
                              <Text style={styles.quantityText}>{quantity}</Text>
                              <Pressable
                                style={[styles.quantityButton, !canIncrease && styles.quantityButtonDisabled]}
                                onPress={() => changeAddonQuantity(addon, 1)}
                                disabled={!canIncrease}
                              >
                                <MaterialCommunityIcon name="plus" size={15} color={canIncrease ? palette.white : "rgba(255,255,255,0.42)"} />
                              </Pressable>
                              <Text style={styles.addonLineTotal}>Total: {formatAmount(addon.price * quantity)}</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </>
                ) : null}
                <View style={styles.priceSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service Price</Text>
                    <Text style={styles.summaryValue}>{formatAmount(serviceBaseAmount)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Add-ons</Text>
                    <Text style={styles.summaryValue}>{formatAmount(addonsTotal)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>{formatAmount(totalAmount)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionActionsRow}>
                <Pressable style={styles.sectionActionBtn} onPress={toggleAllSections}>
                  <Text style={styles.sectionActionText}>{allSectionsExpanded ? "Hide All" : "Show All"}</Text>
                </Pressable>
              </View>

              <SectionCard
                title="What is Included"
                icon="check-circle-outline"
                color={palette.success}
                borderColor="rgba(34, 197, 94, 0.45)"
                items={details.included}
                emptyText="No items included"
                expanded={expandedSections.included}
                onToggle={() => toggleSection("included")}
              />
              <SectionCard
                title="FAQs"
                icon="comment-question-outline"
                color="#E0A94B"
                borderColor="rgba(59, 130, 246, 0.45)"
                items={details.faqs}
                emptyText="No FAQs available"
                expanded={expandedSections.faqs}
                onToggle={() => toggleSection("faqs")}
              />
              <SectionCard
                title="Instructions"
                icon="clipboard-text-outline"
                color="#E0A94B"
                borderColor="rgba(224, 169, 75, 0.55)"
                items={details.instructions}
                emptyText="No instructions available"
                expanded={expandedSections.instructions}
                onToggle={() => toggleSection("instructions")}
              />
              <SectionCard
                title="What is Not Included"
                icon="close-circle-outline"
                color={palette.danger}
                borderColor="rgba(239, 68, 68, 0.45)"
                items={details.excluded}
                emptyText="No exclusions"
                expanded={expandedSections.excluded}
                onToggle={() => toggleSection("excluded")}
              />

              <Pressable style={styles.bookBtn} onPress={() => void goToCart()} disabled={cartNavigating}>
                <View style={styles.bookBtnInner}>
                  {cartNavigating ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <MaterialCommunityIcon name={isBookingWizardSource ? "cart-arrow-right" : "calendar-check-outline"} size={18} color={palette.white} />
                  )}
                  <Text style={styles.bookBtnText}>{isBookingWizardSource ? "Go to Cart" : "Book Now"}</Text>
                </View>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#020617" },
  bannerImage: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 288,
    backgroundColor: palette.primaryDark,
  },
  bannerImageInner: { backgroundColor: palette.primaryDark },
  bannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.18)",
  },
  bannerFallback: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 288,
    backgroundColor: palette.primaryDark,
  },
  dismissLayer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  sheetBackButton: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 30,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(2, 27, 74, 0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerShareBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderColor: palette.borderSoft,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.md, paddingHorizontal: 0, gap: spacing.md },
  expandTapZone: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 44, height: 4, borderRadius: 999, backgroundColor: palette.borderSoft },
  centerState: { marginTop: 40, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  helper: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  errorText: { color: palette.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  retryBtn: { borderRadius: 10, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.card, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: palette.primaryDark, fontWeight: "700" },
  heroCard: {
    position: "relative",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.6)",
    backgroundColor: palette.primaryDark,
    padding: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "900", color: palette.white },
  subtitle: { marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 19 },
  priceActionRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceText: { color: palette.white, fontSize: 18, fontWeight: "900" },
  quickAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.accentBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  cookCoverageSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.6)",
    backgroundColor: palette.primaryDark,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cookCoverageSubtitle: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  cookCoverageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cookCoverageCard: {
    width: "48%",
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cookCoverageCardActive: {
    borderColor: "rgba(224,169,75,0.72)",
    backgroundColor: "rgba(224,169,75,0.14)",
  },
  cookCoverageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cookCoverageIconActive: { backgroundColor: "#E0A94B" },
  cookCoverageTextWrap: { flex: 1 },
  cookCoverageTitle: { color: palette.white, fontSize: 12, fontWeight: "900", lineHeight: 16 },
  cookCoverageTitleActive: { color: "#E0A94B" },
  cookCoverageSub: { marginTop: 2, color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: "700" },
  cookCoverageItems: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(2,6,23,0.22)",
    padding: 10,
    gap: 7,
  },
  cookCoverageItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  cookCoverageItemText: { color: palette.white, fontSize: 13, fontWeight: "700" },
  cookCoverageEmptyText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  cleaningDurationSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.6)",
    backgroundColor: palette.primaryDark,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cleaningDurationSubtitle: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  cleaningDurationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  cleaningDurationCard: {
    width: "48.5%",
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    justifyContent: "center",
    gap: 5,
  },
  cleaningDurationCardActive: {
    borderColor: "rgba(224,169,75,0.72)",
    backgroundColor: "#E0A94B",
  },
  cleaningDurationTitle: { color: palette.white, fontSize: 15, fontWeight: "900" },
  cleaningDurationTitleActive: { color: palette.primaryDark },
  cleaningDurationPrice: { color: "#E0A94B", fontSize: 13, fontWeight: "900" },
  cleaningDurationPriceActive: { color: palette.primaryDark },
  addonsSection: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.6)",
    backgroundColor: palette.primaryDark,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addonsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  addonsSubtitle: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  addonCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    gap: 10,
  },
  addonCardSelected: {
    borderColor: "rgba(34,197,94,0.58)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  addonTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  addonTextWrap: { flex: 1, gap: 4 },
  addonNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  addonName: { flexShrink: 1, color: palette.white, fontSize: 14, fontWeight: "900" },
  addonDescription: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  addonPrice: { color: "#E0A94B", fontSize: 13, fontWeight: "900" },
  requiredBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(224,169,75,0.14)",
  },
  requiredBadgeText: { color: "#E0A94B", fontSize: 10, fontWeight: "900" },
  quantityRow: {
    marginLeft: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap",
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.58)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  quantityButtonDisabled: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  quantityText: { minWidth: 18, textAlign: "center", color: palette.white, fontSize: 14, fontWeight: "900" },
  addonLineTotal: { marginLeft: 4, color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "800" },
  priceSummary: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(2,6,23,0.22)",
    padding: 12,
    gap: 8,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summaryLabel: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "700" },
  summaryValue: { color: palette.white, fontSize: 13, fontWeight: "800" },
  summaryDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.14)" },
  summaryTotalLabel: { color: palette.white, fontSize: 15, fontWeight: "900" },
  summaryTotalValue: { color: "#E0A94B", fontSize: 16, fontWeight: "900" },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.6)",
    backgroundColor: palette.primaryDark,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionChevron: { marginLeft: "auto" },
  sectionActionsRow: {
    marginTop: -4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  sectionActionBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.65)",
    backgroundColor: "rgba(2, 27, 74, 0.10)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionActionText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: palette.white },
  itemsWrap: { gap: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemText: { flex: 1, color: palette.white, fontSize: 14, fontWeight: "600" },
  faqTextWrap: { flex: 1, gap: 4 },
  faqAccordionItem: {
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.28)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  faqAccordionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  faqChevron: { marginLeft: "auto", marginTop: 2 },
  faqAnswerRow: { paddingLeft: 22, paddingTop: 6 },
  faqQuestionText: { flex: 1, color: palette.white, fontSize: 14, fontWeight: "800", lineHeight: 21 },
  faqAnswerText: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  emptyText: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" },
  bookBtn: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(224, 169, 75, 0.7)",
    backgroundColor: palette.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  bookBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  bookBtnText: { color: palette.white, fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
});

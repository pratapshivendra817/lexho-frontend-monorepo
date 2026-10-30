import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

import { getCookCoverage, getDisplayCookCoverageItems } from "../../api/cookCoverageApi";
import { getPopularCookServices } from "../../api/popularServicesApi";
import { getCategories } from "../../api/homeApi";
import { fetchCustomerServicesByCategory } from "../../api/serviceApi";
import { getCookSubscriptionPriceQuote, getSubscriptionPriceQuote, getSubscriptionPricing, type CookFamilySize } from "../../api/subscriptionPricingApi";
import { CleaningCoverageCard } from "../../components/booking/CleaningCoverageCard";
import { shadows } from "../../constants/theme";
import { COLORS } from "../../theme/colors";
import { trackSubscriptionPurchased } from "../../services/customerAnalyticsEvents";

type Weekday = {
  key: number;
  shortLabel: string;
  label: string;
};

type DatePickerMode = "start" | "end";
type RepeatServiceMode = "CLEANING" | "COOK" | "VEHICLE_WASH" | "FITNESS_WELLNESS";
const REPEAT_SERVICES = {
  COOK: { label: "Cook", icon: "chef-hat" },
  CLEANING: { label: "Cleaning", icon: "spray-bottle" },
  VEHICLE_WASH: { label: "Vehicle Wash", icon: "car-wash" },
  FITNESS_WELLNESS: { label: "Fitness & Wellness", icon: "yoga" },
} as const;
type CookFamilySizeOption = {
  key: CookFamilySize;
  members: string;
  label: string;
  subtitle: string;
  icon: string;
  items: string[];
};

const GREEN = "#0DB36B";
const SCREEN_BG = COLORS.navy;
const PANEL_BG = COLORS.navyDark;
const SHEET_BG = COLORS.navyDark;
const GOLD_BORDER = "rgba(224,169,75,0.72)";
const GOLD_SOFT_BG = "rgba(224,169,75,0.12)";
const MIN_SUBSCRIPTION_VISITS = 3;
const COOK_FAMILY_SIZE_OPTIONS: CookFamilySizeOption[] = [
  { key: "SMALL", members: "1-2", label: "1-2 Members", subtitle: "Suitable for small family", icon: "account-outline", items: ["Dal", "Rice", "1 Sabzi", "8-10 Rotis"] },
  { key: "MEDIUM", members: "3-4", label: "3-4 Members", subtitle: "Most popular", icon: "account-group-outline", items: ["Dal", "Rice", "2 Sabzi", "12-15 Rotis", "Salad"] },
  { key: "LARGE", members: "5-6", label: "5-6 Members", subtitle: "Medium family", icon: "account-multiple-outline", items: ["Dal", "Rice", "2-3 Sabzi", "18-20 Rotis", "Salad"] },
  { key: "XLARGE", members: "6-8", label: "6-8 Members", subtitle: "Large family", icon: "home-account", items: ["Dal", "Rice", "3 Sabzi", "25+ Rotis", "Salad", "Basic meal prep"] },
];

function startOfDay(input: Date) {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

function addDays(input: Date, days: number) {
  const next = new Date(input);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return `Rs. ${value.toFixed(0)}`;
}

function formatDurationLabel(hours: number | null) {
  if (hours == null) return "";
  if (hours === 1) return "1 hr";
  return `${hours} hrs`;
}

function getWeekdays(): Weekday[] {
  const baseSunday = new Date(2026, 5, 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(baseSunday, index);
    return {
      key: index,
      shortLabel: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).slice(0, 1),
      label: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
    };
  });
}

function getCalendarCells(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function countVisits(startDate: Date, endDate: Date, selectedWeekdays: number[]) {
  if (endDate < startDate || selectedWeekdays.length === 0) return 0;
  const selected = new Set(selectedWeekdays);
  let visits = 0;
  for (let cursor = startOfDay(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (selected.has(cursor.getDay())) visits += 1;
  }
  return visits;
}

function buildTimeSlots() {
  const startHour = 7;
  const endHour = 21;
  const slots: string[] = [];
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += 30) {
    const date = new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
    slots.push(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date));
  }
  return slots;
}

function buildDurationOptions(pricing: Array<{ id?: number; serviceId?: number | null; durationHours: number; perVisitPrice: number }>) {
  const rows = pricing.length > 0
    ? pricing
    : [0.5, 1, 1.5, 2].map((durationHours) => ({ id: 0, serviceId: null, durationHours, perVisitPrice: 0 }));
  const byDuration = new Map<number, { id?: number; hours: number; price: number }>();
  rows.forEach((item) => {
    const hours = Number(item.durationHours);
    if (!Number.isFinite(hours) || hours <= 0) return;
    const current = byDuration.get(hours);
    if (!current || item.serviceId != null) {
      byDuration.set(hours, { id: item.id, hours, price: item.perVisitPrice });
    }
  });
  return Array.from(byDuration.values()).sort((first, second) => first.hours - second.hours);
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function RecurringBookingScreen({ route, navigation }: { route?: any; navigation: any }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const defaultEndDate = useMemo(() => addDays(today, 29), [today]);
  const weekdays = useMemo(() => getWeekdays(), []);
  const allWeekdayKeys = useMemo(() => weekdays.map((day) => day.key), [weekdays]);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(allWeekdayKeys);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [timeSlot, setTimeSlot] = useState("");
  const [frequencySheetOpen, setFrequencySheetOpen] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<DatePickerMode | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [repeatServiceMode, setRepeatServiceMode] = useState<RepeatServiceMode>("CLEANING");
  const [familySize, setFamilySize] = useState<CookFamilySize | null>(null);
  const [cookCoverageExpanded, setCookCoverageExpanded] = useState(true);

  const serviceId = Number(route?.params?.serviceId ?? 0);
  const isCleaningMode = repeatServiceMode === "CLEANING";
  const isCookMode = repeatServiceMode === "COOK";
  const isAdditionalDurationMode = !isCleaningMode && !isCookMode;
  const categoryServiceQuery = useQuery({
    queryKey: ["subscription-category-service", repeatServiceMode],
    queryFn: async () => {
      const categories = await getCategories();
      const category = categories.find(item => {
        const name = String(item.categoryName ?? item.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (repeatServiceMode === "CLEANING") return /clean/.test(name);
        if (repeatServiceMode === "COOK") return /cook|chef|kitchen/.test(name);
        return repeatServiceMode === "VEHICLE_WASH"
          ? /^(vehicle|vehical) wash( services?)?$/.test(name)
          : /^fitness (and )?wellness( services?)?$/.test(name);
      });
      const categoryId = category?.categoryId ?? category?.id;
      if (!categoryId) throw new Error("This service category is currently unavailable.");
      const services = await fetchCustomerServicesByCategory({ categoryId });
      const service = services.find(item => toPositiveNumber(item.serviceId ?? item.id) > 0
        && [...(item.bookingModes ?? []), ...(item.supportedBookingModes ?? []), item.bookingMode ?? ""].some(mode => String(mode).toUpperCase() === "SUBSCRIPTION"))
        ?? services.find(item => toPositiveNumber(item.serviceId ?? item.id) > 0 && (item.bookingModes ?? []).includes("HOURLY"))
        ?? services.find(item => toPositiveNumber(item.serviceId ?? item.id) > 0);
      if (!service) throw new Error("No services are currently available in this category.");
      return toPositiveNumber(service.serviceId ?? service.id);
    },
    enabled: (isAdditionalDurationMode || isCleaningMode || isCookMode) && !serviceId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const cookServiceQuery = useQuery({
    queryKey: ["subscription-cook-service"],
    queryFn: getPopularCookServices,
    enabled: isCookMode && !serviceId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const fallbackCookServiceId = useMemo(() => {
    const firstCookService = (cookServiceQuery.data ?? []).find((item) => toPositiveNumber(item.serviceId ?? item.id) > 0);
    return toPositiveNumber(firstCookService?.serviceId ?? firstCookService?.id);
  }, [cookServiceQuery.data]);
  const effectiveServiceId = isAdditionalDurationMode
    ? (categoryServiceQuery.data ?? 0)
    : isCookMode
      ? (serviceId || fallbackCookServiceId || categoryServiceQuery.data || 0)
      : (serviceId || categoryServiceQuery.data || 0);
  const pricingQuery = useQuery({
    queryKey: ["subscription-pricing", effectiveServiceId || "global", repeatServiceMode],
    queryFn: () => getSubscriptionPricing(effectiveServiceId || undefined),
    enabled: !isCookMode && (!isAdditionalDurationMode || effectiveServiceId > 0),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const durationOptions = useMemo(() => buildDurationOptions(pricingQuery.data ?? []), [pricingQuery.data]);
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const visits = useMemo(() => countVisits(startDate, endDate, selectedWeekdays), [endDate, selectedWeekdays, startDate]);
  const frequencyLabel = selectedWeekdays.length === 7
    ? "Everyday"
    : weekdays.filter((day) => selectedWeekdays.includes(day.key)).map((day) => day.label).join(", ");
  const selectedDuration = durationOptions.find((item) => item.hours === durationHours) ?? null;
  const priceQuoteQuery = useQuery({
    queryKey: ["subscription-price-quote", effectiveServiceId || "global", durationHours, visits, repeatServiceMode],
    queryFn: () => getSubscriptionPriceQuote({ serviceId: effectiveServiceId || undefined, durationHours: Number(durationHours), visits }),
    enabled: !isCookMode && (!isAdditionalDurationMode || effectiveServiceId > 0) && durationHours != null && visits >= MIN_SUBSCRIPTION_VISITS,
    retry: false,
    staleTime: 60 * 1000,
  });
  const cookPriceQuoteQuery = useQuery({
    queryKey: [
      "cook-subscription-price-quote",
      effectiveServiceId || "global",
      familySize,
      frequencyLabel,
      visits,
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10),
    ],
    queryFn: () =>
      getCookSubscriptionPriceQuote({
        serviceId: effectiveServiceId || undefined,
        familySize: familySize as CookFamilySize,
        frequency: frequencyLabel,
        visits,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      }),
    enabled: isCookMode && familySize != null && visits >= MIN_SUBSCRIPTION_VISITS,
    retry: false,
    staleTime: 60 * 1000,
  });
  const cookFamilyPriceQueries = useQueries({
    queries: COOK_FAMILY_SIZE_OPTIONS.map((option) => ({
      queryKey: [
        "cook-family-size-card-price",
        effectiveServiceId || "global",
        option.key,
        frequencyLabel,
        visits,
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10),
      ],
      queryFn: () =>
        getCookSubscriptionPriceQuote({
          serviceId: effectiveServiceId || undefined,
          familySize: option.key,
          frequency: frequencyLabel,
          visits,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        }),
      enabled: isCookMode && visits >= MIN_SUBSCRIPTION_VISITS,
      retry: false,
      staleTime: 60 * 1000,
    })),
  });
  const selectedCookCoverageFamily = familySize ?? "SMALL";
  const displayCookCoverageFamily: CookFamilySize = "SMALL";
  const cookCoverageBaseQuery = useQuery({
    queryKey: ["cook-subscription-coverage", effectiveServiceId || "global", displayCookCoverageFamily],
    queryFn: () => getCookCoverage({ serviceId: effectiveServiceId || undefined, familySize: displayCookCoverageFamily, subscription: true }),
    enabled: isCookMode,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const cookCoverageSelectedQuery = useQuery({
    queryKey: ["cook-subscription-coverage", effectiveServiceId || "global", selectedCookCoverageFamily],
    queryFn: () => getCookCoverage({ serviceId: effectiveServiceId || undefined, familySize: selectedCookCoverageFamily, subscription: true }),
    enabled: isCookMode && selectedCookCoverageFamily !== displayCookCoverageFamily,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const cookFamilyPrices = useMemo(() => {
    const rows = new Map<CookFamilySize, { perVisitPrice: number; totalPrice: number; loading: boolean }>();
    COOK_FAMILY_SIZE_OPTIONS.forEach((option, index) => {
      const query = cookFamilyPriceQueries[index];
      rows.set(option.key, {
        perVisitPrice: Number(query?.data?.pricePerVisit ?? 0),
        totalPrice: Number(query?.data?.totalPrice ?? 0),
        loading: Boolean(query?.isFetching),
      });
    });
    return rows;
  }, [cookFamilyPriceQueries]);
  const perVisitPrice = priceQuoteQuery.data?.perVisitPrice ?? selectedDuration?.price ?? 0;
  const cleaningFinalPrice = priceQuoteQuery.data?.totalPrice ?? (perVisitPrice > 0 ? perVisitPrice * visits : 0);
  const cookPerVisitPrice = cookPriceQuoteQuery.data?.pricePerVisit ?? 0;
  const cookFinalPrice = cookPriceQuoteQuery.data?.totalPrice ?? (cookPerVisitPrice > 0 ? cookPerVisitPrice * visits : 0);
  const finalPrice = isCookMode ? cookFinalPrice : cleaningFinalPrice;
  const hasRequiredSelections = selectedWeekdays.length > 0
    && visits >= MIN_SUBSCRIPTION_VISITS
    && timeSlot.length > 0
    && (isCookMode ? familySize != null : durationHours != null)
    && effectiveServiceId > 0;
  const canContinue = hasRequiredSelections;
  const isPriceResolving = hasRequiredSelections && finalPrice <= 0 && (priceQuoteQuery.isFetching || cookPriceQuoteQuery.isFetching || cookServiceQuery.isFetching);
  const continueLabel = finalPrice > 0 ? `Continue booking | ${formatMoney(finalPrice)}` : isPriceResolving ? "Fetching price..." : "Continue booking";
  const selectedFamilySize = COOK_FAMILY_SIZE_OPTIONS.find((item) => item.key === familySize) ?? null;
  const cookCoverageItems = getDisplayCookCoverageItems({
    baseCoverageItems: cookCoverageBaseQuery.data?.items,
    selectedCoverageItems: selectedCookCoverageFamily === displayCookCoverageFamily
      ? cookCoverageBaseQuery.data?.items
      : cookCoverageSelectedQuery.data?.items,
  });

  const openDatePicker = (mode: DatePickerMode) => {
    setDatePickerMode(mode);
    setCalendarMonth(mode === "start" ? startDate : endDate);
  };

  const toggleWeekday = (key: number) => {
    setSelectedWeekdays((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      return [...current, key].sort((a, b) => a - b);
    });
  };

  const toggleEveryday = () => {
    setSelectedWeekdays((current) => (current.length === 7 ? [] : allWeekdayKeys));
  };

  const selectDate = (date: Date) => {
    if (!datePickerMode) return;
    const safeDate = startOfDay(date);
    if (datePickerMode === "start") {
      setStartDate(safeDate);
      if (endDate < safeDate) setEndDate(safeDate);
      return;
    }
    if (safeDate < startDate) return;
    setEndDate(safeDate);
  };

  const onContinue = () => {
    if (!canContinue) return;
    const commonPayload = {
      serviceId: effectiveServiceId || undefined,
      frequencyDays: selectedWeekdays.map((day) => weekdays.find((item) => item.key === day)?.label).filter(Boolean),
      frequencyLabel,
      startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`,
      endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`,
      visits,
      timeSlot,
      price: finalPrice,
    };
    const payload = isCookMode
      ? {
          ...commonPayload,
          serviceName: "Cook Subscription",
          subscriptionServiceType: "COOK",
          familySize,
          familySizeLabel: selectedFamilySize?.label,
          perVisitPrice: cookPerVisitPrice,
        }
      : {
          ...commonPayload,
          serviceName: isCleaningMode ? "Hourly Services" : `${REPEAT_SERVICES[repeatServiceMode].label} Subscription`,
          subscriptionServiceType: repeatServiceMode,
          durationHours,
          durationLabel: formatDurationLabel(durationHours),
          perVisitPrice,
        };
    void trackSubscriptionPurchased({
      service_id: effectiveServiceId || undefined,
      subscription_type: payload.subscriptionServiceType,
      frequency: frequencyLabel,
      visits,
      start_date: commonPayload.startDate,
      end_date: commonPayload.endDate,
      amount: finalPrice,
      source: "recurring_booking",
    });
    navigation.navigate("CartCrud", { recurringBooking: payload });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcon name="arrow-left" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Repeat Booking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeSwitch} contentContainerStyle={styles.modeSwitchContent}>
          {(Object.keys(REPEAT_SERVICES) as RepeatServiceMode[]).map((item) => {
            const active = repeatServiceMode === item;
            return (
              <Pressable
                key={item}
                style={[styles.modeButton, active && styles.modeButtonActive]}
                accessibilityRole="button"
                accessibilityLabel={REPEAT_SERVICES[item].label}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setRepeatServiceMode(item);
                  setDurationHours(null);
                }}
              >
                <MaterialCommunityIcon
                  name={REPEAT_SERVICES[item].icon}
                  size={17}
                  color={active ? COLORS.navyDark : COLORS.goldSoft}
                />
                <Text numberOfLines={1} style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                  {REPEAT_SERVICES[item].label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Choose Service Days</Text>
        <Text style={styles.sectionSub}>Pick the days you need this service?</Text>
        <Pressable style={styles.largeCard} onPress={() => setFrequencySheetOpen(true)}>
          <Text style={styles.largeCardText} numberOfLines={1}>{frequencyLabel || "Select days"}</Text>
          <MaterialCommunityIcon name="chevron-right" size={34} color={GREEN} />
        </Pressable>

        <Text style={styles.questionTitle}>Select Start and End Date</Text>
        <View style={styles.dateSummaryCard}>
          <DateSummaryCell label="Start date" value={formatDateLabel(startDate)} onPress={() => openDatePicker("start")} />
          <DateSummaryCell label="End date" value={formatDateLabel(endDate)} onPress={() => openDatePicker("end")} />
          <View style={[styles.dateCell, styles.lastDateCell]}>
            <Text style={styles.dateLabel}>Visits</Text>
            <Text style={styles.dateValue}>{visits}</Text>
          </View>
        </View>
        {visits < MIN_SUBSCRIPTION_VISITS ? (
          <Text style={styles.minimumVisitsHint}>Minimum {MIN_SUBSCRIPTION_VISITS} visits required for subscription.</Text>
        ) : null}

        {isAdditionalDurationMode && categoryServiceQuery.isFetching ? <Text style={styles.inlineLoadingText}>Loading services...</Text> : null}
        {isAdditionalDurationMode && categoryServiceQuery.isError ? (
          <Pressable onPress={() => void categoryServiceQuery.refetch()}>
            <Text style={styles.minimumVisitsHint}>Could not load services. Tap to retry.</Text>
          </Pressable>
        ) : null}
        {!isCookMode ? (
          <>
            <Text style={styles.sectionBlockTitle}>Duration Per Visit</Text>
            {pricingQuery.isFetching ? (
              <View style={styles.inlineLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.goldSoft} />
                <Text style={styles.inlineLoadingText}>Loading duration prices...</Text>
              </View>
            ) : null}
            <View style={styles.durationWrap}>
              {durationOptions.map((item) => {
                const active = durationHours === item.hours;
                return (
                  <Pressable key={`duration-${item.hours}-${item.id ?? "fallback"}`} style={[styles.durationCard, active && styles.activeCard]} onPress={() => setDurationHours(item.hours)}>
                    <Text style={[styles.durationTitle, active && styles.activeText]}>{item.hours === 1 ? "1 hr" : `${item.hours} hrs`}</Text>
                    {item.price > 0 ? (
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceText, active && styles.activeText]}>{formatMoney(item.price)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.pendingPrice}>Price unavailable</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {isCleaningMode ? <CleaningCoverageCard durationHours={durationHours} /> : null}
          </>
        ) : null}

        {isCookMode ? (
          <>
            <Text style={styles.sectionBlockTitle}>Select Family Size</Text>
            <View style={styles.familySizeWrap}>
              {COOK_FAMILY_SIZE_OPTIONS.map((item) => {
                const active = familySize === item.key;
                const priceInfo = cookFamilyPrices.get(item.key);
                const cardPrice = priceInfo?.perVisitPrice ?? 0;
                return (
                  <Pressable key={item.key} style={[styles.familySizeCard, active && styles.activeCard]} onPress={() => setFamilySize(item.key)}>
                    <View style={[styles.familyIconCircle, active && styles.familyIconCircleActive]}>
                      <MaterialCommunityIcon name={item.icon} size={20} color={active ? COLORS.navyDark : COLORS.goldSoft} />
                    </View>
                    <View style={styles.familyTextWrap}>
                      <Text style={[styles.familyTitle, active && styles.activeText]}>{item.label}</Text>
                      <Text style={styles.familySubtitle}>{item.subtitle}</Text>
                      <Text style={[styles.familyPrice, active && styles.activeText]}>
                        {cardPrice > 0 ? `${formatMoney(cardPrice)} / visit` : priceInfo?.loading ? "Fetching price..." : "Price unavailable"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <CookCoverageCard
              selectedFamilySize={selectedFamilySize}
              items={cookCoverageItems}
              expanded={cookCoverageExpanded}
              onToggle={() => setCookCoverageExpanded((value) => !value)}
            />
          </>
        ) : null}

        <Text style={styles.sectionBlockTitle}>Preferred Visit Time</Text>
        <View style={styles.slotPanel}>
          <View style={styles.slotHeader}>
            <MaterialCommunityIcon name="timer-outline" size={25} color={COLORS.goldSoft} />
            <Text style={styles.slotHeaderText}>Available Time Slots</Text>
          </View>
          <View style={styles.slotGrid}>
            {timeSlots.map((slot) => {
              const active = timeSlot === slot;
              return (
                <Pressable key={slot} style={[styles.slotCard, active && styles.activeCard]} onPress={() => setTimeSlot(slot)}>
                  <Text style={[styles.slotText, active && styles.activeText]}>{slot}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Pressable style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]} disabled={!canContinue} onPress={onContinue}>
        <Text style={styles.continueText}>{continueLabel}</Text>
      </Pressable>

      <FrequencySheet
        visible={frequencySheetOpen}
        weekdays={weekdays}
        selectedWeekdays={selectedWeekdays}
        onToggleWeekday={toggleWeekday}
        onToggleEveryday={toggleEveryday}
        onClose={() => setFrequencySheetOpen(false)}
      />
      <CalendarSheet
        visible={datePickerMode != null}
        mode={datePickerMode}
        month={calendarMonth}
        today={today}
        startDate={startDate}
        endDate={endDate}
        onMonthChange={setCalendarMonth}
        onSelectDate={selectDate}
        onClose={() => setDatePickerMode(null)}
      />
    </View>
  );
}

function DateSummaryCell({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.dateCell} onPress={onPress}>
      <View style={styles.dateCellTop}>
        <Text style={styles.dateLabel}>{label}</Text>
        <MaterialCommunityIcon name="pencil-outline" size={24} color={GREEN} />
      </View>
      <Text style={styles.dateValue}>{value}</Text>
    </Pressable>
  );
}

function FrequencySheet({
  visible,
  weekdays,
  selectedWeekdays,
  onToggleWeekday,
  onToggleEveryday,
  onClose,
}: {
  visible: boolean;
  weekdays: Weekday[];
  selectedWeekdays: number[];
  onToggleWeekday: (key: number) => void;
  onToggleEveryday: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.frequencySheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Choose Repeat Days</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcon name="close" size={21} color={COLORS.navyDark} />
            </Pressable>
          </View>
          <View style={styles.dayGrid}>
            {weekdays.map((day) => (
              <DayOption
                key={day.key}
                label={day.label}
                active={selectedWeekdays.includes(day.key)}
                onPress={() => onToggleWeekday(day.key)}
              />
            ))}
            <DayOption label="Everyday" active={selectedWeekdays.length === 7} onPress={onToggleEveryday} />
          </View>
          <Pressable style={styles.sheetProceedButton} onPress={onClose}>
            <Text style={styles.sheetProceedText}>Proceed</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DayOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.dayOption, active && styles.dayOptionActive]} onPress={onPress}>
      <Text style={[styles.dayText, active && styles.activeText]}>{label}</Text>
      <View style={[styles.checkBox, active && styles.checkBoxActive]}>
        {active ? <MaterialCommunityIcon name="check" size={20} color={COLORS.navyDark} /> : null}
      </View>
    </Pressable>
  );
}

function CalendarSheet({
  visible,
  mode,
  month,
  today,
  startDate,
  endDate,
  onMonthChange,
  onSelectDate,
  onClose,
}: {
  visible: boolean;
  mode: DatePickerMode | null;
  month: Date;
  today: Date;
  startDate: Date;
  endDate: Date;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}) {
  const weekdays = useMemo(() => getWeekdays(), []);
  const cells = useMemo(() => getCalendarCells(month), [month]);
  const selectedDate = mode === "start" ? startDate : endDate;
  const title = mode === "start" ? "Choose Start Date" : "Choose End Date";
  const canGoPrevious = new Date(month.getFullYear(), month.getMonth(), 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  const disabledDate = (date: Date) => {
    if (date < today) return true;
    if (mode === "end" && date < startDate) return true;
    return false;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.calendarSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcon name="close" size={21} color={COLORS.navyDark} />
            </Pressable>
          </View>
          <View style={styles.calendarCard}>
            <View style={styles.calendarMonthRow}>
              <Pressable disabled={!canGoPrevious} onPress={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <MaterialCommunityIcon name="menu-left" size={34} color={canGoPrevious ? COLORS.goldSoft : "rgba(255,255,255,0.25)"} />
              </Pressable>
              <Text style={styles.monthTitle}>{formatMonthLabel(month)}</Text>
              <Pressable onPress={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <MaterialCommunityIcon name="menu-right" size={34} color={COLORS.goldSoft} />
              </Pressable>
            </View>
            <View style={styles.weekHeaderGrid}>
              {weekdays.map((day) => (
                <Text key={day.key} style={[styles.weekHeaderText, day.key === 0 && styles.sundayText]}>
                  {day.shortLabel}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {cells.map((date, index) => {
                if (!date) return <View key={`blank-${index}`} style={styles.dateButton} />;
                const disabled = disabledDate(date);
                const active = sameDate(date, selectedDate);
                return (
                  <Pressable
                    key={date.toISOString()}
                    disabled={disabled}
                    style={[styles.dateButton, active && styles.activeDateButton]}
                    onPress={() => onSelectDate(date)}
                  >
                    <Text style={[styles.dateButtonText, disabled && styles.disabledDateText, active && styles.activeDateText]}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Pressable style={styles.sheetProceedButton} onPress={onClose}>
            <Text style={styles.sheetProceedText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function getCookItemIcon(item: string) {
  const value = item.toLowerCase();
  if (value.includes("dal")) return "bowl-mix-outline";
  if (value.includes("rice")) return "rice";
  if (value.includes("sabzi")) return "food-variant";
  if (value.includes("roti")) return "circle-outline";
  if (value.includes("salad")) return "leaf";
  return "chef-hat";
}

function CookCoverageCard({
  selectedFamilySize,
  items,
  expanded,
  onToggle,
}: {
  selectedFamilySize: CookFamilySizeOption | null;
  items: string[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.cookCoverageCard}>
      <Pressable style={styles.cookCoverageHeader} onPress={onToggle}>
        <View style={styles.cookCoverageTitleWrap}>
          <Text style={styles.cookCoverageTitle}>What can typically be prepared?</Text>
          <Text style={styles.cookCoverageSubtitle}>Estimates may vary based on menu complexity</Text>
        </View>
        <MaterialCommunityIcon name={expanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.goldSoft} />
      </Pressable>
      {expanded ? (
        <>
          {selectedFamilySize ? (
            items.length > 0 ? (
            <View style={styles.cookCoverageGrid}>
              {items.map((item, index) => (
                <View key={`${selectedFamilySize.key}-${item}-${index}`} style={styles.cookCoverageTaskCard}>
                  <View style={styles.cookTaskIconBox}>
                    <MaterialCommunityIcon name={getCookItemIcon(item)} size={22} color={COLORS.goldSoft} />
                  </View>
                  <Text style={styles.cookTaskName} numberOfLines={2}>{item}</Text>
                </View>
              ))}
            </View>
            ) : (
              <Text style={styles.cookCoverageEmpty}>No meal coverage available right now.</Text>
            )
          ) : (
            <Text style={styles.cookCoverageEmpty}>Select family size to view meal coverage.</Text>
          )}
          <Text style={styles.cookCoverageDisclaimer}>
            Actual preparation capacity may vary based on recipe complexity, ingredient readiness, kitchen setup, and cooking requirements.
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SCREEN_BG },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.navy,
    borderBottomWidth: 0,
  },
  headerTitle: { color: COLORS.white, fontSize: 19, fontWeight: "900", flexShrink: 1 },
  content: { paddingHorizontal: 0, paddingTop: 18, paddingBottom: 144, gap: 9 },
  modeSwitch: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: PANEL_BG,
    marginBottom: 10,
    flexGrow: 0,
    ...shadows.sm,
  },
  modeSwitchContent: {
    padding: 5,
    flexDirection: "row",
    gap: 6,
  },
  modeButton: {
    flexShrink: 0,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modeButtonActive: { backgroundColor: COLORS.goldSoft },
  modeButtonText: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "900" },
  modeButtonTextActive: { color: COLORS.navyDark },
  sectionSub: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "700", marginTop: -6, paddingHorizontal: 20 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: "900", paddingHorizontal: 20 },
  minimumVisitsHint: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "700", paddingHorizontal: 20, marginTop: 10 },
  largeCard: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    marginTop: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    ...shadows.sm,
  },
  largeCardText: { color: COLORS.white, fontSize: 17, fontWeight: "900", flex: 1 },
  questionTitle: { color: COLORS.white, fontSize: 18, fontWeight: "900", marginTop: 20, lineHeight: 24, paddingHorizontal: 20 },
  dateSummaryCard: {
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    marginTop: 12,
    flexDirection: "row",
    overflow: "hidden",
    ...shadows.sm,
  },
  dateCell: { flex: 1, paddingHorizontal: 12, justifyContent: "center", borderRightWidth: 1, borderRightColor: GOLD_BORDER, gap: 6 },
  lastDateCell: { borderRightWidth: 0 },
  dateCellTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dateLabel: { color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: "900" },
  dateValue: { color: COLORS.white, fontSize: 17, fontWeight: "900" },
  sectionBlockTitle: { color: COLORS.white, fontSize: 18, fontWeight: "900", marginTop: 24, paddingHorizontal: 20 },
  durationWrap: { marginTop: 11, borderRadius: 16, backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GOLD_BORDER, padding: 9, flexDirection: "row", gap: 7, overflow: "hidden", ...shadows.sm },
  durationCard: {
    flex: 1,
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  activeCard: { borderColor: COLORS.goldSoft, backgroundColor: GOLD_SOFT_BG },
  activeText: { color: COLORS.goldSoft },
  durationTitle: { color: COLORS.white, fontSize: 14, fontWeight: "900", textAlign: "center" },
  inlineLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginTop: 8 },
  inlineLoadingText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, flexWrap: "wrap" },
  priceText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  pendingPrice: { color: "rgba(255,255,255,0.62)", fontSize: 10, fontWeight: "800", textAlign: "center" },
  familySizeWrap: {
    marginTop: 11,
    borderRadius: 16,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    overflow: "hidden",
    ...shadows.sm,
  },
  familySizeCard: {
    width: "48.5%",
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    padding: 11,
    gap: 9,
    backgroundColor: COLORS.navy,
  },
  familyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.58)",
    backgroundColor: "rgba(224,169,75,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  familyIconCircleActive: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.goldSoft },
  familyTextWrap: { gap: 3 },
  familyTitle: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  familySubtitle: { color: "rgba(255,255,255,0.68)", fontSize: 11, fontWeight: "700", lineHeight: 15 },
  familyPrice: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "900", marginTop: 3 },
  cookCoverageCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    ...shadows.sm,
  },
  cookCoverageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cookCoverageTitleWrap: { flex: 1, gap: 4 },
  cookCoverageTitle: { color: COLORS.white, fontSize: 16, fontWeight: "900", lineHeight: 21 },
  cookCoverageSubtitle: { color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  cookCoverageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cookCoverageTaskCard: {
    width: "31.4%",
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.55)",
    backgroundColor: COLORS.navy,
    padding: 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  cookTaskIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(224,169,75,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  cookTaskName: { color: COLORS.white, fontSize: 11, fontWeight: "900", textAlign: "center", lineHeight: 15 },
  cookCoverageEmpty: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  cookCoverageDisclaimer: { color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: "700", lineHeight: 16 },
  slotPanel: { marginTop: 11, borderRadius: 16, backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GOLD_BORDER, padding: 14, gap: 14, overflow: "hidden", ...shadows.sm },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  slotHeaderText: { color: COLORS.white, fontSize: 17, fontWeight: "900" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotCard: {
    width: "31.1%",
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  slotText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  continueButton: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  continueButtonDisabled: { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(224,169,75,0.35)" },
  continueText: { color: COLORS.navyDark, fontSize: 17, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  frequencySheet: { backgroundColor: SHEET_BG, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 18, maxHeight: "82%" },
  calendarSheet: { backgroundColor: SCREEN_BG, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 18, maxHeight: "84%" },
  sheetHandle: { width: 42, height: 5, borderRadius: 999, backgroundColor: COLORS.slate300, alignSelf: "center", marginTop: 10 },
  sheetHeader: {
    minHeight: 74,
    backgroundColor: PANEL_BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { color: COLORS.white, fontSize: 20, fontWeight: "900", flex: 1 },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.goldSoft, alignItems: "center", justifyContent: "center" },
  dayGrid: { paddingHorizontal: 18, paddingTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dayOption: {
    width: "48%",
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.navy,
  },
  dayOptionActive: { borderColor: COLORS.goldSoft, backgroundColor: GOLD_SOFT_BG },
  dayText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: GOLD_BORDER, alignItems: "center", justifyContent: "center" },
  checkBoxActive: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.goldSoft },
  sheetProceedButton: { marginHorizontal: 18, marginTop: 18, minHeight: 52, borderRadius: 14, backgroundColor: COLORS.goldSoft, borderWidth: 1, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center" },
  sheetProceedText: { color: COLORS.navyDark, fontSize: 18, fontWeight: "900" },
  calendarCard: { marginHorizontal: 18, marginTop: 16, borderRadius: 22, backgroundColor: PANEL_BG, borderWidth: 1, borderColor: GOLD_BORDER, padding: 18 },
  calendarMonthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  monthTitle: { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  weekHeaderGrid: { flexDirection: "row", marginBottom: 14 },
  weekHeaderText: { width: `${100 / 7}%`, textAlign: "center", color: "rgba(255,255,255,0.62)", fontSize: 15, fontWeight: "900" },
  sundayText: { color: "#F43F6C" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  dateButton: { width: `${100 / 7}%`, height: 38, alignItems: "center", justifyContent: "center" },
  activeDateButton: { backgroundColor: COLORS.goldSoft, borderRadius: 999 },
  dateButtonText: { color: COLORS.white, fontSize: 15, fontWeight: "900" },
  disabledDateText: { color: "rgba(255,255,255,0.28)" },
  activeDateText: { color: COLORS.navyDark },
});

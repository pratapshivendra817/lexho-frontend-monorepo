// @refresh reset
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Image, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Snackbar, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createBooking } from "../../api/bookingApi";
import { getAvailableTimeSlots } from "../../api/cartApi";
import { getCookFamilySizes, type CookFamilySizeOptionDto } from "../../api/cookFamilySizeApi";
import { createSubscriptionBooking } from "../../api/subscriptionBookingApi";
import { getSubscriptionPricing, type SubscriptionDurationPrice } from "../../api/subscriptionPricingApi";
import { TimePicker } from "../../components/cart/TimePicker";
import { CART_CONFIG, isPartyCategoryName } from "../../constants/cartConfig";
import { CLEANING_COVERAGE_OPTIONS } from "../../constants/cleaningCoverageConfig";
import { API_BASE_URL, DEV_IMAGE_HOST, DEV_INTERNAL_TOKEN, DEV_LOGIN_BYPASS } from "../../constants/env";
import { palette, radii, shadows, spacing } from "../../constants/theme";

import { COLORS } from '../../theme/colors';
import {
  fetchCustomerAddressesThunk,
  fetchCustomerCartThunk,
  fetchCartPolicyThunk,
  lockCartUntilPayment,
  removeCartItemThunk,
  restoreCartSnapshotThunk,
  setScheduledTime,
  updateCartItemThunk,
  updateCartMetaThunk,
} from "../../redux/cartSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { trackBookingCreated } from "../../services/customerAnalyticsEvents";

const FONT = Platform.select({
  ios: {
    regular: "Poppins-Regular",
    semibold: "Poppins-SemiBold",
    bold: "Poppins-Bold",
  },
  android: {
    regular: "Poppins-Regular",
    semibold: "Poppins-SemiBold",
    bold: "Poppins-Bold",
  },
  default: {
    regular: "System",
    semibold: "System",
    bold: "System",
  },
});

function formatCurrency(value: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function toDateAndSlot(input?: string | null) {
  const dateObj = input ? new Date(input) : new Date();
  const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const yyyy = safeDate.getFullYear();
  const mm = String(safeDate.getMonth() + 1).padStart(2, "0");
  const dd = String(safeDate.getDate()).padStart(2, "0");
  const startHour = safeDate.getHours();
  const startMinute = safeDate.getMinutes();
  let endHour = startHour;
  let endMinute = startMinute + 15;
  if (endMinute >= 60) {
    endMinute -= 60;
    endHour = (endHour + 1) % 24;
  }
  const slot = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}-${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  return { date: `${yyyy}-${mm}-${dd}`, slot };
}

function toLocalDate(value: Date) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toSlotStart(rawSlot: string) {
  const clean = String(rawSlot || "").trim();
  if (!clean) return "";
  const isoMatch = clean.match(/T(\d{1,2}:\d{2})/);
  if (isoMatch?.[1]) return isoMatch[1];
  const timeMatch = clean.match(/\b(\d{1,2}:\d{2})\b/);
  if (timeMatch?.[1]) return timeMatch[1];
  if (clean.includes("-")) return clean.split("-")[0]?.trim() ?? "";
  return clean;
}

function readableBookingError(input: string) {
  const message = String(input || "").toUpperCase();
  if (message.includes("INSTANT_UNAVAILABLE")) return "No partner available right now. Please book a scheduled slot.";
  if (message.includes("NO_PARTNER_IN_30_MIN")) return "No partner can reach within 30 minutes. Please choose a scheduled slot.";
  if (message.includes("SLOT_EXPIRED")) return "Selected slot has expired. Please choose another slot.";
  if (message.includes("SERVICE_UNAVAILABLE")) return "Service unavailable.";
  if (message.includes("SLOT_UNAVAILABLE") || message.includes("SLOT_FULL")) return "Slot unavailable. Please choose another slot.";
  if (message.includes("PRICE_CHANGED")) return "Price changed. Please refresh cart and try again.";
  if (message.includes("ADDON_UNAVAILABLE")) return "Add-on unavailable.";
  if (message.includes("QUANTITY_EXCEEDED")) return "Quantity exceeded.";
  if (message.includes("CART_LIMIT_EXCEEDED")) return "Cart limit exceeded.";
  return input;
}

function parseScheduledDateTime(input?: string | null) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const localMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (localMatch) {
    const y = Number(localMatch[1]);
    const m = Number(localMatch[2]) - 1;
    const d = Number(localMatch[3]);
    const hh = Number(localMatch[4]);
    const mm = Number(localMatch[5]);
    const ss = Number(localMatch[6] ?? 0);
    const dt = new Date(y, m, d, hh, mm, ss, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toReadableAddress(address: any) {
  if (!address || typeof address !== "object") return "";
  const line = String(
    address?.fullAddress ??
      address?.addressLine ??
      address?.line1 ??
      address?.flatNo ??
      "",
  ).trim();
  const city = String(address?.city ?? "").trim();
  const pincode = String(address?.pincode ?? address?.postalCode ?? "").trim();
  return [line, city, pincode].filter(Boolean).join(", ");
}

function firstValidCoordinate(...values: unknown[]) {
  for (const value of values) {
    const coordinate = Number(value ?? 0);
    if (Number.isFinite(coordinate) && coordinate !== 0) return coordinate;
  }
  return null;
}

type BookingMode = "INSTANT" | "SCHEDULED" | "SUBSCRIPTION";
type RecurringCartPayload = {
  serviceName?: string;
  serviceId?: number;
  subscriptionServiceType?: "CLEANING" | "COOK";
  frequencyDays?: string[];
  frequencyLabel?: string;
  startDate?: string;
  endDate?: string;
  visits?: number;
  durationHours?: number;
  durationLabel?: string;
  familySize?: string;
  familySizeLabel?: string;
  timeSlot?: string;
  perVisitPrice?: number;
  price?: number;
};
type ScheduledCookPayload = {
  familySizeId?: number;
  familySize?: string;
  familySizeLabel?: string;
};
type SelectedCleaningDurationPayload = {
  durationHours?: number;
  durationLabel?: string;
};
type SelectedCleaningDurationsByItem = Record<string, SelectedCleaningDurationPayload>;

const BOOKING_MODE_META: Record<BookingMode, { label: string; icon: string }> = {
  INSTANT: { label: "Instant", icon: "flash-outline" },
  SCHEDULED: { label: "Scheduled", icon: "calendar-clock-outline" },
  SUBSCRIPTION: { label: "Subscription", icon: "calendar-refresh-outline" },
};

function getInstantIsoTime(windowMinutes: number) {
  return new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();
}

function SwipeQuantityStepper({
  quantity,
  valueLabel,
  onIncrease,
  onDecrease,
  accessibilityLabelBase,
}: {
  quantity: number;
  valueLabel?: string;
  onIncrease: () => void | Promise<void>;
  onDecrease: () => void | Promise<void>;
  accessibilityLabelBase: string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const triggeredRef = useRef<"inc" | "dec" | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          const clamped = Math.max(-44, Math.min(44, g.dx));
          translateX.setValue(clamped);
          if (!triggeredRef.current && g.dx >= 34) {
            triggeredRef.current = "inc";
            void onIncrease();
          } else if (!triggeredRef.current && g.dx <= -34) {
            triggeredRef.current = "dec";
            void onDecrease();
          }
        },
        onPanResponderRelease: () => {
          triggeredRef.current = null;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            stiffness: 180,
            damping: 18,
          }).start();
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          triggeredRef.current = null;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [onDecrease, onIncrease, translateX],
  );

  return (
    <View style={styles.qtySwipeWrap}>
      <View style={styles.qtySwipeHintLeft} />
      <View style={styles.qtySwipeHintRight} />
      <Animated.View style={[styles.qtyBox, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <Pressable
          onPress={() => void onDecrease()}
          accessibilityRole="button"
          accessibilityLabel={`Decrease quantity for ${accessibilityLabelBase}`}
          hitSlop={8}
          style={styles.qtyBtn}
        >
          <Text style={styles.qtyControl}>-</Text>
        </Pressable>
        <View style={styles.qtyDivider} />
        <Text style={styles.qtyValue}>{valueLabel ?? quantity}</Text>
        <View style={styles.qtyDivider} />
        <Pressable
          onPress={() => void onIncrease()}
          accessibilityRole="button"
          accessibilityLabel={`Increase quantity for ${accessibilityLabelBase}`}
          hitSlop={8}
          style={styles.qtyBtn}
        >
          <Text style={styles.qtyControl}>+</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function toAbsoluteImageUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i,
      (match, _host, port) => {
        const protocol = match.startsWith("https://") ? "https://" : "http://";
        return `${protocol}${DEV_IMAGE_HOST}${String(port ?? "")}`;
      },
    );
  }
  const base = String(API_BASE_URL ?? "").replace(/\/+$/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
}

function resolveCartItemImage(item: any) {
  const raw = item?.imageUrl ?? "";
  return toAbsoluteImageUrl(raw);
}

function formatRecurringDuration(input?: number | null, fallback?: string) {
  const cleanFallback = String(fallback ?? "").trim();
  if (cleanFallback) return cleanFallback;
  const hours = Number(input ?? 0);
  if (!Number.isFinite(hours) || hours <= 0) return "";
  return hours === 1 ? "1 hr" : `${hours} hrs`;
}

function buildCleaningDurationOptions(pricing: SubscriptionDurationPrice[], serviceId?: number | null) {
  const normalizedServiceId = Number(serviceId ?? 0);
  const serviceRows = normalizedServiceId > 0
    ? pricing.filter((item) => Number(item.serviceId ?? 0) === normalizedServiceId || item.serviceId == null)
    : pricing;
  const rows = serviceRows.length > 0
    ? serviceRows
    : CLEANING_COVERAGE_OPTIONS.map((item) => ({
        id: 0,
        serviceId: null,
        durationHours: item.durationHours,
        perVisitPrice: 0,
        active: true,
      }));
  const byDuration = new Map<number, { hours: number; label: string; price: number }>();
  rows.forEach((item) => {
    const hours = Number(item.durationHours);
    if (!Number.isFinite(hours) || hours <= 0) return;
    const current = byDuration.get(hours);
    if (!current || item.serviceId != null) {
      byDuration.set(hours, {
        hours,
        label: formatRecurringDuration(hours),
        price: Number(item.perVisitPrice ?? 0),
      });
    }
  });
  return Array.from(byDuration.values()).sort((first, second) => first.hours - second.hours);
}

function getCartItemDurationKey(item: any, index: number) {
  return String(item?.itemId ?? item?.serviceId ?? index);
}

function isCleaningCartItem(item: any) {
  const text = [
    item?.categoryName,
    item?.serviceType,
    item?.name,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");
  return text.includes("clean");
}

function isCookCartItem(item: any) {
  const text = [
    item?.categoryName,
    item?.serviceType,
    item?.name,
    item?.familySize,
    item?.familySizeLabel,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");
  return text.includes("cook") || text.includes("chef") || Boolean(item?.familySizeId || item?.familySize || item?.familySizeLabel);
}

function defaultCleaningDuration(minDurationHours: number): SelectedCleaningDurationPayload {
  return { durationHours: minDurationHours, durationLabel: formatRecurringDuration(minDurationHours) };
}

function formatShortDateLabel(input?: string | null) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const parts = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function buildCartImageCandidates(value?: string | null) {
  const primary = toAbsoluteImageUrl(value);
  if (!primary) return [];
  const candidates: string[] = [];
  try {
    const parsed = new URL(primary);
    const apiOrigin = String(API_BASE_URL ?? "").trim().replace(/\/+$/, "");
    const isKnownCdnHost = /^cdn\.lexho\.com$/i.test(parsed.host);
    if (apiOrigin) {
      const apiUrl = new URL(apiOrigin);
      const viaApiHost = `${apiUrl.protocol}//${apiUrl.host}${parsed.pathname}${parsed.search}`;
      if (isKnownCdnHost && !candidates.includes(viaApiHost)) candidates.push(viaApiHost);
    }
    if (!candidates.includes(primary)) candidates.push(primary);
    if (DEV_IMAGE_HOST) {
      const viaDevHost = `${parsed.protocol}//${String(DEV_IMAGE_HOST).trim()}${parsed.pathname}${parsed.search}`;
      if (!candidates.includes(viaDevHost)) candidates.push(viaDevHost);
    }
  } catch {
    // Keep primary only when URL parsing fails.
    if (!candidates.includes(primary)) candidates.push(primary);
  }
  if (!candidates.includes(primary)) candidates.push(primary);
  return candidates;
}

export function CartCrudScreen({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const authToken = useAppSelector((s) => s.auth.token);
  const {
    cartId,
    items,
    grandTotal,
    itemTotal: apiItemTotal,
    gstAmount,
    serviceFee,
    taxAmount,
    toPay: apiToPay,
    totalSaved: apiTotalSaved,
    currency,
    contactName,
    contactPhone,
    addresses,
    selectedAddressId,
    scheduledTime,
    loading,
    error,
  } = useAppSelector((s) => s.cart);
  const authUser = useAppSelector((s) => s.auth.user);
  const cartPolicy = useAppSelector((s) => s.cart.policy);
  const locationSelectedAddress = useAppSelector((s) => (s.location as any)?.selectedAddress ?? null);
  const locationCurrentAddress = useAppSelector((s) => (s.location as any)?.currentAddress ?? null);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [attemptedCheckout, setAttemptedCheckout] = useState(false);
  const [checkoutInFlight, setCheckoutInFlight] = useState(false);
  const [openTimePickerKey, setOpenTimePickerKey] = useState(0);
  const [familySizeEditorItem, setFamilySizeEditorItem] = useState<any | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode>(
    route?.params?.recurringBooking ? "SUBSCRIPTION" : CART_CONFIG.defaultMode,
  );
  const [requiresScheduledSlotSelection, setRequiresScheduledSlotSelection] = useState(false);
  const [recurringCartItem, setRecurringCartItem] = useState<RecurringCartPayload | null>(
    route?.params?.recurringBooking ?? null,
  );
  const scheduledCook = useMemo<ScheduledCookPayload | null>(() => {
    const familySizeId = Number(route?.params?.cookFamilySizeId ?? 0);
    const familySize = String(route?.params?.cookFamilySize ?? "").trim();
    const familySizeLabel = String(route?.params?.cookFamilySizeLabel ?? "").trim();
    if (!familySizeId && !familySize && !familySizeLabel) return null;
    return {
      familySizeId: familySizeId > 0 ? familySizeId : undefined,
      familySize: familySize || undefined,
      familySizeLabel: familySizeLabel || undefined,
    };
  }, [route?.params?.cookFamilySize, route?.params?.cookFamilySizeId, route?.params?.cookFamilySizeLabel]);
  const routeCookFamilySizeId = Number(route?.params?.cookFamilySizeId ?? 0);
  const routeCleaningDuration = useMemo<SelectedCleaningDurationPayload | null>(() => {
    const durationHours = Number(route?.params?.durationHours ?? 0);
    const durationLabel = String(route?.params?.durationLabel ?? "").trim();
    if ((!Number.isFinite(durationHours) || durationHours <= 0) && !durationLabel) return null;
    return {
      durationHours: Number.isFinite(durationHours) && durationHours > 0 ? durationHours : undefined,
      durationLabel: durationLabel || undefined,
    };
  }, [route?.params?.durationHours, route?.params?.durationLabel]);
  const [selectedCleaningDurationsByItem, setSelectedCleaningDurationsByItem] = useState<SelectedCleaningDurationsByItem>({});
  const routeCleaningServiceId = Number(route?.params?.serviceId ?? 0);
  const hasCleaningCartItems = useMemo(() => items.some(isCleaningCartItem), [items]);
  const shouldUseTimeBasedForItem = useCallback(
    (item: any) => {
      if (isCleaningCartItem(item)) return true;
      return Boolean(routeCleaningDuration && routeCleaningServiceId > 0 && Number(item?.serviceId ?? 0) === routeCleaningServiceId);
    },
    [routeCleaningDuration, routeCleaningServiceId],
  );
  const didInitModeFromCart = useRef(false);
  const checkoutInFlightRef = useRef(false);

  useEffect(() => {
    dispatch(restoreCartSnapshotThunk());
    dispatch(fetchCartPolicyThunk());
    dispatch(fetchCustomerCartThunk());
    dispatch(fetchCustomerAddressesThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!routeCleaningDuration && !hasCleaningCartItems) {
      setSelectedCleaningDurationsByItem({});
      return;
    }
    setSelectedCleaningDurationsByItem((prev) => {
      const next: SelectedCleaningDurationsByItem = {};
      items.forEach((item, index) => {
        if (!shouldUseTimeBasedForItem(item)) return;
        const key = getCartItemDurationKey(item, index);
        next[key] = prev[key] ?? routeCleaningDuration ?? defaultCleaningDuration(cartPolicy.minCleaningDurationHours);
      });
      return next;
    });
  }, [cartPolicy.minCleaningDurationHours, hasCleaningCartItems, items, routeCleaningDuration, shouldUseTimeBasedForItem]);

  const imageRequestHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    const token = String(authToken ?? "").trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (DEV_LOGIN_BYPASS && __DEV__) headers["X-Internal-Token"] = DEV_INTERNAL_TOKEN;
    return headers;
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCustomerCartThunk());
      dispatch(fetchCustomerAddressesThunk());
      return undefined;
    }, [dispatch]),
  );

  useEffect(() => {
    if (route?.params?.recurringBooking) {
      setRecurringCartItem(route.params.recurringBooking);
      setBookingMode("SUBSCRIPTION");
      setRequiresScheduledSlotSelection(false);
      dispatch(setScheduledTime(null));
      didInitModeFromCart.current = true;
    }
  }, [dispatch, route?.params?.recurringBooking]);

  const selectedAddress = useMemo(
    () => addresses.find((row) => Number(row.id) === Number(selectedAddressId)) ?? null,
    [addresses, selectedAddressId],
  );
  const hasDetectedLocation = useMemo(() => {
    const lat = Number(locationSelectedAddress?.latitude ?? 0);
    const lng = Number(locationSelectedAddress?.longitude ?? 0);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  }, [locationSelectedAddress?.latitude, locationSelectedAddress?.longitude]);
  const bookingLocationText = useMemo(() => {
    const fromSelected = toReadableAddress(selectedAddress);
    if (fromSelected) return fromSelected;
    const fromLocation = toReadableAddress(locationSelectedAddress);
    if (fromLocation) return fromLocation;
    return "";
  }, [locationSelectedAddress, selectedAddress]);
  const bookingCoordinates = useMemo(() => {
    const latitude = firstValidCoordinate(
      selectedAddress?.latitude ??
        selectedAddress?.lat,
      locationSelectedAddress?.latitude ??
        locationSelectedAddress?.lat,
      locationCurrentAddress?.latitude ??
        locationCurrentAddress?.lat,
    );
    const longitude = firstValidCoordinate(
      selectedAddress?.longitude ??
        selectedAddress?.lng,
      locationSelectedAddress?.longitude ??
        locationSelectedAddress?.lng,
      locationCurrentAddress?.longitude ??
        locationCurrentAddress?.lng,
    );
    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  }, [locationCurrentAddress, locationSelectedAddress, selectedAddress]);

  const cleaningPricingQuery = useQuery({
    queryKey: ["cart-cleaning-duration-pricing", "all"],
    queryFn: () => getSubscriptionPricing(),
    enabled: Boolean(routeCleaningDuration || hasCleaningCartItems),
    staleTime: 60_000,
  });
  const cookFamilySizeQuery = useQuery({
    queryKey: ["cart-cook-family-sizes"],
    queryFn: getCookFamilySizes,
    staleTime: 5 * 60 * 1000,
  });
  const cookFamilySizeOptions = cookFamilySizeQuery.data ?? [];
  const hasTimeBasedCleaningSelection = Boolean(routeCleaningDuration || hasCleaningCartItems);
  const getCleaningDurationOptionsForItem = useCallback(
    (item: any) =>
      buildCleaningDurationOptions(cleaningPricingQuery.data ?? [], Number(item?.serviceId ?? 0))
        .filter((option) =>
          option.hours >= cartPolicy.minCleaningDurationHours &&
          option.hours <= cartPolicy.maxCleaningDurationHours,
        ),
    [cartPolicy.maxCleaningDurationHours, cartPolicy.minCleaningDurationHours, cleaningPricingQuery.data],
  );
  const getSelectedCleaningDurationForItem = useCallback(
    (item: any, index: number) => {
      if (!hasTimeBasedCleaningSelection || !shouldUseTimeBasedForItem(item)) return null;
      const key = getCartItemDurationKey(item, index);
      return selectedCleaningDurationsByItem[key] ?? routeCleaningDuration ?? defaultCleaningDuration(cartPolicy.minCleaningDurationHours);
    },
    [cartPolicy.minCleaningDurationHours, hasTimeBasedCleaningSelection, routeCleaningDuration, selectedCleaningDurationsByItem, shouldUseTimeBasedForItem],
  );
  const getSelectedCleaningDurationOptionForItem = useCallback(
    (item: any, index: number) => {
      const selected = getSelectedCleaningDurationForItem(item, index);
      const selectedHours = Number(selected?.durationHours ?? 0);
      if (!Number.isFinite(selectedHours) || selectedHours <= 0) return null;
      return getCleaningDurationOptionsForItem(item).find((option) => option.hours === selectedHours) ?? null;
    },
    [getCleaningDurationOptionsForItem, getSelectedCleaningDurationForItem],
  );
  const getSelectedCleaningDurationLabelForItem = useCallback(
    (item: any, index: number) => {
      const selected = getSelectedCleaningDurationForItem(item, index);
      const option = getSelectedCleaningDurationOptionForItem(item, index);
      return option?.label ?? selected?.durationLabel ?? formatRecurringDuration(selected?.durationHours);
    },
    [getSelectedCleaningDurationForItem, getSelectedCleaningDurationOptionForItem],
  );
  const getSelectedCleaningDurationPriceForItem = useCallback(
    (item: any, index: number) => Number(getSelectedCleaningDurationOptionForItem(item, index)?.price ?? 0),
    [getSelectedCleaningDurationOptionForItem],
  );
  const getCookFamilySizeForItem = useCallback(
    (item: any) => {
      if (!isCookCartItem(item)) return null;
      const familySizeId = Number(item?.familySizeId ?? routeCookFamilySizeId ?? 0);
      const familySize = String(item?.familySize ?? scheduledCook?.familySize ?? "").trim();
      const familySizeLabel = String(item?.familySizeLabel ?? scheduledCook?.familySizeLabel ?? "").trim();
      if (!familySizeId && !familySize && !familySizeLabel) return null;
      return {
        familySizeId: familySizeId || undefined,
        familySize: familySize || undefined,
        familySizeLabel: familySizeLabel || undefined,
      };
    },
    [routeCookFamilySizeId, scheduledCook?.familySize, scheduledCook?.familySizeLabel],
  );
  const selectedCleaningDurationSummaryLabel = hasTimeBasedCleaningSelection
    ? `${items.filter(shouldUseTimeBasedForItem).length} service${items.filter(shouldUseTimeBasedForItem).length === 1 ? "" : "s"} time selected`
    : "";
  const stepCleaningDuration = async (item: any, index: number, delta: number) => {
    if (!hasTimeBasedCleaningSelection || !shouldUseTimeBasedForItem(item)) return;
    const cleaningDurationOptions = getCleaningDurationOptionsForItem(item);
    if (cleaningDurationOptions.length === 0) return;
    const key = getCartItemDurationKey(item, index);
    const selected = selectedCleaningDurationsByItem[key] ?? routeCleaningDuration;
    const selectedHours = Number(selected?.durationHours ?? 0);
    const currentIndex = Math.max(
      0,
      cleaningDurationOptions.findIndex((item) => item.hours === selectedHours),
    );
    if (delta < 0 && currentIndex <= 0) {
      const itemId = Number(item?.itemId ?? 0);
      if (!itemId) return;
      try {
        await dispatch(removeCartItemThunk(itemId)).unwrap();
        setSelectedCleaningDurationsByItem((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch {
        await dispatch(fetchCustomerCartThunk());
      }
      return;
    }
    const nextIndex = Math.max(0, Math.min(cleaningDurationOptions.length - 1, currentIndex + delta));
    const next = cleaningDurationOptions[nextIndex];
    if (!next) return;
    setSelectedCleaningDurationsByItem((prev) => ({
      ...prev,
      [key]: { durationHours: next.hours, durationLabel: next.label },
    }));
  };
  const updateCookFamilySize = async (item: any, option: CookFamilySizeOptionDto) => {
    const itemId = Number(item?.itemId ?? 0);
    if (!itemId) return;
    try {
      await dispatch(updateCartItemThunk({
        itemId,
        familySizeId: option.familySizeId,
        familySize: String(option.familySize),
        familySizeLabel: option.label,
      })).unwrap();
      setFamilySizeEditorItem(null);
    } catch (error: any) {
      Alert.alert("Unable to update family size", String(error?.message ?? "Please try again."));
    }
  };
  const recurringPrice = useMemo(() => Number(recurringCartItem?.price ?? 0), [recurringCartItem?.price]);
  const hasRecurringCartItem = Boolean(recurringCartItem);
  const cartServiceCount = items.length + (hasRecurringCartItem ? 1 : 0);
  const hasCartContent = cartServiceCount > 0;
  const itemTotal = useMemo(
    () => {
      const calculatedItemsTotal = items.reduce((sum, item, index) => {
        if (hasTimeBasedCleaningSelection) {
          if (!shouldUseTimeBasedForItem(item)) return sum + Number(item.totalPrice || item.price || 0);
          const durationPrice = getSelectedCleaningDurationPriceForItem(item, index);
          return sum + (durationPrice > 0 ? durationPrice : Number(item.price || 0));
        }
        return sum + Number(item.totalPrice || item.price || 0);
      }, 0);
      const baseItemsTotal = hasTimeBasedCleaningSelection ? calculatedItemsTotal : Number(apiItemTotal || calculatedItemsTotal);
      return baseItemsTotal + recurringPrice;
    },
    [apiItemTotal, getSelectedCleaningDurationPriceForItem, hasTimeBasedCleaningSelection, items, recurringPrice, shouldUseTimeBasedForItem],
  );
  const totalTaxAndFees = useMemo(() => Number(gstAmount || 0) + Number(serviceFee || 0) + Number(taxAmount || 0), [gstAmount, serviceFee, taxAmount]);
  const toPay = useMemo(() => {
    const apiBaseTotal = Number(apiToPay || grandTotal || 0);
    if (apiBaseTotal > 0 && !hasTimeBasedCleaningSelection) return apiBaseTotal + recurringPrice;
    return Number(itemTotal + totalTaxAndFees || 0);
  }, [apiToPay, grandTotal, hasTimeBasedCleaningSelection, itemTotal, recurringPrice, totalTaxAndFees]);
  const totalSaved = useMemo(() => Math.max(0, Number(apiTotalSaved || 0)), [apiTotalSaved]);
  const bookingContactName = (contactName || authUser?.name || "Contact").trim();
  const bookingContactPhone = (contactPhone || authUser?.mobile || "").trim();
  const displayPhone = bookingContactPhone;
  const isPartyScheduledOnly = useMemo(
    () =>
      isPartyCategoryName(route?.params?.categoryName) ||
      items.some((item: any) =>
        isPartyCategoryName(
          item?.categoryName ??
            item?.category ??
            item?.serviceCategory ??
            item?.serviceCategoryName ??
            item?.serviceType,
        ),
      ),
    [items, route?.params?.categoryName],
  );
  const confirmedScheduledDate = bookingMode === "SCHEDULED" ? parseScheduledDateTime(scheduledTime) : null;
  const hasConfirmedScheduledSlot =
    bookingMode === "SCHEDULED" && Boolean(confirmedScheduledDate) && !requiresScheduledSlotSelection;
  const ctaLabel =
    bookingMode === "SUBSCRIPTION"
      ? `Pay now | ${formatCurrency(toPay, currency)}`
      : hasConfirmedScheduledSlot
      ? `Pay now | ${formatCurrency(toPay, currency)}`
      : bookingMode === "SCHEDULED"
        ? CART_CONFIG.actions.selectTimeSlot
        : CART_CONFIG.actions.bookNow;

  useEffect(() => {
    const routeMode = String(route?.params?.bookingMode ?? "").toUpperCase();
    if (routeMode !== "SCHEDULED" && routeMode !== "SUBSCRIPTION") return;
    if (isPartyScheduledOnly && routeMode !== "SCHEDULED") return;
    setBookingMode(routeMode as BookingMode);
    setRequiresScheduledSlotSelection(routeMode === "SCHEDULED");
    if (routeMode === "SCHEDULED" || routeMode === "SUBSCRIPTION") {
      dispatch(setScheduledTime(null));
    }
    didInitModeFromCart.current = true;
  }, [dispatch, isPartyScheduledOnly, route?.params?.bookingMode]);

  useEffect(() => {
    if (!isPartyScheduledOnly || bookingMode === "SCHEDULED") return;
    setBookingMode("SCHEDULED");
    setRequiresScheduledSlotSelection(true);
    dispatch(setScheduledTime(null));
    didInitModeFromCart.current = true;
  }, [bookingMode, dispatch, isPartyScheduledOnly]);

  useEffect(() => {
    if (didInitModeFromCart.current) return;
    if (scheduledTime) {
      setBookingMode("SCHEDULED");
      didInitModeFromCart.current = true;
      return;
    }
    didInitModeFromCart.current = true;
  }, [scheduledTime]);

  useEffect(() => {
    if (selectedAddressId && attemptedCheckout) {
      setAttemptedCheckout(false);
    }
  }, [attemptedCheckout, selectedAddressId]);

  const updateMetaIfReady = (nextAddressId: number | null, nextScheduledTime: string | null) => {
    if (!nextAddressId || !nextScheduledTime) return;
    dispatch(updateCartMetaThunk({ addressId: nextAddressId, scheduledTime: nextScheduledTime }));
  };

  const validateCartBeforeCheckout = async () => {
    if (items.length > cartPolicy.maxCartItems) {
      Alert.alert("Cart limit exceeded", `Maximum ${cartPolicy.maxCartItems} services allowed.`);
      return false;
    }
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const quantity = Number(item.quantity ?? cartPolicy.minServiceQuantity);
      if (item.serviceActive === false) {
        Alert.alert("Service unavailable", `${item.name} is no longer active.`);
        return false;
      }
      if (item.areaAvailable === false) {
        Alert.alert("Service unavailable", `${item.name} is not available in your selected area.`);
        return false;
      }
      if (item.addonActive === false) {
        Alert.alert("Add-on unavailable", `An add-on for ${item.name} is no longer available.`);
        return false;
      }
      const cookFamily = getCookFamilySizeForItem(item);
      if (isCookCartItem(item) && !cookFamily?.familySizeLabel && !cookFamily?.familySizeId && !cookFamily?.familySize) {
        Alert.alert("Select family size", "Please select a family size for Cook At Home before checkout.");
        return false;
      }
      const maxQuantity = isCookCartItem(item) ? cartPolicy.maxCookQuantity : cartPolicy.maxOtherServiceQuantity;
      if (!shouldUseTimeBasedForItem(item) && quantity > maxQuantity) {
        Alert.alert("Quantity exceeded", `Maximum ${maxQuantity} allowed per service.`);
        return false;
      }
      const selectedDuration = getSelectedCleaningDurationForItem(item, index);
      if (selectedDuration) {
        const hours = Number(selectedDuration.durationHours ?? 0);
        const options = getCleaningDurationOptionsForItem(item);
        const isConfiguredDuration = options.some((option) => option.hours === hours);
        if (
          !Number.isFinite(hours) ||
          hours < cartPolicy.minCleaningDurationHours ||
          hours > cartPolicy.maxCleaningDurationHours ||
          !isConfiguredDuration
        ) {
          Alert.alert("Service unavailable", "Selected cleaning duration is no longer available.");
          return false;
        }
      }
    }
    try {
      await dispatch(fetchCustomerCartThunk()).unwrap();
    } catch {
      Alert.alert("Service unavailable", "Unable to validate latest cart. Please retry.");
      return false;
    }
    return true;
  };

  const selectBookingMode = (nextMode: BookingMode) => {
    if (isPartyScheduledOnly && nextMode !== "SCHEDULED") return;
    setBookingMode(nextMode);
    setAttemptedCheckout(false);
    if (nextMode === "SUBSCRIPTION") {
      setRequiresScheduledSlotSelection(false);
      dispatch(setScheduledTime(null));
      if (!recurringCartItem) {
        navigation.navigate("RecurringBooking");
      }
      return;
    }
    if (nextMode === "INSTANT") {
      setRequiresScheduledSlotSelection(false);
      const instantIso = getInstantIsoTime(cartPolicy.instantBookingWindowMinutes);
      dispatch(setScheduledTime(instantIso));
      updateMetaIfReady(selectedAddressId, instantIso);
      return;
    }
    setRequiresScheduledSlotSelection(true);
    dispatch(setScheduledTime(null));
    setOpenTimePickerKey((v) => v + 1);
  };

  const handleCheckout = async () => {
    if (checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    setCheckoutInFlight(true);
    try {
    if (!(await validateCartBeforeCheckout())) return;
    const promptManualAddressIfMissing = () => {
      if (selectedAddressId && selectedAddress && Number(selectedAddress.id) === Number(selectedAddressId)) {
        return false;
      }
      setAttemptedCheckout(true);
      if (hasDetectedLocation) {
        Alert.alert(
          "Complete address required",
          "We detected your location. Please add flat/building details once before booking.",
          [
            {
              text: "Add details",
              onPress: () =>
                navigation.navigate("AddAddressDetails", {
                  pickedLocation: {
                    latitude: Number(locationSelectedAddress?.latitude ?? 0),
                    longitude: Number(locationSelectedAddress?.longitude ?? 0),
                  },
                  pickedAddressLine: String(locationSelectedAddress?.addressLine ?? ""),
                }),
            },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select address before booking.");
      }
      return true;
    };

    if (bookingMode === "SUBSCRIPTION" || (hasRecurringCartItem && items.length === 0)) {
      if (!recurringCartItem) {
        navigation.navigate("RecurringBooking");
        return;
      }
      if (promptManualAddressIfMissing()) return;
      if (!selectedAddressId || !bookingCoordinates) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select a valid saved address.");
        return;
      }
      try {
        const subscription = await createSubscriptionBooking({
          serviceId: recurringCartItem.serviceId,
          subscriptionServiceType: recurringCartItem.subscriptionServiceType,
          frequencyDays: recurringCartItem.frequencyDays,
          startDate: recurringCartItem.startDate,
          endDate: recurringCartItem.endDate,
          visits: recurringCartItem.visits,
          durationHours: recurringCartItem.durationHours,
          familySize: recurringCartItem.familySize,
          timeSlot: recurringCartItem.timeSlot,
          addressId: Number(selectedAddressId),
          latitude: bookingCoordinates.latitude,
          longitude: bookingCoordinates.longitude,
        });
        const bookingId = subscription?.bookingId ?? subscription?.id ?? subscription?.subscriptionId ?? null;
        if (!bookingId) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Unable to start subscription payment. Booking id missing.");
          return;
        }
        dispatch(lockCartUntilPayment({ bookingId: String(bookingId) }));
        navigation.navigate("Payment", {
          bookingId: String(bookingId),
          cartId,
          amount: recurringPrice || toPay,
          currency,
          bookingMode: "SUBSCRIPTION",
          postPaymentRoute: "SubscriptionConfirmed",
        });
      } catch (error: any) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, readableBookingError(error?.message ?? "Unable to create subscription booking."));
      }
      return;
    }

    if (hasConfirmedScheduledSlot) {
      if (items.length === 0) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Cart is empty. Please add service first.");
        setAttemptedCheckout(true);
        return;
      }
      if (promptManualAddressIfMissing()) {
        return;
      }
      if (!selectedAddressId) {
        if (items.length === 0) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Cart is empty. Please add service first.");
        } else {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select address before payment.");
        }
        setAttemptedCheckout(true);
        return;
      }
      if (!scheduledTime) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please choose and confirm a schedule slot.");
        return;
      }
      try {
        const firstServiceId = Number(items[0]?.serviceId ?? 0);
        if (!firstServiceId) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, CART_CONFIG.messages.missingServiceId);
          return;
        }
        if (!selectedAddress || Number(selectedAddress.id) !== Number(selectedAddressId)) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select a valid saved address.");
          return;
        }
        const targetDate = parseScheduledDateTime(scheduledTime);
        if (!targetDate) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Invalid scheduled slot. Please select again.");
          setOpenTimePickerKey((v) => v + 1);
          return;
        }
        const dateKey = toLocalDate(targetDate);
        const selectedSlotStart = `${String(targetDate.getHours()).padStart(2, "0")}:${String(targetDate.getMinutes()).padStart(2, "0")}`;
        let bookingWindow = toDateAndSlot(scheduledTime);
        try {
          const nowMs = Date.now();
          const slots = await getAvailableTimeSlots(dateKey);
          const exact = slots
            .map((row) => {
              const rawSlot = String(row?.slot ?? "").trim();
              const start = toSlotStart(rawSlot);
              if (!start) return null;
              const t = new Date(`${dateKey}T${start}:00`);
              if (!Number.isFinite(t.getTime()) || t.getTime() <= nowMs) return null;
              return { row, start };
            })
            .filter(Boolean)
            .find((item: any) => item.start === selectedSlotStart) as { row: any; start: string } | undefined;

          if (!exact) {
            Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Selected slot is no longer available. Please reselect slot.");
            setOpenTimePickerKey((v) => v + 1);
            return;
          }
          bookingWindow = { date: dateKey, slot: String(exact.row.slot).trim() };
          dispatch(setScheduledTime(`${dateKey}T${exact.start}:00`));
          updateMetaIfReady(selectedAddressId, `${dateKey}T${exact.start}:00`);
        } catch {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Unable to verify latest slots. Please retry and confirm slot again.");
          setOpenTimePickerKey((v) => v + 1);
          return;
        }
        if (!bookingCoordinates) {
          Alert.alert(
            CART_CONFIG.messages.bookingFailedTitle,
            "Selected address does not have valid map coordinates. Please reselect location and save address details.",
          );
          return;
        }
        const scheduledNote = [
          "Payment pending from customer app",
          scheduledCook?.familySizeLabel ? `Cook family size: ${scheduledCook.familySizeLabel}` : "",
          selectedCleaningDurationSummaryLabel ? `Cleaning duration: ${selectedCleaningDurationSummaryLabel}` : "",
        ].filter(Boolean).join(" | ");
        const booking = await createBooking({
          serviceId: String(firstServiceId),
          addressId: String(selectedAddressId),
          latitude: bookingCoordinates?.latitude,
          longitude: bookingCoordinates?.longitude,
          date: bookingWindow.date,
          slot: bookingWindow.slot,
          note: scheduledNote,
        });
        const bookingId = (booking as any)?.data?.id ?? (booking as any)?.id ?? null;
        if (!bookingId) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Unable to start payment. Booking id missing.");
          return;
        }
        void trackBookingCreated({
          booking_id: String(bookingId),
          booking_mode: "SCHEDULED",
          payment_required: true,
          service_id: firstServiceId,
          service_count: items.length,
          cart_id: cartId ?? undefined,
          amount: toPay,
          currency,
          source: "cart_scheduled_pay_now",
        });
        dispatch(lockCartUntilPayment({ bookingId: String(bookingId) }));
        navigation.navigate("Payment", {
          bookingId: String(bookingId),
          cartId,
          amount: toPay,
          currency,
          bookingMode: "SCHEDULED",
          postPaymentRoute: "BookingPaymentConfirm",
        });
      } catch (e: any) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, readableBookingError(e?.message ?? CART_CONFIG.messages.bookingErrorFallback));
      }
      return;
    }

    let effectiveScheduledTime = scheduledTime;
    if (bookingMode === "INSTANT" && !effectiveScheduledTime) {
      effectiveScheduledTime = getInstantIsoTime(cartPolicy.instantBookingWindowMinutes);
      dispatch(setScheduledTime(effectiveScheduledTime));
      updateMetaIfReady(selectedAddressId, effectiveScheduledTime);
    }
    if (bookingMode === "SCHEDULED" && (requiresScheduledSlotSelection || !parseScheduledDateTime(effectiveScheduledTime))) {
      setAttemptedCheckout(true);
      setOpenTimePickerKey((v) => v + 1);
      return;
    }
    if (!effectiveScheduledTime) {
      setAttemptedCheckout(true);
      Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select Instant booking.");
      return;
    }
    if (!selectedAddressId || items.length === 0) {
      if (items.length === 0) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Cart is empty. Please add service first.");
      } else if (promptManualAddressIfMissing()) {
        return;
      }
      setAttemptedCheckout(true);
      return;
    }
    try {
      const firstServiceId = Number(items[0]?.serviceId ?? 0);
      if (!firstServiceId) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, CART_CONFIG.messages.missingServiceId);
        return;
      }
      if (!selectedAddress || Number(selectedAddress.id) !== Number(selectedAddressId)) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select a valid saved address.");
        return;
      }
      let bookingWindow = toDateAndSlot(effectiveScheduledTime);
      try {
          const targetDate = parseScheduledDateTime(effectiveScheduledTime);
          if (targetDate) {
            const dateKey = toLocalDate(targetDate);
          const slots = await getAvailableTimeSlots(dateKey);
          const nowMs = Date.now();
          const selectedFromApi = slots.find((row) => {
            const rawSlot = String(row?.slot ?? "").trim();
            const start = toSlotStart(rawSlot);
            if (!start) return false;
            const t = new Date(`${dateKey}T${start}:00`);
            if (!Number.isFinite(t.getTime()) || t.getTime() <= nowMs) return false;
            if (bookingMode !== "INSTANT") return true;
            const diffMins = (t.getTime() - nowMs) / 60000;
            return diffMins <= cartPolicy.instantBookingWindowMinutes;
          });
          if (bookingMode === "INSTANT" && !selectedFromApi) {
            Alert.alert(
              "Instant unavailable",
              `No partner slot available within ${cartPolicy.instantBookingWindowMinutes} minutes. Please choose Scheduled.`,
            );
            return;
          }
          if (selectedFromApi) {
            bookingWindow = { date: dateKey, slot: String(selectedFromApi.slot).trim() };
          }
        }
      } catch {
        // Keep fallback booking window if slots API fails.
      }
      if (!bookingCoordinates) {
        Alert.alert(
          CART_CONFIG.messages.bookingFailedTitle,
          "Selected address does not have valid map coordinates. Please reselect location and save address details.",
        );
        return;
      }
      const bookingNote = [
        bookingMode === "INSTANT"
          ? `Instant booking requested (within ${cartPolicy.instantBookingWindowMinutes} mins)`
          : "Booking from customer app",
        bookingMode === "SCHEDULED" && scheduledCook?.familySizeLabel ? `Cook family size: ${scheduledCook.familySizeLabel}` : "",
        selectedCleaningDurationSummaryLabel ? `Cleaning duration: ${selectedCleaningDurationSummaryLabel}` : "",
      ].filter(Boolean).join(" | ");
      const booking = await createBooking({
        serviceId: String(firstServiceId),
        addressId: String(selectedAddressId),
        latitude: bookingCoordinates?.latitude,
        longitude: bookingCoordinates?.longitude,
        date: bookingWindow.date,
        slot: bookingWindow.slot,
        note: bookingNote,
      });
      const bookingId = (booking as any)?.data?.id ?? (booking as any)?.id ?? null;
      if (bookingId) {
        void trackBookingCreated({
          booking_id: String(bookingId),
          booking_mode: bookingMode,
          payment_required: bookingMode === "INSTANT",
          service_id: firstServiceId,
          service_count: items.length,
          cart_id: cartId ?? undefined,
          amount: toPay,
          currency,
          source: "cart_checkout",
        });
      }
      setSnackMessage(bookingId ? `${CART_CONFIG.messages.bookingSuccess} ID: ${bookingId}` : CART_CONFIG.messages.bookingSuccess);
      setSnackVisible(true);
      if (bookingMode === "INSTANT" && bookingId) {
        dispatch(lockCartUntilPayment({ bookingId: String(bookingId) }));
        navigation.navigate("Payment", {
          bookingId: String(bookingId),
          cartId,
          amount: toPay,
          currency,
          bookingMode: "INSTANT",
          postPaymentRoute: "BookingPaymentConfirm",
        });
      } else if (bookingMode === "SCHEDULED" && bookingId) {
        dispatch(fetchCustomerCartThunk());
        navigation.navigate("ScheduledBookingStatus", { bookingId: String(bookingId) });
      } else if (bookingId) {
        dispatch(fetchCustomerCartThunk());
        navigation.navigate("Main", { screen: "Bookings" });
      } else {
        dispatch(fetchCustomerCartThunk());
        navigation.navigate("Main", { screen: "Bookings" });
      }
    } catch (e: any) {
      Alert.alert(CART_CONFIG.messages.bookingFailedTitle, readableBookingError(e?.message ?? CART_CONFIG.messages.bookingErrorFallback));
    }
    } finally {
      setTimeout(() => {
        checkoutInFlightRef.current = false;
        setCheckoutInFlight(false);
      }, 1200);
    }
  };

  const changeItemQuantity = async (item: any, delta: number) => {
    const itemId = Number(item?.itemId ?? 0);
    const currentQty = Number(item?.quantity ?? 1);
    if (!itemId || !Number.isFinite(itemId)) return;
    try {
      if (delta < 0 && currentQty <= cartPolicy.minServiceQuantity) {
        await dispatch(removeCartItemThunk(itemId)).unwrap();
      } else {
        const nextQty = Math.max(cartPolicy.minServiceQuantity, currentQty + delta);
        const maxQuantity = isCookCartItem(item) ? cartPolicy.maxCookQuantity : cartPolicy.maxOtherServiceQuantity;
        if (nextQty > maxQuantity) {
          Alert.alert("Quantity exceeded", `Maximum ${maxQuantity} allowed per service.`);
          return;
        }
        await dispatch(updateCartItemThunk({ itemId, quantity: nextQty })).unwrap();
      }
    } catch {
      // Ensure latest server state is reflected even if update API response is inconsistent.
      await dispatch(fetchCustomerCartThunk());
    }
  };

  const recurringDetails = recurringCartItem
    ? recurringCartItem.subscriptionServiceType === "COOK"
      ? [
          recurringCartItem.familySizeLabel ? `Family Size: ${recurringCartItem.familySizeLabel}` : "",
          recurringCartItem.frequencyLabel ? `Frequency: ${recurringCartItem.frequencyLabel}` : "",
          Number(recurringCartItem.visits ?? 0) > 0 ? `Visits: ${Number(recurringCartItem.visits ?? 0)}` : "",
          String(recurringCartItem.timeSlot ?? "").trim() ? `Time Slot: ${String(recurringCartItem.timeSlot ?? "").trim()}` : "",
          formatShortDateLabel(recurringCartItem.startDate) ? `Start Date: ${formatShortDateLabel(recurringCartItem.startDate)}` : "",
          formatShortDateLabel(recurringCartItem.endDate) ? `End Date: ${formatShortDateLabel(recurringCartItem.endDate)}` : "",
        ].filter(Boolean)
      : [
          `${Number(recurringCartItem.visits ?? 0)} visits`,
          formatRecurringDuration(recurringCartItem.durationHours, recurringCartItem.durationLabel),
          recurringCartItem.frequencyLabel || recurringCartItem.frequencyDays?.join(", ") || "",
          String(recurringCartItem.timeSlot ?? "").trim(),
        ].filter(Boolean)
    : [];

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 76 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {loading ? <Text style={styles.info}>{CART_CONFIG.messages.loadCartFailed}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.topSummaryStrip, styles.edgeToEdge]}>
          <View style={styles.topSummaryLeft}>
            <View>
            <Text style={styles.topSummaryTitle}>My Cart</Text>
            <Text style={styles.topSummarySub}>{cartServiceCount} services selected</Text>
            </View>
          </View>
          <View style={styles.topSummaryAmountWrap}>
            <Text style={styles.topSummaryAmountLabel}>To Pay</Text>
            <Text style={styles.topSummaryAmount}>{formatCurrency(toPay, currency)}</Text>
          </View>
        </View>

        <View style={[styles.sectionHead, styles.edgeToEdge]}>
          <Text style={styles.sectionTitle}>{CART_CONFIG.sectionLabels.reviewBooking}</Text>
          <Text style={styles.sectionMeta}>{cartServiceCount} services</Text>
        </View>

        <View style={[styles.card, styles.edgeToEdge]}>
          {hasCartContent ? (
            <>
              {recurringCartItem ? (
                <View style={styles.recurringReviewCard}>
                  <View style={styles.recurringTopRow}>
                    <View style={styles.recurringServiceLeft}>
                      <View style={styles.recurringIconBox}>
                        <MaterialCommunityIcon name="calendar-refresh-outline" size={24} color={COLORS.goldSoft} />
                      </View>
                      <View style={styles.serviceTextWrap}>
                        <Text style={styles.serviceName} numberOfLines={1}>
                          {recurringCartItem.serviceName || "Hourly Services"}
                        </Text>
                        <Text style={styles.priceNow}>{formatCurrency(recurringPrice, currency)}</Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.recurringDeleteBtn}
                      onPress={() => {
                        setRecurringCartItem(null);
                        if (bookingMode === "SUBSCRIPTION") {
                          setBookingMode("INSTANT");
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove recurring booking"
                    >
                      <MaterialCommunityIcon name="delete-outline" size={20} color={COLORS.goldSoft} />
                    </Pressable>
                  </View>
                  <View style={styles.recurringDetailGrid}>
                    {recurringDetails.map((detail, index) => (
                      <View key={`${detail}-${index}`} style={styles.recurringDetailPill}>
                        <Text style={styles.recurringDetailText} numberOfLines={1}>{detail}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {recurringCartItem && items.length > 0 ? <View style={styles.divider} /> : null}
              {items.map((item, index) => {
                const imageCandidates = buildCartImageCandidates(item?.imageUrl);
                const itemImage = imageCandidates[0] ?? resolveCartItemImage(item);
                const isTimeBasedCleaningItem = hasTimeBasedCleaningSelection && shouldUseTimeBasedForItem(item);
                const selectedDurationLabel = getSelectedCleaningDurationLabelForItem(item, index);
                const selectedDurationPrice = getSelectedCleaningDurationPriceForItem(item, index);
                const cookFamily = getCookFamilySizeForItem(item);
                const isCookItem = Boolean(cookFamily);
                const displayPrice = isTimeBasedCleaningItem && selectedDurationPrice > 0
                  ? selectedDurationPrice
                  : Number(item.price ?? 0);
                return (
                  <View key={String(item.itemId)} style={styles.serviceRow}>
                    <View style={styles.serviceLeft}>
                      {itemImage ? (
                        <Image
                          source={
                            Object.keys(imageRequestHeaders).length > 0
                              ? { uri: itemImage, headers: imageRequestHeaders }
                              : { uri: itemImage }
                          }
                          style={styles.thumbImage}
                          resizeMode="cover"
                          onError={() => {}}
                        />
                      ) : (
                        <View style={styles.thumbPlaceholder}>
                          <MaterialCommunityIcon name="briefcase-outline" size={20} color={palette.mutedSoft} />
                        </View>
                      )}
                      <View style={styles.serviceTextWrap}>
                        <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
                        {cookFamily?.familySizeLabel ? (
                          <Text style={styles.recurringDetailText}>Family Size: {cookFamily.familySizeLabel}</Text>
                        ) : null}
                        {Array.isArray(item.addons) && item.addons.length > 0 ? (
                          <Text style={styles.recurringDetailText}>{item.addons.length} add-ons selected</Text>
                        ) : null}
                        <Text style={styles.priceNow}>{formatCurrency(displayPrice, currency)}</Text>
                        {isCookItem ? (
                          <Pressable
                            onPress={() => setFamilySizeEditorItem(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Change family size for ${String(item?.name ?? "cook service")}`}
                          >
                            <Text style={styles.changeFamilyText}>Change Family Size</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                    <View style={[styles.qtyWrap, isCompact && styles.qtyWrapCompact]}>
                      {isTimeBasedCleaningItem ? (
                        <SwipeQuantityStepper
                          quantity={1}
                          valueLabel={selectedDurationLabel || "Time"}
                          onDecrease={() => stepCleaningDuration(item, index, -1)}
                          onIncrease={() => stepCleaningDuration(item, index, 1)}
                          accessibilityLabelBase={`${String(item?.name ?? "service")} duration`}
                        />
                      ) : (
                        <SwipeQuantityStepper
                          quantity={Number(item.quantity ?? 1)}
                          onDecrease={() => changeItemQuantity(item, -1)}
                          onIncrease={() => changeItemQuantity(item, +1)}
                          accessibilityLabelBase={String(item?.name ?? "service")}
                        />
                      )}
                    </View>
                </View>
                );
              })}
              <View style={styles.divider} />
              <Pressable onPress={() => navigation.navigate("Main", { screen: "Home" })}>
                <Text style={styles.addMore}>Add more services.</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyInline}>{CART_CONFIG.messages.cartEmptySubtitle}</Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, styles.edgeToEdgeTitle]}>{CART_CONFIG.sectionLabels.bookingDetails}</Text>
        <View style={[styles.card, styles.edgeToEdge]}>
          <Pressable style={styles.detailRow} onPress={() => navigation.navigate("Address")}>
            <MaterialCommunityIcon name="map-marker-outline" size={28} color={palette.icon} />
            <View style={styles.detailTextWrap}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.detailTitle}>{CART_CONFIG.sectionLabels.location}</Text>
                {selectedAddress ? <Text style={styles.selectedBadge}>Selected</Text> : null}
              </View>
              <Text style={styles.detailValue} numberOfLines={2}>
                {bookingLocationText || CART_CONFIG.sectionLabels.selectAddress}
              </Text>
            </View>
            <MaterialCommunityIcon name="chevron-right" size={24} color={palette.iconSoft} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.detailRow} onPress={() => {}}>
            <MaterialCommunityIcon name="phone-outline" size={28} color={palette.icon} />
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailTitle}>{bookingContactName}</Text>
              <Text style={styles.detailValue}>{displayPhone || CART_CONFIG.sectionLabels.missingPhone}</Text>
            </View>
            <MaterialCommunityIcon name="chevron-right" size={24} color={palette.iconSoft} />
          </Pressable>
        </View>
        {attemptedCheckout && !selectedAddressId ? <Text style={styles.inlineError}>{CART_CONFIG.messages.selectAddressError}</Text> : null}

        <View style={[styles.sectionTitleRow, styles.edgeToEdge]}>
          <MaterialCommunityIcon name="calendar-check-outline" size={18} color={COLORS.offWhite} />
          <Text style={styles.sectionTitle}>When do you need it?</Text>
        </View>
        <View style={[styles.timelineWrap, styles.edgeToEdge]}>
          <View style={styles.timelineNode}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <Text style={[styles.timelineLabel, styles.timelineLabelActive]}>Mode</Text>
          </View>
          <View style={[styles.timelineLine, styles.timelineLineActive]} />
          <View style={styles.timelineNode}>
            <View
              style={[
                styles.timelineDot,
                (bookingMode === "INSTANT" || bookingMode === "SUBSCRIPTION" || Boolean(scheduledTime)) && styles.timelineDotActive,
              ]}
            />
            <Text
              style={[
                styles.timelineLabel,
                (bookingMode === "INSTANT" || bookingMode === "SUBSCRIPTION" || Boolean(scheduledTime)) && styles.timelineLabelActive,
              ]}
            >
              Slot selected
            </Text>
          </View>
          <View style={styles.timelineLine} />
          <View style={styles.timelineNode}>
            <View style={styles.timelineDot} />
            <Text style={styles.timelineLabel}>Payment</Text>
          </View>
        </View>
        <View style={[styles.modeRow, styles.edgeToEdge]}>
          {(Object.keys(BOOKING_MODE_META) as BookingMode[]).map((modeKey) => {
            const active = bookingMode === modeKey;
            const disabled = isPartyScheduledOnly && modeKey !== "SCHEDULED";
            return (
              <Pressable
                key={modeKey}
                style={[styles.modeBtn, active && styles.modeBtnActive, disabled && styles.modeBtnDisabled]}
                onPress={() => selectBookingMode(modeKey)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={BOOKING_MODE_META[modeKey].label}
                accessibilityState={{ selected: active, disabled }}
              >
                <MaterialCommunityIcon
                  name={BOOKING_MODE_META[modeKey].icon}
                  size={17}
                  color={disabled ? palette.mutedSoft : COLORS.white}
                />
                <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive, disabled && styles.modeBtnTextDisabled]}>{BOOKING_MODE_META[modeKey].label}</Text>
              </Pressable>
            );
          })}
        </View>

        {bookingMode === "SCHEDULED" ? (
          <>
            <TimePicker
              value={scheduledTime}
              loadSlots={getAvailableTimeSlots}
              showError={attemptedCheckout && !scheduledTime}
              openRequestKey={openTimePickerKey}
              hideTrigger
              infoText={CART_CONFIG.slotInfoText}
              dateWindowDays={cartPolicy.scheduledBookingWindowDays}
              onChange={(isoTime) => {
                dispatch(setScheduledTime(isoTime));
                setRequiresScheduledSlotSelection(false);
                setAttemptedCheckout(false);
                updateMetaIfReady(selectedAddressId, isoTime);
              }}
            />
          </>
        ) : null}

        <Text style={[styles.sectionTitle, styles.edgeToEdgeTitle]}>{CART_CONFIG.sectionLabels.billDetails}</Text>
        <View style={[styles.card, styles.edgeToEdge]}>
          <View style={styles.billTop}>
            <Text style={styles.billToPay}>{CART_CONFIG.sectionLabels.toPay} {formatCurrency(toPay, currency)}</Text>
            {totalSaved > 0 ? <Text style={styles.billSaved}>{formatCurrency(totalSaved, currency)} saved on the total!</Text> : null}
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}><Text style={styles.billLabel}>{CART_CONFIG.sectionLabels.itemTotal}</Text><Text style={styles.billValue}>{formatCurrency(itemTotal, currency)}</Text></View>
          <View style={styles.billRow}><Text style={styles.billLabel}>{CART_CONFIG.sectionLabels.gstAndFees}</Text><Text style={styles.billValue}>{formatCurrency(totalTaxAndFees, currency)}</Text></View>
          <View style={styles.billRow}><Text style={styles.billLabelStrong}>{CART_CONFIG.sectionLabels.toPay}</Text><Text style={styles.billValueStrong}>{formatCurrency(toPay, currency)}</Text></View>
        </View>

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(2, insets.bottom), paddingTop: 6 }]}>
        <Pressable
          style={[styles.primaryBtn, styles.edgeToEdgeCta, (!hasCartContent || checkoutInFlight) && styles.primaryBtnDisabled]}
          onPress={handleCheckout}
          disabled={!hasCartContent || checkoutInFlight}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.primaryBtnText}>{checkoutInFlight ? "Processing..." : ctaLabel}</Text>
        </Pressable>
      </View>

      <Modal
        visible={Boolean(familySizeEditorItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setFamilySizeEditorItem(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFamilySizeEditorItem(null)}>
          <Pressable style={styles.familyModal} onPress={() => undefined}>
            <View style={styles.familyModalHeader}>
              <Text style={styles.familyModalTitle}>Change Family Size</Text>
              <Pressable onPress={() => setFamilySizeEditorItem(null)} accessibilityRole="button" accessibilityLabel="Close family size selector">
                <MaterialCommunityIcon name="close" size={20} color={COLORS.goldSoft} />
              </Pressable>
            </View>
            <View style={styles.familyOptionList}>
              {cookFamilySizeOptions.map((option) => {
                const current = familySizeEditorItem ? getCookFamilySizeForItem(familySizeEditorItem) : null;
                const active = Number(current?.familySizeId ?? 0) === Number(option.familySizeId) ||
                  String(current?.familySize ?? "").toUpperCase() === String(option.familySize).toUpperCase();
                return (
                  <Pressable
                    key={`${option.familySizeId}-${option.familySize}`}
                    style={[styles.familyOption, active && styles.familyOptionActive]}
                    onPress={() => familySizeEditorItem ? void updateCookFamilySize(familySizeEditorItem, option) : undefined}
                  >
                    <View>
                      <Text style={[styles.familyOptionTitle, active && styles.familyOptionTitleActive]}>{option.label}</Text>
                      {option.subtitle ? <Text style={styles.familyOptionSub}>{option.subtitle}</Text> : null}
                    </View>
                    {active ? <MaterialCommunityIcon name="check-circle" size={20} color={COLORS.goldSoft} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2600}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.md },
  edgeToEdge: { marginHorizontal: -spacing.md },
  edgeToEdgeTitle: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  topSummaryStrip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.sm,
  },
  topSummaryLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  topSummaryTitle: { color: COLORS.white, fontSize: 20, fontWeight: "900", fontFamily: FONT?.bold },
  topSummarySub: { color: COLORS.neutral100, fontSize: 12, fontWeight: "700", marginTop: 2, fontFamily: FONT?.regular },
  topSummaryAmountWrap: { alignItems: "flex-end" },
  topSummaryAmountLabel: { color: COLORS.goldSoft, fontSize: 11, fontWeight: "800", textTransform: "uppercase", fontFamily: FONT?.semibold },
  topSummaryAmount: { color: COLORS.white, fontSize: 18, fontWeight: "900", marginTop: 2, fontFamily: FONT?.bold },
  info: { color: palette.muted },
  error: { color: palette.danger, fontWeight: "600" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timelineWrap: { flexDirection: "row", alignItems: "center", marginTop: -2, marginBottom: 2 },
  timelineNode: { alignItems: "center", width: 82 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(224,169,75,0.15)",
  },
  timelineDotActive: { backgroundColor: COLORS.goldSoft },
  timelineLine: { flex: 1, height: 2, backgroundColor: "rgba(224,169,75,0.25)" },
  timelineLineActive: { backgroundColor: COLORS.goldSoft },
  timelineLabel: { marginTop: 4, color: COLORS.neutral100, fontSize: 10, fontWeight: "700" },
  timelineLabelActive: { color: COLORS.goldSoft, fontWeight: "900" },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: COLORS.offWhite, fontFamily: FONT?.bold },
  sectionMeta: { fontSize: 14, fontWeight: "800", color: COLORS.neutral100, fontFamily: FONT?.semibold },
  card: {
    borderRadius: radii.lg,
    backgroundColor: COLORS.navyDark,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0, paddingRight: 6 },
  thumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: palette.surfaceAlt,
  },
  serviceTextWrap: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: "800", color: COLORS.white, fontFamily: FONT?.bold },
  priceNow: { fontSize: 13, fontWeight: "900", color: COLORS.goldSoft, marginTop: 4, fontFamily: FONT?.bold },
  recurringReviewCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navy,
    padding: 12,
    gap: 12,
  },
  scheduledCookCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navy,
    padding: 12,
    gap: 8,
  },
  recurringTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  recurringServiceLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  recurringIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(224,169,75,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  recurringDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.68)",
    backgroundColor: "rgba(224,169,75,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  recurringDetailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recurringDetailPill: {
    maxWidth: "48%",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.5)",
    backgroundColor: "rgba(224,169,75,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recurringDetailText: { color: COLORS.offWhite, fontSize: 12, fontWeight: "800", fontFamily: FONT?.semibold },
  changeFamilyText: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "900", marginTop: 4, fontFamily: FONT?.bold },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#001a4d",
    minHeight: 36,
  },
  qtySwipeWrap: {
    position: "relative",
    borderRadius: radii.pill,
  },
  qtySwipeHintLeft: {
    position: "absolute",
    left: 2,
    top: 2,
    bottom: 2,
    width: 10,
    borderRadius: 6,
    backgroundColor: "rgba(224,169,75,0.18)",
  },
  qtySwipeHintRight: {
    position: "absolute",
    right: 2,
    top: 2,
    bottom: 2,
    width: 10,
    borderRadius: 6,
    backgroundColor: "rgba(224,169,75,0.18)",
  },
  qtyBtn: { minWidth: 28, minHeight: 28, alignItems: "center", justifyContent: "center" },
  qtyControl: { fontSize: 20, color: COLORS.goldSoft, fontWeight: "900", lineHeight: 20 },
  qtyDivider: { width: 1, height: 20, backgroundColor: "rgba(224,169,75,0.45)" },
  qtyValue: { fontSize: 14, color: COLORS.white, fontWeight: "900", minWidth: 46, textAlign: "center" },
  emptyInline: { color: COLORS.neutral100, fontSize: 14, fontWeight: "600", textAlign: "center", paddingVertical: 8 },
  divider: { height: 1, backgroundColor: "rgba(224,169,75,0.35)" },
  addMore: { textAlign: "center", color: COLORS.goldSoft, fontSize: 14, fontWeight: "800", fontFamily: FONT?.bold },
  couponCard: {
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  couponText: { color: palette.muted, fontWeight: "800", fontSize: 15, fontFamily: FONT?.semibold },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailTextWrap: { flex: 1 },
  locationTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTitle: { color: COLORS.white, fontSize: 15, fontWeight: "900", fontFamily: FONT?.bold },
  selectedBadge: {
    color: palette.white,
    backgroundColor: palette.success,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  detailValue: { color: COLORS.neutral100, fontSize: 14, fontWeight: "600", marginTop: 3, fontFamily: FONT?.regular },
  inlineError: { color: palette.danger, fontWeight: "700", fontSize: 12, marginTop: -6 },
  billTop: { gap: 4 },
  billToPay: { color: COLORS.white, fontSize: 20, fontWeight: "900", fontFamily: FONT?.bold },
  billSaved: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "800", fontFamily: FONT?.semibold },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  billLabel: { color: COLORS.neutral100, fontSize: 15, fontWeight: "700", fontFamily: FONT?.semibold },
  billValue: { color: COLORS.white, fontSize: 15, fontWeight: "800", fontFamily: FONT?.bold },
  billLabelStrong: { color: COLORS.goldSoft, fontSize: 17, fontWeight: "900", fontFamily: FONT?.bold },
  billValueStrong: { color: COLORS.goldSoft, fontSize: 17, fontWeight: "900", fontFamily: FONT?.bold },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    backgroundColor: "#001a4d",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  modeBtnActive: {
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(224,169,75,0.24)",
  },
  modeBtnDisabled: {
    opacity: 0.45,
  },
  modeBtnText: { color: COLORS.white, fontSize: 14, fontWeight: "800", fontFamily: FONT?.semibold },
  modeBtnTextActive: { color: COLORS.goldSoft, fontFamily: FONT?.bold },
  modeBtnTextDisabled: { color: palette.mutedSoft },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 12,
    backgroundColor: COLORS.navyDark,
    borderTopWidth: 0,
    borderTopColor: "transparent",
    paddingHorizontal: 0,
    paddingTop: 6,
    paddingBottom: 2,
    marginTop: 8,
  },
  primaryBtn: {
    borderRadius: 0,
    backgroundColor: COLORS.goldSoft,
    paddingVertical: 15,
    alignItems: "center",
    ...shadows.sm,
  },
  qtyWrap: { marginLeft: "auto", flexShrink: 0 },
  qtyWrapCompact: { marginLeft: 8, flexShrink: 0 },
  edgeToEdgeCta: { marginHorizontal: 0 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: COLORS.navyDark, fontSize: 16, fontWeight: "900", fontFamily: FONT?.bold },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  familyModal: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    padding: 16,
    gap: 12,
  },
  familyModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  familyModalTitle: { color: COLORS.white, fontSize: 18, fontWeight: "900", fontFamily: FONT?.bold },
  familyOptionList: { gap: 10 },
  familyOption: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(224,169,75,0.45)",
    backgroundColor: "rgba(224,169,75,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  familyOptionActive: {
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(224,169,75,0.2)",
  },
  familyOptionTitle: { color: COLORS.white, fontSize: 14, fontWeight: "900", fontFamily: FONT?.bold },
  familyOptionTitleActive: { color: COLORS.goldSoft },
  familyOptionSub: { color: COLORS.neutral100, fontSize: 12, fontWeight: "700", marginTop: 2, fontFamily: FONT?.semibold },
});

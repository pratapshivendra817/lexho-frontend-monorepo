import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Snackbar, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createBooking } from "../../api/bookingApi";
import { getAvailableTimeSlots } from "../../api/cartApi";
import { TimePicker } from "../../components/cart/TimePicker";
import { CART_CONFIG } from "../../constants/cartConfig";
import { palette, spacing } from "../../constants/theme";
import {
  fetchCustomerAddressesThunk,
  fetchCustomerCartThunk,
  lockCartUntilPayment,
  removeCartItemThunk,
  setScheduledTime,
  updateCartItemThunk,
  updateCartMetaThunk,
} from "../../redux/cartSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";

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

function formatScheduledPreview(value?: string | null) {
  if (!value) return "No schedule slot selected yet.";
  const dt = parseScheduledDateTime(value);
  if (!dt) return "No schedule slot selected yet.";
  return `Selected slot: ${dt.toLocaleString()}`;
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

type BookingMode = "INSTANT" | "SCHEDULED";
const INSTANT_SERVICE_WINDOW_MINUTES = 30;

function getInstantIsoTime() {
  return new Date(Date.now() + INSTANT_SERVICE_WINDOW_MINUTES * 60 * 1000).toISOString();
}

export function CartCrudScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
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
  const locationSelectedAddress = useAppSelector((s) => (s.location as any)?.selectedAddress ?? null);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [attemptedCheckout, setAttemptedCheckout] = useState(false);
  const [openTimePickerKey, setOpenTimePickerKey] = useState(0);
  const [bookingMode, setBookingMode] = useState<BookingMode>(CART_CONFIG.defaultMode);
  const didInitModeFromCart = useRef(false);

  useEffect(() => {
    dispatch(fetchCustomerCartThunk());
    dispatch(fetchCustomerAddressesThunk());
  }, [dispatch]);

  useFocusEffect(
    useCallback(
      () => {
        dispatch(fetchCustomerCartThunk());
        dispatch(fetchCustomerAddressesThunk());
        return undefined;
      },
      [dispatch],
    ),
  );

  const selectedAddress = useMemo(
    () => addresses.find((row) => Number(row.id) === Number(selectedAddressId)) ?? null,
    [addresses, selectedAddressId],
  );
  const bookingLocationText = useMemo(() => {
    const fromSelected = toReadableAddress(selectedAddress);
    if (fromSelected) return fromSelected;
    const fromLocation = toReadableAddress(locationSelectedAddress);
    if (fromLocation) return fromLocation;
    return "";
  }, [locationSelectedAddress, selectedAddress]);

  const itemTotal = useMemo(
    () => Number(apiItemTotal || items.reduce((sum, item) => sum + Number(item.totalPrice || item.price || 0), 0)),
    [apiItemTotal, items],
  );
  const totalTaxAndFees = useMemo(() => Number(gstAmount || 0) + Number(serviceFee || 0) + Number(taxAmount || 0), [gstAmount, serviceFee, taxAmount]);
  const toPay = useMemo(() => Number(apiToPay || grandTotal || itemTotal + totalTaxAndFees || 0), [apiToPay, grandTotal, itemTotal, totalTaxAndFees]);
  const totalSaved = useMemo(() => Math.max(0, Number(apiTotalSaved || 0)), [apiTotalSaved]);
  const bookingContactName = (contactName || authUser?.name || "Contact").trim();
  const bookingContactPhone = (contactPhone || authUser?.mobile || "").trim();
  const displayPhone = bookingContactPhone;
  const hasConfirmedScheduledSlot = bookingMode === "SCHEDULED" && Boolean(scheduledTime);
  const ctaLabel = hasConfirmedScheduledSlot ? `Pay now | ${formatCurrency(toPay, currency)}` : CART_CONFIG.actions.bookNow;

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

  const selectBookingMode = (nextMode: BookingMode) => {
    setBookingMode(nextMode);
    setAttemptedCheckout(false);
    if (nextMode === "INSTANT") {
      const instantIso = getInstantIsoTime();
      dispatch(setScheduledTime(instantIso));
      updateMetaIfReady(selectedAddressId, instantIso);
      return;
    }
    dispatch(setScheduledTime(null));
    setOpenTimePickerKey((v) => v + 1);
  };

  const handleCheckout = async () => {
    if (hasConfirmedScheduledSlot) {
      if (!selectedAddressId || items.length === 0) {
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
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[cart:paynow:scheduled:input]", {
            scheduledTime,
            parsedDateKey: dateKey,
            selectedSlotStart,
            selectedAddressId,
            cartId,
          });
        }
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
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[cart:paynow:scheduled:slot-verify]", {
              dateKey,
              selectedSlotStart,
              slotsCount: slots.length,
              matched: Boolean(exact),
              matchedRow: exact?.row ?? null,
            });
          }

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
        const booking = await createBooking({
          serviceId: String(firstServiceId),
          addressId: String(selectedAddressId),
          date: bookingWindow.date,
          slot: bookingWindow.slot,
          note: "Payment pending from customer app",
        });
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[cart:paynow:scheduled:createBooking:success]", {
            payload: {
              serviceId: String(firstServiceId),
              addressId: String(selectedAddressId),
              date: bookingWindow.date,
              slot: bookingWindow.slot,
            },
            booking,
          });
        }
        const bookingId = (booking as any)?.data?.id ?? (booking as any)?.id ?? null;
        if (!bookingId) {
          Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Unable to start payment. Booking id missing.");
          return;
        }
        dispatch(lockCartUntilPayment({ bookingId: String(bookingId) }));
        navigation.navigate("Payment", {
          bookingId: String(bookingId),
          cartId,
          amount: toPay,
          currency,
          postPaymentRoute: "BookingPaymentConfirm",
        });
      } catch (e: any) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[cart:paynow:scheduled:createBooking:error]", {
            scheduledTime,
            selectedAddressId,
            cartId,
            message: String(e?.message ?? ""),
          });
        }
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, readableBookingError(e?.message ?? CART_CONFIG.messages.bookingErrorFallback));
      }
      return;
    }

    let effectiveScheduledTime = scheduledTime;
    if (bookingMode === "INSTANT" && !effectiveScheduledTime) {
      effectiveScheduledTime = getInstantIsoTime();
      dispatch(setScheduledTime(effectiveScheduledTime));
      updateMetaIfReady(selectedAddressId, effectiveScheduledTime);
    }
    if (!effectiveScheduledTime) {
      setAttemptedCheckout(true);
      if (bookingMode === "SCHEDULED") {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please choose and confirm a schedule slot.");
      } else {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select Instant booking.");
      }
      if (bookingMode === "SCHEDULED") {
        setOpenTimePickerKey((v) => v + 1);
      }
      return;
    }
    if (!selectedAddressId || items.length === 0) {
      if (items.length === 0) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Cart is empty. Please add service first.");
      } else if (!selectedAddressId) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, "Please select address before booking.");
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
            return diffMins <= INSTANT_SERVICE_WINDOW_MINUTES;
          });
          if (bookingMode === "INSTANT" && !selectedFromApi) {
            Alert.alert(
              "Instant unavailable",
              `No partner slot available within ${INSTANT_SERVICE_WINDOW_MINUTES} minutes. Please choose Scheduled.`,
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
      const booking = await createBooking({
        serviceId: String(firstServiceId),
        addressId: String(selectedAddressId),
        date: bookingWindow.date,
        slot: bookingWindow.slot,
        note:
          bookingMode === "INSTANT"
            ? `Instant booking requested (within ${INSTANT_SERVICE_WINDOW_MINUTES} mins)`
            : "Booking from customer app",
      });
      const bookingId = (booking as any)?.data?.id ?? (booking as any)?.id ?? null;
      setSnackMessage(bookingId ? `${CART_CONFIG.messages.bookingSuccess} ID: ${bookingId}` : CART_CONFIG.messages.bookingSuccess);
      setSnackVisible(true);
      dispatch(fetchCustomerCartThunk());
      if (bookingMode === "INSTANT" && bookingId) {
        navigation.navigate("InstantBookingStatus", { bookingId: String(bookingId) });
      } else if (bookingMode === "SCHEDULED" && bookingId) {
        navigation.navigate("ScheduledBookingStatus", { bookingId: String(bookingId) });
      } else if (bookingId) {
        navigation.navigate("Main", { screen: "Bookings" });
      } else {
        navigation.navigate("Main", { screen: "Bookings" });
      }
    } catch (e: any) {
      Alert.alert(CART_CONFIG.messages.bookingFailedTitle, readableBookingError(e?.message ?? CART_CONFIG.messages.bookingErrorFallback));
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {loading ? <Text style={styles.info}>{CART_CONFIG.messages.loadCartFailed}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{CART_CONFIG.sectionLabels.reviewBooking}</Text>
          <Text style={styles.sectionMeta}>{items.length} services</Text>
        </View>

        <View style={styles.card}>
          {items.length > 0 ? (
            <>
              {items.map((item) => (
                <View key={String(item.itemId)} style={styles.serviceRow}>
                  <View style={styles.serviceLeft}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <MaterialCommunityIcon name="briefcase-outline" size={20} color={palette.mutedSoft} />
                      </View>
                    )}
                    <View style={styles.serviceTextWrap}>
                      <Text style={styles.serviceName}>{item.name}</Text>
                      <Text style={styles.priceNow}>{formatCurrency(item.price, currency)}</Text>
                    </View>
                  </View>
                  <View style={styles.qtyBox}>
                    <Pressable
                      onPress={() => dispatch(updateCartItemThunk({ itemId: item.itemId, quantity: Math.max(1, Number(item.quantity) - 1) }))}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease quantity for ${item.name}`}
                    >
                      <Text style={styles.qtyControl}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => dispatch(updateCartItemThunk({ itemId: item.itemId, quantity: Math.max(1, Number(item.quantity) + 1) }))}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase quantity for ${item.name}`}
                    >
                      <Text style={styles.qtyControl}>+</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => dispatch(removeCartItemThunk(item.itemId))}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name} from cart`}
                    style={styles.deleteIconBtn}
                  >
                    <MaterialCommunityIcon name="trash-can-outline" size={20} color={palette.danger} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.divider} />
              <Pressable onPress={() => navigation.navigate("ServiceList")}>
                <Text style={styles.addMore}>{CART_CONFIG.sectionLabels.addMore}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyInline}>{CART_CONFIG.messages.cartEmptySubtitle}</Text>
          )}
        </View>

        <View style={styles.couponCard}>
          <Text style={styles.couponText}>{CART_CONFIG.sectionLabels.coupons}</Text>
          <MaterialCommunityIcon name="chevron-right" size={24} color={palette.iconSoft} />
        </View>

        <Text style={styles.sectionTitle}>{CART_CONFIG.sectionLabels.bookingDetails}</Text>
        <View style={styles.card}>
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

        <Text style={styles.sectionTitle}>When do you need it?</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeBtn, bookingMode === "INSTANT" && styles.modeBtnActive]}
            onPress={() => selectBookingMode("INSTANT")}
            accessibilityRole="button"
            accessibilityLabel={CART_CONFIG.actions.instant}
          >
            <Text style={[styles.modeBtnText, bookingMode === "INSTANT" && styles.modeBtnTextActive]}>{CART_CONFIG.actions.instant}</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, bookingMode === "SCHEDULED" && styles.modeBtnActive]}
            onPress={() => selectBookingMode("SCHEDULED")}
            accessibilityRole="button"
            accessibilityLabel={CART_CONFIG.actions.scheduled}
          >
            <Text style={[styles.modeBtnText, bookingMode === "SCHEDULED" && styles.modeBtnTextActive]}>{CART_CONFIG.actions.scheduled}</Text>
          </Pressable>
        </View>

        {bookingMode === "SCHEDULED" ? (
          <>
            <View style={styles.scheduleSummaryCard}>
              <View style={styles.scheduleSummaryHead}>
                <MaterialCommunityIcon name="calendar-clock-outline" size={18} color={palette.successText} />
                <Text style={styles.scheduleSummaryLabel}>Selected slot</Text>
              </View>
              <Text style={styles.scheduleSummaryValue}>{scheduledTime ? new Date(scheduledTime).toLocaleDateString() : "No date selected"}</Text>
              <Text style={styles.scheduleSummarySubValue}>{scheduledTime ? new Date(scheduledTime).toLocaleTimeString() : "Choose a preferred start time"}</Text>
            </View>
            <TimePicker
              value={scheduledTime}
              loadSlots={getAvailableTimeSlots}
              showError={attemptedCheckout && !scheduledTime}
              openRequestKey={openTimePickerKey}
              hideTrigger
              infoText={CART_CONFIG.slotInfoText}
              dateWindowDays={CART_CONFIG.slotDateWindowDays}
              onChange={(isoTime) => {
                dispatch(setScheduledTime(isoTime));
                setAttemptedCheckout(false);
                updateMetaIfReady(selectedAddressId, isoTime);
              }}
            />
          </>
        ) : null}

        <Text style={styles.sectionTitle}>{CART_CONFIG.sectionLabels.billDetails}</Text>
        <View style={styles.card}>
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
          style={[styles.primaryBtn, items.length === 0 && styles.primaryBtnDisabled]}
          onPress={handleCheckout}
          disabled={items.length === 0}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
        </Pressable>
      </View>

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2600}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.md },
  info: { color: palette.muted },
  error: { color: palette.danger, fontWeight: "600" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: palette.text, fontFamily: FONT?.bold },
  sectionMeta: { fontSize: 14, fontWeight: "800", color: palette.text, fontFamily: FONT?.semibold },
  card: {
    borderRadius: 18,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    padding: 14,
    gap: 12,
  },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  thumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#E9F7F0",
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
  serviceName: { fontSize: 15, fontWeight: "800", color: palette.text, fontFamily: FONT?.bold },
  priceNow: { fontSize: 13, fontWeight: "900", color: palette.text, marginTop: 4, fontFamily: FONT?.bold },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: palette.success,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: palette.successSoft,
  },
  qtyControl: { fontSize: 22, color: palette.success, fontWeight: "900", lineHeight: 22 },
  qtyValue: { fontSize: 17, color: palette.successText, fontWeight: "900", minWidth: 20, textAlign: "center" },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },
  emptyInline: { color: palette.muted, fontSize: 14, fontWeight: "600", textAlign: "center", paddingVertical: 8 },
  divider: { height: 1, backgroundColor: palette.border },
  addMore: { textAlign: "center", color: palette.success, fontSize: 14, fontWeight: "800", fontFamily: FONT?.bold },
  couponCard: {
    borderRadius: 16,
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
  detailTitle: { color: palette.text, fontSize: 15, fontWeight: "900", fontFamily: FONT?.bold },
  selectedBadge: {
    color: palette.white,
    backgroundColor: palette.success,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  detailValue: { color: palette.muted, fontSize: 14, fontWeight: "600", marginTop: 3, fontFamily: FONT?.regular },
  inlineError: { color: palette.danger, fontWeight: "700", fontSize: 12, marginTop: -6 },
  billTop: { gap: 4 },
  billToPay: { color: palette.text, fontSize: 20, fontWeight: "900", fontFamily: FONT?.bold },
  billSaved: { color: "#3B82F6", fontSize: 13, fontWeight: "800", fontFamily: FONT?.semibold },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  billLabel: { color: palette.text, fontSize: 15, fontWeight: "700", fontFamily: FONT?.semibold },
  billValue: { color: palette.text, fontSize: 15, fontWeight: "800", fontFamily: FONT?.bold },
  billLabelStrong: { color: palette.text, fontSize: 17, fontWeight: "900", fontFamily: FONT?.bold },
  billValueStrong: { color: palette.text, fontSize: 17, fontWeight: "900", fontFamily: FONT?.bold },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    borderRadius: 14,
    backgroundColor: palette.card,
    paddingVertical: 11,
    alignItems: "center",
  },
  modeBtnActive: {
    borderColor: palette.success,
    backgroundColor: palette.successSoft,
  },
  modeBtnText: { color: palette.text, fontSize: 14, fontWeight: "800", fontFamily: FONT?.semibold },
  modeBtnTextActive: { color: palette.successText, fontFamily: FONT?.bold },
  scheduleSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.success,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  scheduleSummaryHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  scheduleSummaryLabel: { color: palette.successText, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  scheduleSummaryValue: { color: palette.text, fontSize: 16, fontWeight: "900", fontFamily: FONT?.bold },
  scheduleSummarySubValue: { color: "#475569", fontSize: 13, fontWeight: "700", fontFamily: FONT?.semibold },
  schedulePreview: { color: palette.muted, fontSize: 13, fontWeight: "700", marginTop: -2 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 12,
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.borderSoft,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  primaryBtn: {
    borderRadius: 16,
    backgroundColor: palette.success,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: palette.white, fontSize: 16, fontWeight: "900", fontFamily: FONT?.bold },
});

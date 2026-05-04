import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
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
  removeCartItemThunk,
  setScheduledTime,
  updateCartItemThunk,
  updateCartMetaThunk,
} from "../../redux/cartSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";

type BookingMode = "INSTANT" | "SCHEDULED";
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

export function CartCrudScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {
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
    updating,
    error,
  } = useAppSelector((s) => s.cart);
  const authUser = useAppSelector((s) => s.auth.user);

  const [mode, setMode] = useState<BookingMode>(scheduledTime ? "SCHEDULED" : CART_CONFIG.defaultMode);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [attemptedCheckout, setAttemptedCheckout] = useState(false);
  const [openTimePickerKey, setOpenTimePickerKey] = useState(0);

  useEffect(() => {
    dispatch(fetchCustomerCartThunk());
    dispatch(fetchCustomerAddressesThunk());
  }, [dispatch]);

  const selectedAddress = useMemo(
    () => addresses.find((row) => Number(row.id) === Number(selectedAddressId)) ?? null,
    [addresses, selectedAddressId],
  );

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

  const canCheckout = Boolean(selectedAddressId && (mode === "INSTANT" || scheduledTime) && items.length > 0);

  useEffect(() => {
    if (scheduledTime && mode !== "SCHEDULED") setMode("SCHEDULED");
  }, [scheduledTime, mode]);

  const updateMetaIfReady = (nextAddressId: number | null, nextScheduledTime: string | null) => {
    if (!nextAddressId || !nextScheduledTime) return;
    dispatch(updateCartMetaThunk({ addressId: nextAddressId, scheduledTime: nextScheduledTime }));
  };

  const handleCheckout = async () => {
    if (mode === "SCHEDULED" && !scheduledTime) {
      setAttemptedCheckout(true);
      setOpenTimePickerKey((v) => v + 1);
      return;
    }
    if (!canCheckout || !selectedAddressId || items.length === 0) {
      setAttemptedCheckout(true);
      return;
    }
    try {
      const firstServiceId = Number(items[0]?.serviceId ?? 0);
      if (!firstServiceId) {
        Alert.alert(CART_CONFIG.messages.bookingFailedTitle, CART_CONFIG.messages.missingServiceId);
        return;
      }
      const booking = await createBooking({
        serviceId: String(firstServiceId),
        addressId: String(selectedAddressId),
        slot: scheduledTime || new Date().toISOString(),
      });
      const bookingId = (booking as any)?.data?.id ?? (booking as any)?.id ?? null;
      setSnackMessage(bookingId ? `${CART_CONFIG.messages.bookingSuccess} ID: ${bookingId}` : CART_CONFIG.messages.bookingSuccess);
      setSnackVisible(true);
      dispatch(fetchCustomerCartThunk());
      navigation.navigate("Main", { screen: "Bookings" });
    } catch (e: any) {
      Alert.alert(CART_CONFIG.messages.bookingFailedTitle, e?.message ?? CART_CONFIG.messages.bookingErrorFallback);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {loading ? <Text style={styles.info}>{CART_CONFIG.messages.loadCartFailed}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.modeWrap}>
          <Pressable
            style={[styles.modeBtn, mode === "INSTANT" && styles.modeBtnActive]}
            onPress={() => setMode("INSTANT")}
            accessibilityRole="button"
            accessibilityLabel={`Set booking mode to ${CART_CONFIG.actions.instant}`}
          >
            <Text style={[styles.modeText, mode === "INSTANT" && styles.modeTextActive]}>{CART_CONFIG.actions.instant}</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === "SCHEDULED" && styles.modeBtnActive]}
            onPress={() => setMode("SCHEDULED")}
            accessibilityRole="button"
            accessibilityLabel={`Set booking mode to ${CART_CONFIG.actions.scheduled}`}
          >
            <Text style={[styles.modeText, mode === "SCHEDULED" && styles.modeTextActive]}>{CART_CONFIG.actions.scheduled}</Text>
          </Pressable>
        </View>

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
          <Pressable style={styles.detailRow} onPress={() => {}}>
            <MaterialCommunityIcon name="map-marker-outline" size={28} color={palette.icon} />
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailTitle}>{CART_CONFIG.sectionLabels.location}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {selectedAddress ? `${selectedAddress.fullAddress}${selectedAddress.city ? `, ${selectedAddress.city}` : ""}${selectedAddress.pincode ? `, ${selectedAddress.pincode}` : ""}` : CART_CONFIG.sectionLabels.selectAddress}
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

        <View style={styles.hiddenPicker}>
          <TimePicker
            value={scheduledTime}
            loadSlots={getAvailableTimeSlots}
            showError={attemptedCheckout && mode === "SCHEDULED"}
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
        </View>
      </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(2, insets.bottom), paddingTop: 6 }]}>
        <Pressable
          style={[styles.primaryBtn, (updating || items.length === 0) && styles.primaryBtnDisabled]}
          onPress={mode === "SCHEDULED" ? () => setOpenTimePickerKey((v) => v + 1) : handleCheckout}
          disabled={updating || items.length === 0}
          accessibilityRole="button"
          accessibilityLabel={mode === "SCHEDULED" ? "Open time slot selector" : CART_CONFIG.actions.bookNow}
        >
          <Text style={styles.primaryBtnText}>{mode === "SCHEDULED" ? CART_CONFIG.actions.selectTimeSlot : CART_CONFIG.actions.bookNow}</Text>
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
  modeWrap: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: palette.card,
    padding: 5,
  },
  modeBtn: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  modeBtnActive: { backgroundColor: "#0B4C33" },
  modeText: { color: palette.text, fontWeight: "800", fontSize: 15, fontFamily: FONT?.bold },
  modeTextActive: { color: palette.white },
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
  detailTitle: { color: palette.text, fontSize: 15, fontWeight: "900", fontFamily: FONT?.bold },
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
  hiddenPicker: { height: 0, overflow: "hidden" },
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

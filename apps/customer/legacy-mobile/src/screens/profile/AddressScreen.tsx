import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Card, Snackbar, Text } from "react-native-paper";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { deleteAddressThunk, fetchAllAddressesThunk, setCurrentAddressLocal, setDefaultAddressThunk, setSelectedAddressLocal } from "../../redux/locationSlice";
import { fetchCustomerAddressesThunk, setSelectedAddressId, updateCartMetaThunk } from "../../redux/cartSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { resolveUserIdFromAuth } from "../../utils/authUser";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

function formatAddressLine(row: any) {
  const parts = [
    row?.flatNo,
    row?.floor ? `Floor ${row.floor}` : "",
    row?.buildingName,
    row?.landmark ? `Near ${row.landmark}` : "",
    row?.addressLine,
    row?.area,
    row?.sector,
    row?.city,
    row?.state,
    row?.country,
    row?.pincode,
  ]
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
  if (parts.length === 0) return "Address not available";
  return parts.join(", ");
}

function toReadableError(error: any, fallback: string) {
  return String(error?.message ?? fallback);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function AddressScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const authToken = useAppSelector((s) => s.auth.token ?? "");
  const cartScheduledTime = useAppSelector((s) => s.cart.scheduledTime);
  const cartSelectedAddressId = useAppSelector((s) => s.cart.selectedAddressId);
  const cartAddresses = useAppSelector((s) => s.cart.addresses);
  const locationState = useAppSelector((s) => s.location as any);
  const currentAddressId = String(locationState?.currentAddress?.id ?? "");
  const savedAddresses = Array.isArray(locationState?.savedAddresses) ? locationState.savedAddresses : [];
  const loading = Boolean(locationState?.loading || locationState?.saving);
  const error = locationState?.error ? String(locationState.error) : null;
  const [snack, setSnack] = useState<string | null>(null);

  const locationUserId = useMemo(
    () => resolveUserIdFromAuth(authUserId, String(authToken).trim()),
    [authToken, authUserId],
  );

  useEffect(() => {
    if (Number.isFinite(locationUserId) && locationUserId > 0) {
      void dispatch(fetchAllAddressesThunk({ userId: locationUserId }));
    }
  }, [dispatch, locationUserId]);

  const onSetDefault = async (addressId: string | number) => {
    try {
      if (!Number.isFinite(locationUserId) || locationUserId <= 0) throw new Error("Login required");
      await dispatch(setDefaultAddressThunk({ userId: locationUserId, addressId })).unwrap();
      setSnack("Default address updated");
    } catch (e: any) {
      setSnack(toReadableError(e, "Failed to set default address"));
    }
  };

  const onDelete = async (addressId: string | number) => {
    try {
      if (!Number.isFinite(locationUserId) || locationUserId <= 0) throw new Error("Login required");
      await dispatch(deleteAddressThunk({ userId: locationUserId, addressId })).unwrap();
      setSnack("Address deleted");
    } catch (e: any) {
      setSnack(toReadableError(e, "Failed to delete address"));
    }
  };

  const onSelectForCart = async (addressId: string | number) => {
    const sourceAddress = savedAddresses.find((row: any) => String(row?.id ?? "") === String(addressId ?? ""));
    const sourceText = normalizeText(formatAddressLine(sourceAddress));
    let mappedCartAddressId: number | null = null;

    const rawSelectedId = Number(addressId ?? 0);
    if (Number.isFinite(rawSelectedId) && rawSelectedId > 0) {
      const direct = cartAddresses.find((row: any) => Number(row?.id ?? 0) === rawSelectedId);
      if (direct?.id != null) mappedCartAddressId = Number(direct.id);
    }

    if (Array.isArray(cartAddresses) && cartAddresses.length > 0) {
      const exact = cartAddresses.find((row: any) => normalizeText(`${row?.fullAddress ?? ""} ${row?.city ?? ""} ${row?.pincode ?? ""}`) === sourceText);
      if (exact?.id != null) mappedCartAddressId = Number(exact.id);
      if (!mappedCartAddressId) {
        const fuzzy = cartAddresses.find((row: any) => {
          const target = normalizeText(`${row?.fullAddress ?? ""} ${row?.city ?? ""} ${row?.pincode ?? ""}`);
          const hasLine = sourceText.length > 0 && (target.includes(sourceText) || sourceText.includes(target));
          const hasPin = String(sourceAddress?.pincode ?? "").trim().length > 0 && String(row?.pincode ?? "").trim() === String(sourceAddress?.pincode ?? "").trim();
          return hasLine || hasPin;
        });
        if (fuzzy?.id != null) mappedCartAddressId = Number(fuzzy.id);
      }
    }

    if (!mappedCartAddressId || !Number.isFinite(mappedCartAddressId) || mappedCartAddressId <= 0) {
      const refreshedCartAddresses = (await dispatch(fetchCustomerAddressesThunk()).unwrap().catch(() => [])) as any[];
      const directAfterRefresh = refreshedCartAddresses.find((row: any) => Number(row?.id ?? 0) === rawSelectedId);
      if (directAfterRefresh?.id != null) mappedCartAddressId = Number(directAfterRefresh.id);
      const fallback = refreshedCartAddresses.find((row: any) => {
        const target = normalizeText(`${row?.fullAddress ?? ""} ${row?.city ?? ""} ${row?.pincode ?? ""}`);
        return sourceText.length > 0 && (target.includes(sourceText) || sourceText.includes(target));
      });
      if (!mappedCartAddressId && fallback?.id != null) mappedCartAddressId = Number(fallback.id);
    }

    if (!mappedCartAddressId || !Number.isFinite(mappedCartAddressId) || mappedCartAddressId <= 0) {
      setSnack("Unable to map selected address to booking address. Please open cart once and retry.");
      return;
    }

    dispatch(setSelectedAddressId(mappedCartAddressId));
    if (sourceAddress) {
      dispatch(
        setCurrentAddressLocal({
          ...sourceAddress,
          id: String(sourceAddress?.id ?? ""),
          label: String(sourceAddress?.label ?? "OTHER").toUpperCase(),
          addressLine: formatAddressLine(sourceAddress),
        } as any),
      );
      dispatch(
        setSelectedAddressLocal({
          ...sourceAddress,
          id: String(sourceAddress?.id ?? ""),
          label: String(sourceAddress?.label ?? "OTHER").toUpperCase(),
          addressLine: formatAddressLine(sourceAddress),
        } as any),
      );
    }
    if (cartScheduledTime) {
      try {
        await dispatch(updateCartMetaThunk({ addressId: mappedCartAddressId, scheduledTime: cartScheduledTime })).unwrap();
      } catch {
        // keep local selection even if cart meta patch fails
      }
    }
    setSnack("Address selected for booking");
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={() => navigation.navigate("AddAddressDetails")}>
        <MaterialCommunityIcon name="plus-circle-outline" size={18} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Add New Address</Text>
      </TouchableOpacity>

      {loading ? <SkeletonList rows={3} /> : null}
      {!loading && savedAddresses.length === 0 ? (
        <EmptyStateCard title="No addresses yet" subtitle="Add your first address to continue." />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={savedAddresses}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const id = String(item?.id ?? "");
          const isDefaultAddress = id.length > 0 && id === currentAddressId;
          const isCartSelected = Number(id || 0) > 0 && Number(id) === Number(cartSelectedAddressId);
          const isSelected = isCartSelected || isDefaultAddress;
          return (
            <Card style={[styles.itemCard, isSelected ? styles.itemCardSelected : null]} onPress={() => void onSelectForCart(id)}>
              <Card.Content>
                <View style={styles.itemHead}>
                  <View style={styles.labelChip}>
                    <MaterialCommunityIcon name="map-marker" size={14} color="#E0F2FE" />
                    <Text style={styles.labelChipText}>{String(item?.label ?? "Address").toUpperCase()}</Text>
                  </View>
                  {isCartSelected ? <Text style={styles.selectedPill}>Selected</Text> : null}
                </View>
                <Text style={styles.itemLine}>{formatAddressLine(item)}</Text>
                <View style={styles.actions}>
                  <Button compact mode="contained-tonal" buttonColor={isCartSelected ? "#0EA5E9" : "#1D4ED8"} textColor="#E0F2FE" onPress={() => void onSelectForCart(id)} disabled={id.length === 0}>
                    {isCartSelected ? "Selected for Booking" : "Select"}
                  </Button>
                  <Button compact mode="text" textColor="#93C5FD" onPress={() => void onSetDefault(id)} disabled={isSelected || id.length === 0}>
                    {isSelected ? "Default" : "Set Default"}
                  </Button>
                  <Button compact mode="text" textColor="#FCA5A5" onPress={() => void onDelete(id)} disabled={id.length === 0}>
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        }}
      />

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)}>
        {snack ?? ""}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 10, backgroundColor: "#ECFDF5" },
  addBtn: {
    marginBottom: 6,
    borderRadius: 999,
    backgroundColor: "#0F766E",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: 0.2 },
  listContent: { paddingBottom: 18 },
  itemCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1E3A5F",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  itemCardSelected: { borderColor: "#38BDF8", backgroundColor: "#0B1730" },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1E3A8A",
  },
  labelChipText: { color: "#E0F2FE", fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },
  selectedPill: {
    color: "#022C22",
    backgroundColor: "#86EFAC",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "800",
    fontSize: 12,
  },
  itemLine: { color: "#D6E4FF", marginTop: 2, fontSize: 17, fontWeight: "600", lineHeight: 28 },
  actions: { flexDirection: "row", marginTop: 8, justifyContent: "space-between" },
  error: { color: "#DC2626" },
});

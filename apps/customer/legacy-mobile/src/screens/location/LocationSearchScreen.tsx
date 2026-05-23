import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Searchbar, Snackbar, Text } from "react-native-paper";
import { AddressCard } from "../../components/AddressCard";
import { LocationAddressShimmer } from "../../components/location/LocationAddressShimmer";
import { setSelectedAddressId } from "../../redux/cartSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { deleteAddressThunk, fetchAllAddressesThunk, setCurrentAddressLocal, setDefaultAddressThunk, setServiceAvailable, updateLocationAndSyncThunk } from "../../redux/locationSlice";
import { checkServiceability, searchLocations } from "../../services/locationService";
import { resolveUserIdFromAuth } from "../../utils/authUser";

function toReadableError(error: any, fallback: string) {
  const text = String(error?.message ?? fallback);
  if (text.toLowerCase().includes("request conflicts with existing data")) {
    return "Address already exists. Please choose another address or edit existing.";
  }
  return text;
}

function formatAddressLine(row: any) {
  const pieces = [
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
    .map((x) => String(x ?? "").trim())
    .filter((x) => x.length > 0);
  if (pieces.length === 0) return "Address not available";
  return pieces.join(", ");
}

function getSearchScore(row: any, queryText: string) {
  const q = String(queryText ?? "").trim().toLowerCase();
  if (!q) return 0;

  const city = String(row?.city ?? "").toLowerCase();
  const state = String(row?.state ?? "").toLowerCase();
  const area = String(row?.area ?? "").toLowerCase();
  const pincode = String(row?.pincode ?? row?.postalCode ?? "").toLowerCase();
  const line = formatAddressLine(row).toLowerCase();

  if (city === q) return 1000;
  if (city.startsWith(q)) return 900;
  if (line.startsWith(q)) return 820;
  if (area.startsWith(q)) return 760;
  if (state.startsWith(q)) return 700;
  if (pincode.startsWith(q)) return 680;
  if (city.includes(q)) return 620;
  if (area.includes(q)) return 560;
  if (state.includes(q)) return 520;
  if (line.includes(q)) return 460;
  return 0;
}

export function LocationSearchScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const authToken = useAppSelector((s) => s.auth.token ?? "");
  const { currentAddress, savedAddresses, loading, error, serviceAvailable } = useAppSelector((s) => s.location as any);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [apiSearchRows, setApiSearchRows] = useState<any[]>([]);
  const queryCacheRef = useRef<Record<string, any[]>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchServiceability, setSearchServiceability] = useState<Record<string, "checking" | "serviceable" | "not_serviceable">>({});
  const [apiSearching, setApiSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const locationUserId = useMemo(() => resolveUserIdFromAuth(authUserId, String(authToken).trim()), [authToken, authUserId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 120);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!debouncedQuery) {
        setApiSearchRows([]);
        setApiSearching(false);
        setSearchError(null);
        return;
      }
      const cached = queryCacheRef.current[debouncedQuery];
      if (Array.isArray(cached) && cached.length > 0) {
        setApiSearchRows(cached);
      }
      setApiSearching(true);
      setSearchError(null);
      try {
        const rows = await searchLocations(debouncedQuery);
        if (!cancelled) {
          const nextRows = Array.isArray(rows) ? rows : [];
          setApiSearchRows(nextRows);
          queryCacheRef.current[debouncedQuery] = nextRows;
        }
      } catch (e: any) {
        if (!cancelled) {
          setApiSearchRows([]);
          setSearchError(String(e?.message ?? "Unable to search locations right now"));
        }
      } finally {
        if (!cancelled) setApiSearching(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!debouncedQuery || apiSearchRows.length === 0) {
        setSearchServiceability({});
        return;
      }

      const rows = apiSearchRows.slice(0, 12);
      const next: Record<string, "checking" | "serviceable" | "not_serviceable"> = {};
      rows.forEach((row: any, idx: number) => {
        const key = String(row?.id ?? row?.addressId ?? `search-${idx}`);
        next[key] = "checking";
      });
      setSearchServiceability(next);

      await Promise.all(
        rows.map(async (row: any, idx: number) => {
          const key = String(row?.id ?? row?.addressId ?? `search-${idx}`);
          const lat = Number(row?.latitude ?? row?.lat ?? 0);
          const lng = Number(row?.longitude ?? row?.lng ?? 0);
          const pincode = String(row?.pincode ?? row?.postalCode ?? "").trim();

          if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
            if (!cancelled) {
              setSearchServiceability((prev) => ({ ...prev, [key]: "not_serviceable" }));
            }
            return;
          }

          try {
            const serviceability = await checkServiceability({ latitude: lat, longitude: lng, pincode });
            const available = isServiceable(serviceability?.data ?? serviceability);
            if (!cancelled) {
              setSearchServiceability((prev) => ({ ...prev, [key]: available ? "serviceable" : "not_serviceable" }));
            }
          } catch {
            if (!cancelled) {
              setSearchServiceability((prev) => ({ ...prev, [key]: "not_serviceable" }));
            }
          }
        }),
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiSearchRows, debouncedQuery]);

  useEffect(() => {
    if (Number.isFinite(locationUserId) && locationUserId > 0) {
      void dispatch(fetchAllAddressesThunk({ userId: locationUserId }));
    }
  }, [dispatch, locationUserId]);

  const retryAddressFetch = async () => {
    if (!Number.isFinite(locationUserId) || locationUserId <= 0) {
      setSnack("Login required");
      return;
    }
    try {
      setActionLoading(true);
      await dispatch(fetchAllAddressesThunk({ userId: locationUserId })).unwrap();
      setSnack("Addresses refreshed");
    } catch (e: any) {
      setSnack(toReadableError(e, "Unable to refresh addresses"));
    } finally {
      setActionLoading(false);
    }
  };

  const onSetDefault = async (addressId: string | number, selectedRow?: any) => {
    try {
      setActionLoading(true);
      if (!Number.isFinite(locationUserId) || locationUserId <= 0) throw new Error("Login required");
      const numericAddressId = Number(addressId);

      if (selectedRow) {
        dispatch(
          setCurrentAddressLocal({
            id: String(selectedRow?.id ?? addressId),
            label: String(selectedRow?.label ?? selectedRow?.type ?? "HOME").toUpperCase(),
            addressLine: formatAddressLine(selectedRow),
            city: String(selectedRow?.city ?? ""),
            state: String(selectedRow?.state ?? ""),
            country: String(selectedRow?.country ?? ""),
            pincode: String(selectedRow?.pincode ?? ""),
            latitude: Number(selectedRow?.latitude ?? selectedRow?.lat ?? 0),
            longitude: Number(selectedRow?.longitude ?? selectedRow?.lng ?? 0),
            isDefault: true,
          } as any),
        );
      }

      if (Number.isFinite(numericAddressId) && numericAddressId > 0) {
        dispatch(setSelectedAddressId(numericAddressId));
      }

      setSnack("Address selected");
      tryNavigateMainIfAvailable();

      // Keep server default in sync, but don't block UX navigation.
      void dispatch(setDefaultAddressThunk({ userId: locationUserId, addressId }));
    } catch (e: any) {
      setSnack(toReadableError(e, "Failed to set default address"));
    } finally {
      setActionLoading(false);
    }
  };

  const onDeleteAddress = async (addressId: string | number) => {
    try {
      setActionLoading(true);
      if (!Number.isFinite(locationUserId) || locationUserId <= 0) throw new Error("Login required");
      await dispatch(deleteAddressThunk({ userId: locationUserId, addressId })).unwrap();
      setSnack("Address deleted");
    } catch (e: any) {
      setSnack(toReadableError(e, "Failed to delete address"));
    } finally {
      setActionLoading(false);
    }
  };

  const onSelectSearchLocation = async (row: any) => {
    try {
      setActionLoading(true);
      const lat = Number(row?.latitude ?? row?.lat ?? 0);
      const lng = Number(row?.longitude ?? row?.lng ?? 0);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
        throw new Error("Selected location does not have valid coordinates");
      }
      const pincode = String(row?.pincode ?? row?.postalCode ?? "").trim();
      const serviceability = await checkServiceability({ latitude: lat, longitude: lng, pincode });
      const available = isServiceable(serviceability?.data ?? serviceability);
      dispatch(setServiceAvailable(available));

      dispatch(
        setCurrentAddressLocal({
          id: String(row?.id ?? row?.addressId ?? formatAddressLine(row)),
          label: String(row?.type ?? row?.label ?? row?.customLabel ?? "HOME"),
          addressLine: formatAddressLine(row),
          city: String(row?.city ?? ""),
          state: String(row?.state ?? ""),
          country: String(row?.country ?? ""),
          pincode,
          latitude: lat,
          longitude: lng,
          isDefault: false,
        } as any),
      );
      const selectedId = Number(row?.id ?? row?.addressId ?? 0);
      if (Number.isFinite(selectedId) && selectedId > 0) {
        dispatch(setSelectedAddressId(selectedId));
      }

      if (Number.isFinite(locationUserId) && locationUserId > 0) {
        await dispatch(updateLocationAndSyncThunk({ userId: locationUserId, latitude: lat, longitude: lng })).unwrap();
      }
      setSnack("Location selected");
      tryNavigateMainIfAvailable();
    } catch (e: any) {
      setSnack(toReadableError(e, "Unable to select this location"));
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const rows = Array.isArray(savedAddresses) ? savedAddresses : [];
    return !debouncedQuery
      ? rows
      : rows.filter((row: any) => {
      const line = String(row?.addressLine ?? "").toLowerCase();
      const label = String(row?.label ?? "").toLowerCase();
      return line.includes(debouncedQuery) || label.includes(debouncedQuery);
    });
  }, [debouncedQuery, savedAddresses]);

  const suggestionRows = useMemo(() => {
    const activeQuery = String(query ?? "").trim().toLowerCase();
    if (!activeQuery || activeQuery.length < 1) return [];
    if (apiSearchRows.length > 0) {
      return [...apiSearchRows]
        .sort((a, b) => getSearchScore(b, activeQuery) - getSearchScore(a, activeQuery))
        .slice(0, 10);
    }

    const staticCityFallback = [
      { id: "fallback-indore", addressLine: "Indore, Madhya Pradesh, India", city: "Indore", state: "Madhya Pradesh", country: "India", pincode: "452001", latitude: 22.7196, longitude: 75.8577 },
      { id: "fallback-bhopal", addressLine: "Bhopal, Madhya Pradesh, India", city: "Bhopal", state: "Madhya Pradesh", country: "India", pincode: "462001", latitude: 23.2599, longitude: 77.4126 },
      { id: "fallback-delhi", addressLine: "Delhi, India", city: "Delhi", state: "Delhi", country: "India", pincode: "110001", latitude: 28.6139, longitude: 77.209 },
      { id: "fallback-mumbai", addressLine: "Mumbai, Maharashtra, India", city: "Mumbai", state: "Maharashtra", country: "India", pincode: "400001", latitude: 19.076, longitude: 72.8777 },
      { id: "fallback-bengaluru", addressLine: "Bengaluru, Karnataka, India", city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560001", latitude: 12.9716, longitude: 77.5946 },
      { id: "fallback-hyderabad", addressLine: "Hyderabad, Telangana, India", city: "Hyderabad", state: "Telangana", country: "India", pincode: "500001", latitude: 17.385, longitude: 78.4867 },
      { id: "fallback-chennai", addressLine: "Chennai, Tamil Nadu, India", city: "Chennai", state: "Tamil Nadu", country: "India", pincode: "600001", latitude: 13.0827, longitude: 80.2707 },
      { id: "fallback-kolkata", addressLine: "Kolkata, West Bengal, India", city: "Kolkata", state: "West Bengal", country: "India", pincode: "700001", latitude: 22.5726, longitude: 88.3639 },
      { id: "fallback-pune", addressLine: "Pune, Maharashtra, India", city: "Pune", state: "Maharashtra", country: "India", pincode: "411001", latitude: 18.5204, longitude: 73.8567 },
      { id: "fallback-jaipur", addressLine: "Jaipur, Rajasthan, India", city: "Jaipur", state: "Rajasthan", country: "India", pincode: "302001", latitude: 26.9124, longitude: 75.7873 },
    ];
    const cityMatches = staticCityFallback.filter((row) =>
      String(row.addressLine).toLowerCase().includes(activeQuery),
    );
    if (cityMatches.length > 0) {
      return cityMatches
        .sort((a, b) => getSearchScore(b, activeQuery) - getSearchScore(a, activeQuery))
        .slice(0, 10);
    }

    const localRows = (Array.isArray(savedAddresses) ? savedAddresses : []).filter((row: any) =>
      formatAddressLine(row).toLowerCase().includes(activeQuery),
    );
    return [...localRows]
      .sort((a, b) => getSearchScore(b, activeQuery) - getSearchScore(a, activeQuery))
      .slice(0, 10);
  }, [apiSearchRows, query, savedAddresses]);

  const tryNavigateMainIfAvailable = () => {
    setTimeout(() => {
      try {
        navigation.navigate("Main", { screen: "Home" });
      } catch {
        try {
          const parent = navigation?.getParent?.();
          parent?.navigate?.("Main", { screen: "Home" });
        } catch {
          // No-op: avoid fallback goBack that can return to DetectingLocation.
        }
      }
    }, 0);
  };

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="Search locality or area"
          placeholderTextColor="#94A3B8"
          iconColor="#0F766E"
          inputStyle={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
      </View>
      {debouncedQuery.length > 0 ? (
        <View style={styles.suggestionBox}>
          {apiSearching ? <Text style={styles.suggestionHint}>Searching suggestions...</Text> : null}
          {!apiSearching && searchError ? <Text style={styles.suggestionHint}>Search service unavailable, showing fallback suggestions.</Text> : null}
          {!apiSearching && suggestionRows.length === 0 ? <Text style={styles.suggestionHint}>No suggestions found</Text> : null}
          {!apiSearching
            ? suggestionRows.map((row: any, idx: number) => (
              <TouchableOpacity
                key={String(row?.id ?? row?.addressId ?? `sugg-${idx}`)}
                style={styles.suggestionItem}
                activeOpacity={0.85}
                onPress={() => void onSelectSearchLocation(row)}
              >
                <MaterialCommunityIcon name="map-marker-radius-outline" size={18} color="#0F766E" />
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {formatAddressLine(row)}
                </Text>
              </TouchableOpacity>
            ))
            : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.currentLocationCard} onPress={() => navigation.navigate("DetectingLocation")} activeOpacity={0.9}>
        <MaterialCommunityIcon name="crosshairs-gps" size={24} color="#15803D" />
        <View style={styles.currentLocationText}>
          <Text style={styles.currentLocationTitle}>Use current location</Text>
          <Text style={styles.currentLocationSubtitle}>
            {currentAddress ? formatAddressLine(currentAddress) : "Detect and use my current location"}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.serviceabilityChip,
                serviceAvailable === true
                  ? styles.serviceabilityYes
                  : serviceAvailable === false
                    ? styles.serviceabilityNo
                    : styles.serviceabilityUnknown,
              ]}
            >
              {serviceAvailable === true
                ? "Service available"
                : serviceAvailable === false
                  ? "Not serviceable"
                  : "Serviceability pending"}
            </Text>
            {__DEV__ ? (
              <Text style={styles.devChip}>
                {`ID: ${String(currentAddress?.id ?? "-")}`}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Saved addresses</Text>
        <TouchableOpacity style={styles.addNewBtn} activeOpacity={0.9} onPress={() => navigation.navigate("AddAddressDetails")}>
          <MaterialCommunityIcon name="plus-circle-outline" size={16} color="#FFFFFF" />
          <Text style={styles.addNewText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loading || actionLoading ? (
        <>
          <LocationAddressShimmer />
          <LocationAddressShimmer />
          <LocationAddressShimmer />
        </>
      ) : null}
      {!loading && filtered.length === 0 ? <Text style={styles.empty}>No saved addresses found.</Text> : null}
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.error}>{String(error)}</Text>
          <Button mode="outlined" compact onPress={() => void retryAddressFetch()}>
            Retry API
          </Button>
        </View>
      ) : null}

      {debouncedQuery.length > 0 ? (
        <View style={styles.searchResultsSection}>
          <Text style={styles.searchResultsTitle}>Search results</Text>
          {(apiSearchRows ?? []).slice(0, 12).map((row: any, idx: number) => (
            <View key={String(row?.id ?? row?.addressId ?? `search-${idx}`)} style={styles.searchResultItem}>
              <Text style={styles.searchResultLine} numberOfLines={2}>{formatAddressLine(row)}</Text>
              <View style={styles.searchResultActionRow}>
                <Text
                  style={[
                    styles.serviceabilityTag,
                    searchServiceability[String(row?.id ?? row?.addressId ?? `search-${idx}`)] === "serviceable"
                      ? styles.tagServiceable
                      : searchServiceability[String(row?.id ?? row?.addressId ?? `search-${idx}`)] === "not_serviceable"
                        ? styles.tagNotServiceable
                        : styles.tagChecking,
                  ]}
                >
                  {searchServiceability[String(row?.id ?? row?.addressId ?? `search-${idx}`)] === "serviceable"
                    ? "Service available"
                    : searchServiceability[String(row?.id ?? row?.addressId ?? `search-${idx}`)] === "not_serviceable"
                      ? "Not serviceable"
                      : "Checking..."}
                </Text>
                <Button compact mode="contained-tonal" onPress={() => void onSelectSearchLocation(row)}>
                  Select
                </Button>
              </View>
            </View>
          ))}
          {apiSearchRows.length === 0 && !apiSearching ? <Text style={styles.empty}>No matching locations found.</Text> : null}
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => String(item?.id ?? i)}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <AddressCard
              label={item?.label}
              addressLine={formatAddressLine(item)}
              selected={String(item?.id ?? "") === String(currentAddress?.id ?? "")}
              onPress={() => {
                void onSetDefault(String(item?.id ?? ""), item);
              }}
              onDelete={() => {
                void onDeleteAddress(String(item?.id ?? ""));
              }}
            />
            <View style={styles.cardActions}>
              <Button compact mode="text" onPress={() => navigation.navigate("AddAddressDetails", { address: item })}>
                Edit address
              </Button>
              <Button compact mode="contained-tonal" onPress={() => void onSetDefault(String(item?.id ?? ""), item)}>
                Select
              </Button>
            </View>
          </View>
        )}
      />

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)}>
        {snack ?? ""}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FFFA", padding: 14 },
  searchWrap: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    shadowColor: "#0B3B2E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  search: {
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  suggestionBox: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ECFDF5",
  },
  suggestionText: {
    flex: 1,
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  suggestionHint: {
    color: "#64748B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  searchInput: {
    color: "#064E3B",
    fontSize: 18,
    fontWeight: "700",
  },
  currentLocationCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#ECFDF5",
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  currentLocationText: { flex: 1, gap: 2 },
  currentLocationTitle: { fontWeight: "800", color: "#14532D" },
  currentLocationSubtitle: { color: "#4D7C0F", fontSize: 12 },
  metaRow: { marginTop: 6, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  serviceabilityChip: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  serviceabilityYes: { backgroundColor: "#DCFCE7", color: "#166534" },
  serviceabilityNo: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  serviceabilityUnknown: { backgroundColor: "#E2E8F0", color: "#334155" },
  devChip: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F766E",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  sectionHead: { marginTop: 12, marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#14532D" },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#0F766E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#14B8A6",
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  addNewText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  cardActions: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultsSection: {
    marginTop: 8,
    gap: 8,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#14532D",
  },
  searchResultItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 8,
  },
  searchResultLine: {
    color: "#334155",
    fontWeight: "600",
  },
  searchResultActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  serviceabilityTag: {
    fontSize: 12,
    fontWeight: "700",
  },
  tagChecking: {
    color: "#64748B",
  },
  tagServiceable: {
    color: "#15803D",
  },
  tagNotServiceable: {
    color: "#DC2626",
  },
  empty: { color: "#6B7280", marginTop: 16 },
  error: { color: "#DC2626", marginTop: 8 },
  errorWrap: { marginTop: 8, gap: 8, alignItems: "flex-start" },
  cardWrap: { marginTop: 8 },
});
const isServiceable = (data: any): boolean => {
  const value =
    data?.serviceable ??
    data?.available ??
    data?.isServiceable ??
    data?.data?.serviceable ??
    data?.data?.available ??
    data?.result?.serviceable;

  if (typeof value === "boolean") return value;
  const valueText = String(value ?? "").trim().toLowerCase();
  if (valueText === "true" || valueText === "1" || valueText === "yes") return true;
  if (valueText === "false" || valueText === "0" || valueText === "no") return false;

  const status = String(
    data?.status ??
      data?.serviceabilityStatus ??
      data?.data?.status ??
      data?.data?.serviceabilityStatus ??
      data?.message ??
      "",
  ).toLowerCase();

  if (
    status.includes("not_serviceable") ||
    status.includes("unserviceable") ||
    status.includes("not serviceable") ||
    status.includes("not available") ||
    status.includes("unavailable") ||
    status.includes("coming soon") ||
    status.includes("out of service")
  ) {
    return false;
  }
  if (status.includes("serviceable") || status.includes("available") || status.includes("active")) {
    return true;
  }

  // Unknown payload should not silently look serviceable.
  return false;
};

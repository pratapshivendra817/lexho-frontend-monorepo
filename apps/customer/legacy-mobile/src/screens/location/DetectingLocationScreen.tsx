import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentCoordinates } from "../../hooks/useCurrentLocation";
import { openLocationSettings, requestLocationPermission } from "../../hooks/useLocationPermission";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { setCurrentAddressLocal, setCurrentLocationLocal, setServiceAvailable, updateLocationAndSyncThunk } from "../../redux/locationSlice";
import { checkServiceability, reverseGeocode } from "../../services/locationService";
import { resolveUserIdFromAuth } from "../../utils/authUser";
import { reverseGeocodeCoordinates } from "../../utils/reverseGeocode";

function isServiceable(data: any): boolean {
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
  return false;
}

export function DetectingLocationScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const authToken = useAppSelector((s) => s.auth.token ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState("Fetching your address...");
  const [debugInfo, setDebugInfo] = useState<{
    latitude?: number;
    longitude?: number;
    quickSource?: string;
    reverseSource?: string;
    serviceability?: string;
  }>({});

  const locationUserId = useMemo(
    () => resolveUserIdFromAuth(authUserId, String(authToken).trim()),
    [authToken, authUserId],
  );

  const tryNavigateMainIfAvailable = useCallback(() => {
    const currentState = navigation?.getState?.();
    const currentNames: string[] = Array.isArray(currentState?.routeNames) ? currentState.routeNames : [];
    if (currentNames.includes("Main")) {
      navigation.navigate("Main");
      return;
    }
    const parent = navigation?.getParent?.();
    const parentState = parent?.getState?.();
    const parentNames: string[] = Array.isArray(parentState?.routeNames) ? parentState.routeNames : [];
    if (parentNames.includes("Main")) {
      parent.navigate("Main");
    }
  }, [navigation]);

  const runDetection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const permission = await requestLocationPermission();
      if (permission !== "granted") {
        if (permission === "blocked") {
          throw new Error("Location permission is blocked. Please enable it from app settings.");
        }
        throw new Error("Location permission denied. Please allow location access.");
      }

      const coords = await Promise.race([
        getCurrentCoordinates(12000),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Location detection timed out. Please retry.")), 13000);
        }),
      ]);
      dispatch(setCurrentLocationLocal(coords));
      setDebugInfo((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));

      // Fast name resolution first so user quickly sees detected location text.
      const quickReverse = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      const quickLine = String(quickReverse?.shortName ?? quickReverse?.displayName ?? "Current Location").trim();
      setDebugInfo((prev) => ({
        ...prev,
        quickSource: quickReverse?.shortName ? "shortName" : quickReverse?.displayName ? "displayName" : "fallback",
      }));
      setAddressLine(quickLine || "Current Location");
      dispatch(
        setCurrentAddressLocal({
          id: `gps-${Date.now()}`,
          label: "HOME",
          addressLine: quickLine || "Current Location",
          latitude: coords.latitude,
          longitude: coords.longitude,
          isDefault: true,
        }),
      );

      // Move to Home quickly once we have coordinates + basic location label.
      tryNavigateMainIfAvailable();

      // Run heavier calls in background to keep transition snappy.
      void (async () => {
        try {
          if (Number.isFinite(locationUserId) && locationUserId > 0) {
            void dispatch(
              updateLocationAndSyncThunk({ userId: locationUserId, latitude: coords.latitude, longitude: coords.longitude }),
            );
          }

          const reverse = await reverseGeocode({ latitude: coords.latitude, longitude: coords.longitude });
          const reverseData = reverse?.data ?? reverse ?? {};
          const line = String(
            reverseData?.addressLine ??
              reverseData?.displayName ??
              reverseData?.area ??
              reverseData?.city ??
              quickLine ??
              "Current Location",
          );
          const pincode = String(reverseData?.pincode ?? reverseData?.postalCode ?? "").trim();
          if (line) {
            setAddressLine(line);
            setDebugInfo((prev) => ({
              ...prev,
              reverseSource:
                reverseData?.addressLine
                  ? "addressLine"
                  : reverseData?.displayName
                    ? "displayName"
                    : reverseData?.area
                      ? "area"
                      : reverseData?.city
                        ? "city"
                        : "fallback",
            }));
            dispatch(
              setCurrentAddressLocal({
                id: String(reverseData?.id ?? `gps-${Date.now()}`),
                label: String(reverseData?.label ?? "HOME"),
                addressLine: line,
                latitude: coords.latitude,
                longitude: coords.longitude,
                isDefault: true,
              }),
            );
          }

          const serviceability = await checkServiceability({ latitude: coords.latitude, longitude: coords.longitude, pincode });
          const available = isServiceable(serviceability?.data ?? serviceability);
          dispatch(setServiceAvailable(available));
          setDebugInfo((prev) => ({
            ...prev,
            serviceability: available ? "serviceable" : "not_serviceable",
          }));
        } catch {
          dispatch(setServiceAvailable(null));
          setDebugInfo((prev) => ({
            ...prev,
            serviceability: "unknown",
          }));
        }
      })();
    } catch (e: any) {
      setError(String(e?.message ?? "Unable to detect your location."));
    } finally {
      setLoading(false);
    }
  }, [dispatch, locationUserId, tryNavigateMainIfAvailable]);

  useEffect(() => {
    void runDetection();
  }, [runDetection]);

  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev ?? "Location detection is taking too long. Please retry or enter location manually.");
    }, 18000);
    return () => clearTimeout(id);
  }, [loading]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.title}>Detecting your location...</Text>
        <Text style={styles.subtitle}>{addressLine}</Text>
      </View>

      {!loading && error ? (
        <View style={styles.footer}>
          <Button mode="contained" buttonColor="#16A34A" onPress={() => void runDetection()}>
            Retry detection
          </Button>
          <Button mode="outlined" textColor="#166534" onPress={() => void openLocationSettings()}>
            Open app settings
          </Button>
          <Button mode="outlined" textColor="#166534" onPress={() => navigation.replace("LocationSearch")}>
            Enter manually
          </Button>
        </View>
      ) : null}
      {__DEV__ ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug</Text>
          <Text style={styles.debugText}>{`Lat: ${debugInfo.latitude ?? "-"}`}</Text>
          <Text style={styles.debugText}>{`Lng: ${debugInfo.longitude ?? "-"}`}</Text>
          <Text style={styles.debugText}>{`Quick Source: ${debugInfo.quickSource ?? "-"}`}</Text>
          <Text style={styles.debugText}>{`Reverse Source: ${debugInfo.reverseSource ?? "-"}`}</Text>
          <Text style={styles.debugText}>{`Serviceability: ${debugInfo.serviceability ?? "-"}`}</Text>
        </View>
      ) : null}
      <Snackbar visible={Boolean(error)} onDismiss={() => setError(null)}>
        {error ?? ""}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0FDF4", padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  title: { fontSize: 24, fontWeight: "800", color: "#14532D" },
  subtitle: { color: "#4D7C0F", textAlign: "center" },
  footer: { gap: 10, paddingBottom: 8 },
  debugCard: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#ECFDF5",
    padding: 10,
    gap: 2,
  },
  debugTitle: { color: "#166534", fontWeight: "800", fontSize: 12 },
  debugText: { color: "#166534", fontSize: 11 },
});

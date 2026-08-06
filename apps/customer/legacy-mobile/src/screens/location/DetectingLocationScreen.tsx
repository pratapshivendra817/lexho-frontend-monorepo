import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  LOCATION_ACCURACY_SAMPLE_COUNT,
  LOCATION_DESIRED_ACCURACY_METERS,
  LOCATION_DETECT_TIMEOUT_MS,
  LOCATION_MAX_ACCEPTED_ACCURACY_METERS,
} from "../../constants/env";
import { getBestCurrentCoordinates } from "../../hooks/useCurrentLocation";
import { openLocationSettings, requestLocationPermission } from "../../hooks/useLocationPermission";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { setCurrentAddressLocal, setCurrentLocationLocal, setServiceAvailable } from "../../redux/locationSlice";
import { checkServiceability, reverseGeocode, updateCurrentLocation } from "../../services/locationService";
import { resolveUserIdFromAuth } from "../../utils/authUser";
import { trackLocationEvent } from "../../utils/locationAnalytics";
import { reverseGeocodeCoordinates } from "../../utils/reverseGeocode";


import { COLORS } from '../../theme/colors';

function extractIndianPincode(text: unknown): string {
  const value = String(text ?? "");
  const match = value.match(/\b\d{6}\b/);
  return match?.[0] ?? "";
}

function isManualConfirmedAddress(address: any): boolean {
  const id = String(address?.id ?? "").trim().toLowerCase();
  const hasManualId = id.length > 0 && !id.startsWith("gps-");
  const hasManualFields =
    String(address?.flatNo ?? "").trim().length > 0 ||
    String(address?.buildingName ?? "").trim().length > 0 ||
    String(address?.landmark ?? "").trim().length > 0;
  return hasManualId || hasManualFields;
}

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
  if (status.includes("inactive")) return false;
  if (status.includes("serviceable") || status.includes("available") || status === "active") {
    return true;
  }
  return false;
}

function toAddressText(value: unknown): string {
  return String(value ?? "").trim();
}

function pickBackendPincode(source: any): string {
  const root = source?.data ?? source ?? {};
  return toAddressText(
    root?.matchedPincode ??
      root?.pincode ??
      root?.postalCode ??
      root?.serviceArea?.pincode ??
      root?.serviceableArea?.pincode ??
      root?.area?.pincode ??
      root?.location?.pincode ??
      root?.currentLocation?.pincode ??
      source?.matchedPincode ??
      source?.pincode,
  );
}

function pickBackendLocationData(source: any) {
  const data = source?.data ?? source ?? {};
  const formattedAddress = toAddressText(data?.formattedAddress);
  const landmark = toAddressText(data?.landmark);
  const area = toAddressText(
    data?.area ??
      data?.locality ??
      data?.subLocality ??
      data?.neighbourhood ??
      data?.neighborhood,
  );
  const city = toAddressText(data?.city ?? data?.district);
  const state = toAddressText(data?.state);
  const pincode = toAddressText(data?.pincode ?? data?.postalCode ?? data?.postcode);
  const country = toAddressText(data?.country) || "India";
  const addressLine =
    formattedAddress ||
    [landmark, area, city, state, pincode, country]
      .filter(Boolean)
      .join(", ");
  return {
    formattedAddress,
    addressLine,
    area,
    landmark,
    city,
    state,
    country,
    pincode,
    latitude: Number(data?.latitude ?? data?.lat ?? 0),
    longitude: Number(data?.longitude ?? data?.lng ?? 0),
    serviceAvailable: typeof data?.serviceAvailable === "boolean" ? data.serviceAvailable : null,
  };
}

function buildDetectedAddressLine(reverseData: any, fallback: string, pincode: string): string {
  const backendLocation = pickBackendLocationData(reverseData);
  if (backendLocation.addressLine) return backendLocation.addressLine;
  const fullAddress = toAddressText(
    reverseData?.fullAddress ??
      reverseData?.formattedAddress ??
      reverseData?.addressLine ??
      reverseData?.displayName,
  );
  const parsedSector = fullAddress.match(/\bSector\s+\d+[A-Za-z]?\b/i)?.[0] ?? "";
  const area = toAddressText(
    reverseData?.area ??
      reverseData?.locality ??
      reverseData?.subLocality ??
      reverseData?.neighbourhood ??
      reverseData?.neighborhood ??
      reverseData?.quickArea,
  );
  const sector = toAddressText(reverseData?.sector ?? reverseData?.quickSector ?? parsedSector);
  const city = toAddressText(reverseData?.city ?? reverseData?.district ?? reverseData?.quickCity);
  const state = toAddressText(reverseData?.state ?? reverseData?.quickState);
  const country = toAddressText(reverseData?.country ?? reverseData?.quickCountry) || "India";
  const statePin = [state, pincode].filter(Boolean).join(" ");
  const structured = [area, sector, city, statePin, country].filter(Boolean).join(", ");
  return structured || fullAddress || toAddressText(fallback) || "Current Location";
}

function replaceAddressPincode(addressLine: string, pincode: string): string {
  const line = toAddressText(addressLine);
  if (!line || !pincode) return line;
  if (/\b\d{6}\b/.test(line)) return line.replace(/\b\d{6}\b/g, pincode);
  return line;
}

function getLocationConfidence(accuracy: number): "HIGH" | "MEDIUM" | "LOW" {
  if (accuracy <= 15) return "HIGH";
  if (accuracy <= 35) return "MEDIUM";
  return "LOW";
}

function toUserErrorMessage(message: string): string {
  const text = String(message ?? "").toLowerCase();
  if (text.includes("permission")) return "Location permission denied. Please allow permission or select location manually.";
  if (text.includes("gps disabled")) return "GPS is disabled. Please enable High Accuracy location or select manually.";
  if (text.includes("timeout")) return "Location detection timed out. Please retry or select location manually.";
  if (text.includes("weak")) return "Weak GPS detected. Move near an open area or select location manually.";
  if (text.includes("mock")) return "Mock location detected. Please disable fake GPS and select manually.";
  if (text.includes("reverse")) return "Address lookup failed. Please select location manually.";
  if (text.includes("network")) return "Network issue while fetching location. Please retry or select manually.";
  return "Unable to detect your location. Select location manually.";
}

function shouldShowSettingsAction(error: string | null): boolean {
  const text = String(error ?? "").toLowerCase();
  return text.includes("permission") || text.includes("gps") || text.includes("accuracy");
}

export function DetectingLocationScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const authToken = useAppSelector((s) => s.auth.token ?? "");
  const currentAddress = useAppSelector((s) => (s.location as any)?.currentAddress ?? null);
  const currentLocation = useAppSelector((s) => (s.location as any)?.currentLocation ?? null);
  const savedAddresses = useAppSelector((s) => (s.location as any)?.savedAddresses ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState("Fetching your address...");
  const [progressLabel, setProgressLabel] = useState("📍 Detecting GPS");
  const [mockWarning, setMockWarning] = useState<string | null>(null);
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const retryTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  // Fast Refresh hook-order guard after removing debug state.
  useState<Record<string, never>>({});

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

  const openLocationSearch = useCallback(() => {
    trackLocationEvent("manual_pin_selected", { source: "detecting_screen", target: "location_search" });
    navigation.replace("LocationSearch");
  }, [navigation]);

  const runBackgroundLocationSync = useCallback(
    (latitude: number, longitude: number, eventTimestampMs?: number) => {
      if (!Number.isFinite(locationUserId) || locationUserId <= 0) return;
      const attemptSync = async (attempt: number) => {
        try {
          await updateCurrentLocation({ userId: locationUserId, latitude, longitude, eventTimestampMs });
        } catch {
          if (attempt >= 3) return;
          const waitMs = attempt * 2500;
          const timer = setTimeout(() => {
            void attemptSync(attempt + 1);
          }, waitMs);
          retryTimersRef.current.push(timer);
        }
      };
      void attemptSync(1);
    },
    [locationUserId],
  );

  const runDetection = useCallback(async () => {
    const abortController = new AbortController();
    setLoading(true);
    setError(null);
    setMockWarning(null);
    setGpsHint(null);
    setProgressLabel("📍 Detecting GPS");
    try {
      const existingManualAddress = isManualConfirmedAddress(currentAddress);
      if (existingManualAddress && currentAddress?.latitude && currentAddress?.longitude) {
        tryNavigateMainIfAvailable();
        return () => abortController.abort();
      }

      const permission = await requestLocationPermission();
      if (permission !== "granted") {
        if (permission === "blocked") {
          trackLocationEvent("gps_permission_denied", { reason: "blocked" });
          throw new Error("Location permission is blocked. Please enable it from app settings or select location manually.");
        }
        trackLocationEvent("gps_permission_denied", { reason: "denied" });
        throw new Error("Location permission denied. Please allow location access or select location manually.");
      }

      const now = Date.now();
      const cachedLoc = currentAddress?.latitude && currentAddress?.longitude ? currentLocation : null;
      const cachedAge = Number(now - Number(cachedLoc?.timestamp ?? 0));
      const cachedAccuracy = Number(cachedLoc?.accuracy ?? 9999);
      if (cachedLoc && cachedAge < 10 * 60 * 1000 && cachedAccuracy <= LOCATION_MAX_ACCEPTED_ACCURACY_METERS) {
        setProgressLabel("📍 Using recent location");
        setAddressLine(String(currentAddress?.addressLine ?? "Using recently detected location"));
        dispatch(setServiceAvailable(true));
      }

      const coords = await getBestCurrentCoordinates({
        timeoutMs: LOCATION_DETECT_TIMEOUT_MS,
        desiredAccuracyMeters: LOCATION_DESIRED_ACCURACY_METERS,
        maxAcceptedAccuracyMeters: LOCATION_MAX_ACCEPTED_ACCURACY_METERS,
        samples: LOCATION_ACCURACY_SAMPLE_COUNT,
        signal: abortController.signal,
      });
      if (coords?.mocked) {
        setMockWarning("Mock location detected. Please disable fake GPS.");
        trackLocationEvent("gps_mock_detected");
        throw new Error("Mock location detected. Please disable fake GPS and select location manually.");
      }
      const accuracy = Number(coords?.accuracy ?? 9999);
      const confidence = getLocationConfidence(Math.min(accuracy, LOCATION_MAX_ACCEPTED_ACCURACY_METERS));
      dispatch(setCurrentLocationLocal({ ...coords, confidence, timestamp: Number(coords?.timestamp ?? Date.now()) }));
      trackLocationEvent("gps_success", { accuracy, confidence });

      // Fast name resolution first so user quickly sees detected location text.
      setProgressLabel("🏠 Fetching address");
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 400));
      const quickReverse = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      const quickLine = String(quickReverse?.shortName ?? quickReverse?.displayName ?? "Current Location").trim();
      if (!quickReverse) {
        trackLocationEvent("reverse_geocode_failure", { stage: "quick_reverse" });
      }
      const quickPincode = extractIndianPincode(quickReverse?.displayName);
      const existingPincode = String(currentAddress?.pincode ?? "").trim();
      const keepManualPincode = isManualConfirmedAddress(currentAddress) && existingPincode.length > 0;
      const keepManualAddress = isManualConfirmedAddress(currentAddress);
      setAddressLine(quickLine || "Current Location");
      if (!keepManualAddress) {
        dispatch(
          setCurrentAddressLocal({
            id: `gps-${Date.now()}`,
            label: "HOME",
            addressLine: quickLine || "Current Location",
            pincode: keepManualPincode ? existingPincode : quickPincode || undefined,
            latitude: coords.latitude,
            longitude: coords.longitude,
            isDefault: true,
          }),
        );
      }
      const locationEventTimestampMs = Number(coords?.timestamp ?? Date.now());
      let locationUpdate: any = null;
      try {
        locationUpdate = await updateCurrentLocation({
          userId: locationUserId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          lat: coords.latitude,
          lng: coords.longitude,
          detectionSource: "GPS_AUTO",
          manualConfirmed: false,
          eventTimestampMs: locationEventTimestampMs,
        });
      } catch {
        runBackgroundLocationSync(coords.latitude, coords.longitude, locationEventTimestampMs);
      }
      const backendLocation = pickBackendLocationData(locationUpdate);
      const effectiveLatitude =
        Number.isFinite(backendLocation.latitude) && backendLocation.latitude !== 0
          ? backendLocation.latitude
          : coords.latitude;
      const effectiveLongitude =
        Number.isFinite(backendLocation.longitude) && backendLocation.longitude !== 0
          ? backendLocation.longitude
          : coords.longitude;

      let reverse: any = null;
      try {
        if (!backendLocation.addressLine || !backendLocation.pincode) {
          reverse = await reverseGeocode({
            latitude: effectiveLatitude,
            longitude: effectiveLongitude,
            lat: effectiveLatitude,
            lng: effectiveLongitude,
            detectionSource: "GPS_AUTO",
            manualConfirmed: false,
            eventTimestampMs: locationEventTimestampMs,
          });
        }
      } catch {
        trackLocationEvent("reverse_geocode_failure", { stage: "backend_reverse" });
      }
      const reverseData = {
        ...(reverse?.data ?? reverse ?? {}),
        ...(locationUpdate?.data ?? locationUpdate ?? {}),
        quickArea: quickReverse?.area,
        quickSector: quickReverse?.sector,
        quickCity: quickReverse?.city,
        quickState: quickReverse?.state,
        quickCountry: quickReverse?.country,
      };
      const backendPincode = String(reverseData?.pincode ?? reverseData?.postalCode ?? "").trim();
      let resolvedPincode = backendPincode || String(quickReverse?.pincode ?? "").trim() || quickPincode || "";
      if (keepManualPincode) {
        resolvedPincode = existingPincode;
      } else if (backendPincode && quickPincode && backendPincode !== quickPincode) {
        resolvedPincode = backendPincode;
      }
      const line = buildDetectedAddressLine(reverseData, quickLine || "Current Location", resolvedPincode);
      const parsedSector = toAddressText(
        reverseData?.sector ??
          reverseData?.quickSector ??
          line.match(/\bSector\s+\d+[A-Za-z]?\b/i)?.[0],
      );
      if (line && !keepManualAddress) {
        setAddressLine(line);
        dispatch(
          setCurrentAddressLocal({
            id: String(reverseData?.id ?? `gps-${Date.now()}`),
            label: String(reverseData?.label ?? "HOME"),
            addressLine: line,
            area: toAddressText(
              reverseData?.area ??
                reverseData?.locality ??
                reverseData?.subLocality ??
                reverseData?.neighbourhood ??
                reverseData?.neighborhood ??
                reverseData?.quickArea,
            ),
            sector: parsedSector,
            city: toAddressText(reverseData?.city ?? reverseData?.district ?? reverseData?.quickCity),
            state: toAddressText(reverseData?.state ?? reverseData?.quickState),
            country: toAddressText(reverseData?.country ?? reverseData?.quickCountry) || "India",
            landmark: toAddressText(reverseData?.landmark),
            pincode: resolvedPincode || undefined,
            latitude: effectiveLatitude,
            longitude: effectiveLongitude,
            isDefault: true,
          }),
        );
      }

      setProgressLabel("✅ Checking service availability");
      const serviceability =
        typeof backendLocation.serviceAvailable === "boolean"
          ? null
          : await checkServiceability({
              latitude: effectiveLatitude,
              longitude: effectiveLongitude,
              lat: effectiveLatitude,
              lng: effectiveLongitude,
              pincode: resolvedPincode,
              eventTimestampMs: locationEventTimestampMs,
            });
      const available =
        typeof backendLocation.serviceAvailable === "boolean"
          ? backendLocation.serviceAvailable
          : isServiceable(serviceability?.data ?? serviceability);
      const backendMatchedPincode = pickBackendPincode(serviceability);
      const finalPincode = backendMatchedPincode || resolvedPincode;
      const finalLine = replaceAddressPincode(line || quickLine || "Current Location", finalPincode);
      const finalParsedSector = toAddressText(
        reverseData?.sector ??
          reverseData?.quickSector ??
          finalLine.match(/\bSector\s+\d+[A-Za-z]?\b/i)?.[0],
      );
      if (finalPincode && !keepManualAddress) {
        setAddressLine(finalLine);
        dispatch(
          setCurrentAddressLocal({
            id: String(reverseData?.id ?? `gps-${Date.now()}`),
            label: String(reverseData?.label ?? "HOME"),
            addressLine: finalLine,
            area: toAddressText(
              reverseData?.area ??
                reverseData?.locality ??
                reverseData?.subLocality ??
                reverseData?.neighbourhood ??
                reverseData?.neighborhood ??
                reverseData?.quickArea,
            ),
            sector: finalParsedSector,
            city: toAddressText(reverseData?.city ?? reverseData?.district ?? reverseData?.quickCity),
            state: toAddressText(reverseData?.state ?? reverseData?.quickState),
            country: toAddressText(reverseData?.country ?? reverseData?.quickCountry) || "India",
            landmark: toAddressText(reverseData?.landmark),
            pincode: finalPincode,
            latitude: effectiveLatitude,
            longitude: effectiveLongitude,
            isDefault: true,
          }),
        );
      }
      dispatch(setServiceAvailable(available));

      if (available) {
        tryNavigateMainIfAvailable();
      } else {
        trackLocationEvent("serviceability_failure", {
          latitude: effectiveLatitude,
          longitude: effectiveLongitude,
          pincode: finalPincode,
        });
        navigation.replace("ComingSoon", {
          addressLine: finalLine,
          pincode: finalPincode || undefined,
        });
      }
    } catch (e: any) {
      const text = String(e?.message ?? "Unable to detect your location.");
      const fallbackAddress = Array.isArray(savedAddresses) && savedAddresses.length > 0 ? savedAddresses[0] : null;
      if (fallbackAddress && !isManualConfirmedAddress(currentAddress)) {
        dispatch(setCurrentAddressLocal(fallbackAddress));
        tryNavigateMainIfAvailable();
        setLoading(false);
        return () => abortController.abort();
      }
      if (text.toLowerCase().includes("weak")) {
        setGpsHint("Move near open area, enable High Accuracy, or select manually.");
        trackLocationEvent("gps_weak", { message: text });
      } else if (text.toLowerCase().includes("timeout")) {
        trackLocationEvent("gps_timeout", { message: text });
      }
      setError(toUserErrorMessage(text));
    } finally {
      setLoading(false);
    }
    return () => abortController.abort();
  }, [
    currentAddress,
    currentLocation,
    dispatch,
    locationUserId,
    navigation,
    runBackgroundLocationSync,
    savedAddresses,
    tryNavigateMainIfAvailable,
  ]);

  useEffect(() => {
    let cleanup: any;
    void (async () => {
      cleanup = await runDetection();
    })();
    return () => {
      if (typeof cleanup === "function") cleanup();
      retryTimersRef.current.forEach((timer) => clearTimeout(timer));
      retryTimersRef.current = [];
    };
  }, [runDetection]);

  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev ?? "Location detection is taking too long. Please retry or choose location manually.");
    }, 18000);
    return () => clearTimeout(id);
  }, [loading]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.goldSoft} />
        <Text style={styles.title}>Detecting your location...</Text>
        <Text style={styles.progress}>{progressLabel}</Text>
        <Text style={styles.subtitle}>{addressLine}</Text>
        {gpsHint ? <Text style={styles.hint}>{gpsHint}</Text> : null}
        {mockWarning ? <Text style={styles.warning}>{mockWarning}</Text> : null}
        <Button mode="outlined" textColor={COLORS.goldSoft} style={styles.outlinedBtn} onPress={openLocationSearch}>
          Choose location manually
        </Button>
      </View>

      {!loading && error ? (
        <View style={styles.footer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" buttonColor={COLORS.goldSoft} textColor={COLORS.navyDark} onPress={() => void runDetection()}>
            Retry detection
          </Button>
          {shouldShowSettingsAction(error) ? (
            <Button mode="outlined" textColor={COLORS.goldSoft} style={styles.outlinedBtn} onPress={() => void openLocationSettings()}>
              Open app settings
            </Button>
          ) : null}
          <Button mode="outlined" textColor={COLORS.goldSoft} style={styles.outlinedBtn} onPress={openLocationSearch}>
            Choose location manually
          </Button>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark, padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.white },
  progress: { color: COLORS.goldSoft, fontSize: 14, fontWeight: "700" },
  subtitle: { color: COLORS.neutral100, textAlign: "center" },
  hint: { color: COLORS.neutral100, textAlign: "center", fontSize: 12 },
  warning: { color: COLORS.red700, textAlign: "center", fontSize: 12, fontWeight: "700" },
  footer: { gap: 10, paddingBottom: 8 },
  errorText: { color: COLORS.red700, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  outlinedBtn: { borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark },
});

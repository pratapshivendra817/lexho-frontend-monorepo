import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { createBooking } from "../../services/bookingService";
import { useAppSelector } from "../../redux/hooks";
import { Loader } from "../../components/Loader";
import { ErrorState } from "../../components/ErrorState";

export function BookingConfirmScreen({ route, navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceId = Number(route?.params?.serviceId ?? 0);
  const scheduledTime = String(route?.params?.scheduledTime ?? "");
  const userId = Number(useAppSelector((s) => s.auth.user?.id ?? 0));
  const currentAddressId = String(useAppSelector((s) => (s.location as any)?.currentAddress?.id ?? "")).trim();

  const onConfirm = useCallback(async () => {
    if (!Number.isFinite(userId) || userId <= 0) {
      Alert.alert("Session missing", "Please login again.");
      return;
    }
    if (!currentAddressId) {
      Alert.alert("Address missing", "Please select an address before booking.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await createBooking({ userId, serviceId, addressId: currentAddressId, scheduledTime });
      Alert.alert("Booking Confirmed", "Your booking has been created successfully.");
      navigation.navigate("Bookings");
    } catch (e: any) {
      setError(String(e?.message ?? "Unable to place booking"));
    } finally {
      setLoading(false);
    }
  }, [currentAddressId, navigation, scheduledTime, serviceId, userId]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Confirm Booking</Text>
      <Text style={styles.row}>{`User ID: ${userId || "-"}`}</Text>
      <Text style={styles.row}>{`Service ID: ${serviceId || "-"}`}</Text>
      <Text style={styles.row}>{`Address ID: ${currentAddressId || "-"}`}</Text>
      <Text style={styles.row}>{`Scheduled: ${scheduledTime || "-"}`}</Text>

      {loading ? <Loader /> : null}
      {error ? <ErrorState message={error} onRetry={onConfirm} /> : null}

      <Button mode="contained" onPress={() => void onConfirm()} disabled={loading}>
        Confirm Booking
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  row: { color: "#334155" },
});

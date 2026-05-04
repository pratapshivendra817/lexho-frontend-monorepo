import { useMutation, useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useState } from "react";
import { getBookingDetails, cancelBooking, rescheduleBooking } from "../../api/bookingExtrasApi";

export function BookingDetailScreen() {
  const [id, setId] = useState("");
  const details = useQuery({ queryKey: ['booking-details', id], queryFn: () => getBookingDetails(id), enabled: false });
  const cancel = useMutation({ mutationFn: () => cancelBooking(id), onSuccess: () => details.refetch() });
  const reschedule = useMutation({ mutationFn: () => rescheduleBooking(id, { date: new Date().toISOString() }), onSuccess: () => details.refetch() });

  const canRun = id.trim().length > 0;
  return <View style={styles.root}><Text variant="headlineSmall">Booking Details</Text><TextInput mode="outlined" label="Booking ID" value={id} onChangeText={setId} /><Button mode="outlined" onPress={() => details.refetch()} disabled={!canRun}>Fetch</Button><Button mode="contained" onPress={() => reschedule.mutate()} loading={reschedule.isPending} disabled={!canRun}>Reschedule</Button><Button mode="contained-tonal" onPress={() => cancel.mutate()} loading={cancel.isPending} disabled={!canRun}>Cancel Booking</Button><Text>{JSON.stringify(details.data ?? {}, null, 2)}</Text></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 } });

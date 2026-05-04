import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useState } from "react";
import { getProviderLiveLocation } from "../../api/bookingExtrasApi";

export function LiveTrackingScreen() {
  const [bookingId, setBookingId] = useState("");
  const live = useQuery({ queryKey: ['live', bookingId], queryFn: () => getProviderLiveLocation(bookingId), enabled: bookingId.trim().length > 0, refetchInterval: 10000 });

  return <View style={styles.root}><Text variant="headlineSmall">Live Tracking</Text><TextInput mode="outlined" label="Booking ID" value={bookingId} onChangeText={setBookingId} /><Text>{JSON.stringify(live.data ?? {}, null, 2)}</Text><Text>Provider ETA: {live.data?.eta ?? 'N/A'}</Text></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 } });

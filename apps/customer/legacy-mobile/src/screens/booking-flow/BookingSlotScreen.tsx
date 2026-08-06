import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { COLORS } from '../../theme/colors';

export function BookingSlotScreen({ route, navigation }: any) {
  const serviceId = Number(route?.params?.serviceId ?? 0);
  const [scheduledTime, setScheduledTime] = useState("");
  const canContinue = useMemo(() => Number.isFinite(serviceId) && serviceId > 0 && scheduledTime.trim().length > 0, [scheduledTime, serviceId]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Select Slot</Text>
      <Text style={styles.sub}>{`Service ID: ${serviceId}`}</Text>
      <TextInput
        mode="outlined"
        label="Scheduled Time (ISO)"
        value={scheduledTime}
        onChangeText={setScheduledTime}
        placeholder="2026-05-10T14:30:00"
      />
      <Button
        mode="contained"
        disabled={!canContinue}
        onPress={() => navigation.navigate("BookingConfirm", { serviceId, scheduledTime })}
      >
        Continue
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.slate900 },
  sub: { color: COLORS.slate600 },
});






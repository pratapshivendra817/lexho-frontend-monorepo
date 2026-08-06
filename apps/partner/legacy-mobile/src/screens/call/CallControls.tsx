import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";

export function CallControls({ muted, speaker, onMute, onSpeaker, onEnd }: {
  muted: boolean;
  speaker: boolean;
  onMute: () => void;
  onSpeaker: () => void;
  onEnd: () => void;
}) {
  return (
    <View style={styles.row}>
      <Control icon={muted ? "microphone-off" : "microphone"} label={muted ? "Unmute" : "Mute"} active={muted} onPress={onMute} />
      <TouchableOpacity style={styles.endButton} onPress={onEnd} accessibilityLabel="End call">
        <MaterialCommunityIcons name="phone-hangup" size={30} color={COLORS.white} />
      </TouchableOpacity>
      <Control icon={speaker ? "volume-high" : "volume-medium"} label="Speaker" active={speaker} onPress={onSpeaker} />
    </View>
  );
}

function Control({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.control, active && styles.controlActive]} onPress={onPress} accessibilityLabel={label}>
      <MaterialCommunityIcons name={icon} size={25} color={active ? COLORS.background : COLORS.textPrimary} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 },
  control: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.borderSoft, alignItems: "center", justifyContent: "center", gap: 2 },
  controlActive: { backgroundColor: COLORS.secondary },
  label: { color: COLORS.textSecondary, fontSize: 10, fontWeight: "700" },
  labelActive: { color: COLORS.background },
  endButton: { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center" },
});


import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const Button = ({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, danger && styles.danger]}><Text style={styles.text}>{label}</Text></Pressable>
);
export const MuteButton = ({ muted, onPress }: { muted: boolean; onPress: () => void }) => <Button label={muted ? "Unmute" : "Mute"} onPress={onPress} />;
export const SpeakerButton = ({ enabled, onPress }: { enabled: boolean; onPress: () => void }) => <Button label={enabled ? "Earpiece" : "Speaker"} onPress={onPress} />;
export const EndCallButton = ({ onPress }: { onPress: () => void }) => <Button label="End" onPress={onPress} danger />;
export function CallControls(props: { muted: boolean; speaker: boolean; onMute: () => void; onSpeaker: () => void; onEnd: () => void }) {
  return <View style={styles.row}><MuteButton muted={props.muted} onPress={props.onMute} /><SpeakerButton enabled={props.speaker} onPress={props.onSpeaker} /><EndCallButton onPress={props.onEnd} /></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", gap: 16, justifyContent: "center" }, button: { minWidth: 76, padding: 14, borderRadius: 40, backgroundColor: "#26354D", alignItems: "center" }, danger: { backgroundColor: "#C83D4D" }, text: { color: "#FFFFFF", fontWeight: "700" } });

import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../constants/colors";

export function FloatingSOSButton({ visible = true, onConfirmed }: { visible?: boolean; onConfirmed: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!visible) return null;
  return <><Pressable accessibilityLabel="SOS emergency" accessibilityHint="Press and hold for three seconds" delayLongPress={3000} onLongPress={() => setConfirming(true)} style={({ pressed }) => [styles.floating, pressed && styles.pressed]}><Text style={styles.sos}>SOS</Text><Text style={styles.hold}>Hold 3s</Text></Pressable><Modal transparent visible={confirming} animationType="fade" onRequestClose={() => setConfirming(false)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Send emergency SOS?</Text><Text style={styles.body}>Your location will be shared with the admin team and emergency contacts. Admin action is required for any further escalation.</Text><View style={styles.row}><Pressable style={styles.cancel} onPress={() => setConfirming(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable style={styles.confirm} onPress={() => { setConfirming(false); onConfirmed(); }}><Text style={styles.confirmText}>Send SOS</Text></Pressable></View></View></View></Modal></>;
}
const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    right: 18,
    bottom: 92,
    zIndex: 100,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#C62828",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pressed: { transform: [{ scale: 0.96 }], backgroundColor: "#8E0000" },
  sos: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  hold: { color: "#FFE4E4", fontSize: 9, fontWeight: "700" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 24,
    alignItems: "stretch",
  },
  modal: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    marginHorizontal: 0,
  },
  title: { color: COLORS.accent, fontSize: 22, fontWeight: "900" },
  body: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10 },
  row: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancel: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  confirm: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#C62828",
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  cancelText: { color: COLORS.accent, fontWeight: "800" },
  confirmText: { color: "#FFFFFF", fontWeight: "900" },
});

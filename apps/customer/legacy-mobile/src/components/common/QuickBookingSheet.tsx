import { useEffect, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Vibration, View } from "react-native";
import { Button, Text } from "react-native-paper";

const SHEET_HEIGHT = 280;

type QuickAction = { label: string; onPress: () => void };

export function QuickBookingSheet({
  visible,
  onClose,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  actions: QuickAction[];
}) {
  const overlay = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dragStart = useRef(0);
  const haptic = (ms: number) => {
    try {
      if (typeof Vibration?.vibrate === "function") {
        Vibration.vibrate(ms);
      }
    } catch {
      // Ignore haptic failures on devices/simulators that don't expose vibration APIs.
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => Math.abs(gestureState.dy) > 8,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value: number) => {
          dragStart.current = value;
        });
      },
      onPanResponderMove: (_evt, gestureState) => {
        const next = Math.max(0, dragStart.current + gestureState.dy);
        translateY.setValue(next);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const shouldClose = gestureState.dy > 90 || gestureState.vy > 0.8;
        if (shouldClose) {
          haptic(10);
          Animated.parallel([
            Animated.timing(overlay, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            if (typeof onClose === "function") onClose();
          });
          return;
        }
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      haptic(8);
      Animated.parallel([
        Animated.timing(overlay, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlay, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [overlay, translateY, visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <Text style={styles.title}>Quick Booking</Text>
        <Text style={styles.subtitle}>Choose a fast action and continue checkout in seconds.</Text>
        <View style={styles.actionWrap}>
          {actions.map((action, idx) => (
            <Button
              key={`${action.label}-${idx}`}
              mode={idx === 0 ? "contained" : "contained-tonal"}
              onPress={() => {
                haptic(8);
                if (typeof action?.onPress === "function") {
                  action.onPress();
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </View>
        <Button mode="text" onPress={onClose}>Close</Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(2, 6, 23, 0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SHEET_HEIGHT,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B" },
  actionWrap: { gap: 8, marginTop: 6 },
});

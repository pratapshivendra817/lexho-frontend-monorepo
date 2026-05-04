import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Animated.View key={idx} style={[styles.row, { opacity: pulse }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { height: 52, borderRadius: 14, backgroundColor: "#EAEFF7" },
});

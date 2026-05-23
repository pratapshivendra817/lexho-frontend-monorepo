import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

type Props = {
  height?: number;
  width?: number | `${number}%` | "auto";
  style?: ViewStyle;
};

export function ShimmerBlock({ height = 16, width = "100%", style }: Props) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { height, width, opacity }, style]} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    backgroundColor: "#DADADA",
  },
});

import { memo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export const Loader = memo(function Loader() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#0F9D58" />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
});

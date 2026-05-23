import { ActivityIndicator, StyleSheet, View } from "react-native";

export function Loader() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: 24, alignItems: "center", justifyContent: "center" },
});

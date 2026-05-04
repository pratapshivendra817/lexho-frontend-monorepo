import { ActivityIndicator, StyleSheet, View } from "react-native";
import { palette } from "../../constants/theme";

export function AppLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: "center", alignItems: "center" } });

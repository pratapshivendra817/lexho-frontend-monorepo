import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from '../theme/colors';

export function Loader() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: 24, alignItems: "center", justifyContent: "center" },
});




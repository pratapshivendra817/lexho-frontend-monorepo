import { memo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from '../../../theme/colors';


export const Loader = memo(function Loader() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={COLORS.navy} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
});


import { StyleSheet, View } from "react-native";
import { ShimmerBlock } from "../ShimmerBlock";
import { COLORS } from '../../theme/colors';

export function LocationAddressShimmer() {
  return (
    <View style={styles.card}>
      <ShimmerBlock height={16} width="35%" />
      <ShimmerBlock height={12} width="90%" style={styles.row} />
      <ShimmerBlock height={12} width="70%" style={styles.row} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.offWhite,
    backgroundColor: COLORS.white,
    padding: 12,
    marginTop: 8,
  },
  row: { marginTop: 8 },
});







import { memo } from "react";
import { StyleSheet, View } from "react-native";


import { COLORS } from '../../theme/colors';

type PopularServicesShimmerProps = {
  cardWidth: number;
};

function PopularServicesShimmerComponent({ cardWidth }: PopularServicesShimmerProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={`popular-shimmer-${index}`} style={[styles.card, { width: cardWidth }]}>
          <View style={styles.image} />
          <View style={styles.lineLg} />
          <View style={styles.lineSm} />
          <View style={styles.lineXs} />
        </View>
      ))}
    </View>
  );
}

export const PopularServicesShimmer = memo(PopularServicesShimmerComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  card: {
    marginRight: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.neutral200,
    backgroundColor: COLORS.white,
    paddingBottom: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 92,
    backgroundColor: COLORS.neutral200,
  },
  lineLg: {
    marginTop: 10,
    marginHorizontal: 10,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.neutral200,
  },
  lineSm: {
    marginTop: 8,
    marginHorizontal: 10,
    width: "60%",
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.neutral200,
  },
  lineXs: {
    marginTop: 6,
    marginHorizontal: 10,
    width: "46%",
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.neutral200,
  },
});






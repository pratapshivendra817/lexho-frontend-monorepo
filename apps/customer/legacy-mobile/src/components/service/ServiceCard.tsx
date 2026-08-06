import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";


import { COLORS } from '../../theme/colors';
import { radii, spacing } from "../../constants/theme";

type ServiceCardProps = {
  item: {
    id: number;
    name: string;
    imageUrl?: string;
    isNew?: boolean;
    ratingLabel: string;
    discountedPriceLabel: string;
    originalPriceLabel?: string;
  };
  onAdd: (serviceId: number) => void;
  onPress?: (serviceId: number) => void;
  isAdded?: boolean;
  imageRequestHeaders?: Record<string, string>;
};

function ServiceCardComponent({ item, onAdd, onPress, isAdded = false, imageRequestHeaders }: ServiceCardProps) {
  const ratingValue = String(item.ratingLabel ?? "")
    .replace(/^\*\s*/, "")
    .match(/\d+(\.\d+)?/)?.[0] ?? "0";

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(item.id)}>
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image
            source={
              imageRequestHeaders && Object.keys(imageRequestHeaders).length > 0
                ? { uri: item.imageUrl, headers: imageRequestHeaders }
                : { uri: item.imageUrl }
            }
            resizeMode="cover"
            style={styles.image}
          />
        ) : (
          <View style={styles.imageFallback} />
        )}
        {item.isNew ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        ) : null}
        <View style={styles.imageRatingBadge}>
          <MaterialCommunityIcon name="star" size={12} color={COLORS.warning} />
          <Text style={[styles.meta, { color: COLORS.black }]}>{ratingValue}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.footerRow}>
          <View style={styles.priceRow}>
            <Text style={styles.discountedPrice}>{item.discountedPriceLabel}</Text>
            {item.originalPriceLabel ? <Text style={styles.originalPrice}>{item.originalPriceLabel}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add service"
            style={[styles.addButton, isAdded && styles.addButtonAdded]}
            onPress={(event) => {
              event.stopPropagation?.();
              onAdd(item.id);
            }}
          >
            <MaterialCommunityIcon name={isAdded ? "check" : "plus"} size={14} color={COLORS.white} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export const ServiceCard = memo(ServiceCardComponent);

const styles = StyleSheet.create({
  card: {
    width: "31.5%",
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    height: 178,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 94,
  },
  image: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: COLORS.neutral200,
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.warning,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },
  imageRatingBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    borderRadius: radii.pill,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  content: {
    marginTop: "auto",
    paddingHorizontal: spacing.sm,
    paddingTop: 3,
    paddingBottom: 3,
    backgroundColor: COLORS.white,
  },
  name: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "700",
    minHeight: 28,
    lineHeight: 14,
  },
  meta: {
    fontSize: 10,
    color: COLORS.slate600,
  },
  footerRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  discountedPrice: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "800",
    marginRight: 8,
  },
  originalPrice: {
    color: COLORS.slate400,
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.blue600,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonAdded: {
    backgroundColor: COLORS.green600,
  },
});







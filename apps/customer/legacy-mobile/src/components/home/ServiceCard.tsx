import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from '../../theme/colors';
import { radii, spacing } from "../../constants/theme";

type PopularServiceCardProps = {
  item: {
    id: string;
    name: string;
    imageUrl?: string;
    ratingLabel: string;
    ratingValue?: number;
    priceLabel: string;
  };
  width: number;
  onPress: (serviceId: string) => void;
  onAdd: (serviceId: string) => void;
  accentColor?: string;
  badgeLabel?: string;
};

function ServiceCardComponent({ item, width, onPress, onAdd, accentColor = COLORS.blue600, badgeLabel = "Top Rated" }: PopularServiceCardProps) {
  const ratingValue = String(item.ratingLabel ?? "").replace(/^rating\s*/i, "").trim();
  const ratingDisplay = ratingValue || badgeLabel;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed ? styles.cardPressed : null,
      ]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback} />
        )}
        <View style={styles.imageRatingBadge}>
          <MaterialCommunityIcon name="star" size={12} color={COLORS.warning} />
          <Text style={[styles.meta, { color: COLORS.black }]}>{ratingDisplay}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.price}>{item.priceLabel}</Text>
          <View style={styles.bookActionWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Book service"
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: accentColor },
                pressed ? styles.addButtonPressed : null,
              ]}
              onPress={() => onAdd(item.id)}
            >
              <MaterialCommunityIcon name="plus" size={14} color={COLORS.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const ServiceCard = memo(ServiceCardComponent);

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "#FFFDF8",
    overflow: "hidden",
    marginRight: spacing.md,
    height: 178,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  image: {
    width: "100%",
    height: 94,
    backgroundColor: "#F8F2E4",
  },
  imageFallback: {
    width: "100%",
    height: 94,
    backgroundColor: "#F8F2E4",
  },
  imageWrap: {
    width: "100%",
    height: 94,
    position: "relative",
  },
  imageRatingBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
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
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.black,
    minHeight: 30,
    lineHeight: 16,
    paddingRight: 0,
    textShadowColor: "transparent",
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  meta: {
    fontSize: 10,
    color: COLORS.slate600,
    textShadowColor: "transparent",
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  footerRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  price: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.black,
    flexShrink: 1,
    textShadowColor: "transparent",
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#173B8F",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  bookActionWrap: { flexDirection: "row", alignItems: "center" },
});







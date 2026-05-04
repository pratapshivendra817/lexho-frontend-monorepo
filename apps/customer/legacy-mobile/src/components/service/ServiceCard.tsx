import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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
};

function ServiceCardComponent({ item, onAdd, onPress, isAdded = false }: ServiceCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress?.(item.id)}>
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} resizeMode="cover" style={styles.image} />
        ) : (
          <View style={styles.imageFallback} />
        )}
        {item.isNew ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        ) : null}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{item.ratingLabel}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.categoryHint}>Premium Service</Text>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.discountedPrice}>{item.discountedPriceLabel}</Text>
          {item.originalPriceLabel ? <Text style={styles.originalPrice}>{item.originalPriceLabel}</Text> : null}
        </View>
      </View>

      <Pressable
        style={[styles.addButton, isAdded && styles.addButtonAdded]}
        onPress={(event) => {
          event.stopPropagation?.();
          onAdd(item.id);
        }}
      >
        <Text style={styles.addButtonText}>{isAdded ? "Added" : "Add"}</Text>
      </Pressable>
    </Pressable>
  );
}

export const ServiceCard = memo(ServiceCardComponent);

const styles = StyleSheet.create({
  card: {
    width: "48%",
    margin: 8,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 132,
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
    backgroundColor: "#E5E7EB",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#F97316",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.66)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  categoryHint: {
    color: "#0284C7",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  name: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
    minHeight: 38,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  discountedPrice: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "800",
    marginRight: 8,
  },
  originalPrice: {
    color: "#9CA3AF",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addButton: {
    position: "absolute",
    right: 10,
    bottom: 12,
    minWidth: 44,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonAdded: {
    backgroundColor: "#16A34A",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

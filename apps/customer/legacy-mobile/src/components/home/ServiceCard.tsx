import { memo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

type PopularServiceCardProps = {
  item: {
    id: string;
    name: string;
    imageUrl?: string;
    ratingLabel: string;
    priceLabel: string;
  };
  width: number;
  onPress: (serviceId: string) => void;
  onAdd: (serviceId: string) => void;
  accentColor?: string;
  badgeLabel?: string;
};

function ServiceCardComponent({ item, width, onPress, onAdd, accentColor = "#2563EB", badgeLabel = "Top Rated" }: PopularServiceCardProps) {
  return (
    <Pressable style={[styles.card, { width }]} onPress={() => onPress(item.id)}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imageFallback} />
      )}

      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}44` }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>{badgeLabel}</Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcon name="star" size={12} color="#F59E0B" />
          <Text style={styles.meta}>{item.ratingLabel}</Text>
        </View>
        <Text style={styles.price}>{item.priceLabel}</Text>
      </View>

      <Pressable style={[styles.addButton, { backgroundColor: accentColor }]} onPress={() => onAdd(item.id)}>
        <Text style={styles.addText}>Book</Text>
      </Pressable>
    </Pressable>
  );
}

export const ServiceCard = memo(ServiceCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginRight: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 102,
  },
  imageFallback: {
    width: "100%",
    height: 102,
    backgroundColor: "#EEF2F7",
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 7,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    minHeight: 36,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 11,
    color: "#64748B",
  },
  price: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F766E",
  },
  addButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    minWidth: 54,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  addText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
    letterSpacing: 0.2,
  },
});

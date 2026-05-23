import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
  imageUrl?: string;
  initials: string;
  onPickFromGallery: () => void;
  onPickFromCamera: () => void;
  onRemove?: () => void;
};

export const AvatarPicker = memo(function AvatarPicker({ imageUrl, initials, onPickFromGallery, onPickFromCamera, onRemove }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.avatar}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <Text style={styles.initials}>{initials || "U"}</Text>
        )}
      </View>
      <View style={styles.row}>
        <Pressable style={styles.action} onPress={onPickFromGallery}>
          <MaterialCommunityIcon name="image-outline" size={16} color="#047857" />
          <Text style={styles.actionText}>Gallery</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onPickFromCamera}>
          <MaterialCommunityIcon name="camera-outline" size={16} color="#047857" />
          <Text style={styles.actionText}>Camera</Text>
        </Pressable>
        {onRemove ? (
          <Pressable style={styles.action} onPress={onRemove}>
            <MaterialCommunityIcon name="trash-can-outline" size={16} color="#B91C1C" />
            <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  initials: { fontSize: 28, fontWeight: "900", color: "#047857" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF3",
  },
  actionText: { color: "#047857", fontWeight: "700", fontSize: 12 },
  removeText: { color: "#B91C1C" },
});

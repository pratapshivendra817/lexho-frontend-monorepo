import React, { memo, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from '../theme/colors';

type Props = {
  imageUrl?: string;
  fullName?: string;
  onPickCamera?: () => void | Promise<void>;
  onPickGallery?: () => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  loading?: boolean;
  styles: any;
};

function ProfileImagePickerComponent({
  imageUrl,
  fullName,
  onPickCamera,
  onPickGallery,
  onRemove,
  loading = false,
  styles,
}: Props) {
  const [open, setOpen] = useState(false);

  const initials = useMemo(() => {
    const clean = String(fullName || "").trim();
    if (!clean) return "U";
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }, [fullName]);

  const action = async (fn?: () => void | Promise<void>) => {
    setOpen(false);
    await fn?.();
  };

  return (
    <>
      <View style={styles.profileImageWrap}>
        <View style={styles.profileImageCircle}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.profileImage} /> : <Text style={styles.initialsText}>{initials}</Text>}
          {loading ? (
            <View style={styles.imageLoaderOverlay}>
              <ActivityIndicator color={COLORS.error} />
            </View>
          ) : null}
        </View>
        <Pressable style={styles.editImageButton} onPress={() => setOpen(true)} disabled={loading}>
          <MaterialCommunityIcon name="camera" size={16} color={COLORS.white} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Profile Photo</Text>
            <Pressable style={styles.sheetAction} onPress={() => void action(onPickCamera)}>
              <MaterialCommunityIcon name="camera-outline" size={18} color={COLORS.charcoal} />
              <Text style={styles.sheetActionText}>Take Photo</Text>
            </Pressable>
            <Pressable style={styles.sheetAction} onPress={() => void action(onPickGallery)}>
              <MaterialCommunityIcon name="image-outline" size={18} color={COLORS.charcoal} />
              <Text style={styles.sheetActionText}>Choose from Gallery</Text>
            </Pressable>
            <Pressable style={styles.sheetAction} onPress={() => void action(onRemove)}>
              <MaterialCommunityIcon name="trash-can-outline" size={18} color={COLORS.danger} />
              <Text style={[styles.sheetActionText, styles.sheetDangerText]}>Remove Photo</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const ProfileImagePicker = memo(ProfileImagePickerComponent);

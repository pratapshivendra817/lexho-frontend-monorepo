import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { completeOrder, startOrder } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";

export default function ActiveJobScreen({ route }: any) {
  const orderId: number = route?.params?.orderId;
  const [before, setBefore] = useState<any>(null);
  const [after, setAfter] = useState<any>(null);

  const pickImage = async (setter: (v: any) => void) => {
    const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
    const asset = result.assets?.[0];
    if (asset?.uri) setter(asset);
  };

  const onStart = async () => {
    if (!before?.uri) {
      Alert.alert("Before image required", "Please upload before image.");
      return;
    }
    await startOrder(orderId, { uri: before.uri, type: before.type, name: before.fileName });
    Alert.alert("Success", "Service started.");
  };

  const onComplete = async () => {
    if (!after?.uri) {
      Alert.alert("After image required", "Please upload after image.");
      return;
    }
    await completeOrder(orderId, { uri: after.uri, type: after.type, name: after.fileName });
    Alert.alert("Success", "Service completed.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Job #{orderId}</Text>
      <Text style={styles.meta}>Customer details and live navigation controls can be integrated here.</Text>

      <TouchableOpacity style={styles.btn} onPress={() => pickImage(setBefore)}>
        <Text style={styles.btnText}>{before?.uri ? "Before image selected" : "Upload Before Image"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.start]} onPress={onStart}>
        <Text style={styles.btnText}>Start Service</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={() => pickImage(setAfter)}>
        <Text style={styles.btnText}>{after?.uri ? "After image selected" : "Upload After Image"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.complete]} onPress={onComplete}>
        <Text style={styles.btnText}>Complete Service</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 12 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  meta: { color: COLORS.textSecondary },
  btn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, alignItems: "center" },
  start: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  complete: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
});

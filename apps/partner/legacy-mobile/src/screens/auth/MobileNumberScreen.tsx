import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sendOtp } from "../../services/authService";
import { isValidMobile } from "../../utils/validation";
import { COLORS } from "../../constants/colors";
import { trackAuthenticationEvent } from "../../services/firebaseAnalytics";

export default function MobileNumberScreen({ navigation }: any) {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSendOtp = async () => {
    const cleanMobile = mobile.replace(/\D/g, "");
    setErrorMessage("");

    if (!isValidMobile(cleanMobile)) {
      const message = "Enter a valid 10-digit mobile number.";
      setErrorMessage(message);
      void trackAuthenticationEvent(false, { stage: "send_otp_validation" });
      Alert.alert("Invalid mobile number", message);
      return;
    }

    try {
      setLoading(true);
      const response = await sendOtp(cleanMobile);

      navigation.navigate("OTP", {
        mobile: cleanMobile,
        resendAfter: response?.resendAfter || 30,
      });
    } catch (e: any) {
      const message = e?.message || "Unable to send OTP. Please try again.";
      setErrorMessage(message);
      void trackAuthenticationEvent(false, { stage: "send_otp", message });
      Alert.alert("Unable to send OTP", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.topBlock}>
          <Text style={styles.eyebrow}>Partner Onboarding</Text>
          <Text style={styles.title}>Login with your mobile number</Text>
          <Text style={styles.subtitle}>
            Continue to verify your partner profile and start onboarding.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Mobile Number</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              value={mobile}
              onChangeText={setMobile}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="9876543210"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            onPress={handleSendOtp}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  topBlock: {
    marginBottom: 40,
  },
  eyebrow: {
    color: COLORS.secondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 12,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  countryCode: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingVertical: 16,
  },
  errorText: {
    color: COLORS.danger,
    marginTop: 12,
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: COLORS.secondary,
  },
  buttonText: {
    color: COLORS.background,
    fontWeight: "800",
    fontSize: 15,
  },
});

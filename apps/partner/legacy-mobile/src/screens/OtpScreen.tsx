import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS } from "../constants/colors";
import { resendAdminOtp, verifyAdminOtp } from "../services/authService";
import { extractJwtToken } from "../utils/storage";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Otp"> & {
  onAuthSuccess: (jwt: string, email: string) => Promise<void>;
};

const RESEND_SECONDS = 30;

export default function OtpScreen({ route, onAuthSuccess }: Props) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [error, setError] = useState("");

  const email = route.params.email;
  const password = route.params.password;

  useEffect(() => {
    if (timer <= 0) {
      return undefined;
    }

    const id = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(id);
  }, [timer]);

  const canVerify = useMemo(() => /^\d{6}$/.test(otp) && !loading, [loading, otp]);

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const payload = await verifyAdminOtp({ email, otp });
      const jwt = extractJwtToken(payload || {});

      if (!jwt) {
        throw new Error("Token missing in verify-otp response.");
      }

      await onAuthSuccess(jwt, email);
    } catch (e: any) {
      setError(e?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      setError("");
      await resendAdminOtp({ email, password });
      setTimer(RESEND_SECONDS);
    } catch (e: any) {
      setError(e?.message || "Unable to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />

        <View style={styles.headerBlock}>
          <Text style={styles.badge}>Two-Factor Auth</Text>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Enter 6-digit code sent to {email}</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            placeholderTextColor={COLORS.textMuted}
            style={styles.otpInput}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!canVerify}
            onPress={handleVerifyOtp}
            style={[styles.button, !canVerify && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={timer > 0 || resendLoading}
            onPress={handleResendOtp}
          >
            <Text style={styles.resendText}>
              {timer > 0
                ? `Resend OTP in ${timer}s`
                : resendLoading
                ? "Sending..."
                : "Resend OTP"}
            </Text>
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
  glowOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#7C3AED2E",
    top: 40,
    right: -90,
  },
  glowTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#14B8A622",
    bottom: 10,
    left: -60,
  },
  headerBlock: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#14B8A633",
    color: "#9FF7EA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlign: "center",
    fontSize: 26,
    letterSpacing: 6,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceSoft,
  },
  error: {
    marginTop: 12,
    color: COLORS.error,
  },
  button: {
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },
  resendText: {
    marginTop: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
});

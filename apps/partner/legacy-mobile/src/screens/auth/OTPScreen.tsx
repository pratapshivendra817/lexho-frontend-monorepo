import React, { useEffect, useState } from "react";
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

import { COLORS } from "../../constants/colors";
import { sendOtp, verifyOtp } from "../../services/authService";
import { trackAuthenticationEvent } from "../../services/firebaseAnalytics";

const OTP_SCREEN_COPY = {
  verifyTitle: "Verify OTP",
  otpPlaceholder: "Enter OTP",
  resendLabel: "Resend OTP",
  invalidOtpMessage: "Enter a valid 6-digit OTP.",
  genericErrorTitle: "Something went wrong",
  otpSentTitle: "OTP sent",
  doneLabel: "Done",
  verificationEyebrow: "Partner Verification",
  otpSentToLabel: "We sent a code to",
  yourNumberLabel: "your number",
} as const;

type Props = {
  navigation: any;
  route: any;
  onAuthSuccess: (payload: Record<string, any>, mobile: string) => Promise<void>;
};

export default function OTPScreen({ route, onAuthSuccess }: Props) {
  const [otp, setOtp] = useState("");
  const mobile = route?.params?.mobile || "";
  const resendAfter = route?.params?.resendAfter || 30;
  const [timer, setTimer] = useState(resendAfter);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (timer <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setTimer((previous: number) => previous - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      const message = OTP_SCREEN_COPY.invalidOtpMessage;
      setErrorMessage(message);
      void trackAuthenticationEvent(false, { stage: "verify_validation" });
      Alert.alert(OTP_SCREEN_COPY.invalidOtpMessage, message);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const payload = await verifyOtp(mobile, otp);
      await onAuthSuccess(payload, mobile);
    } catch (e: any) {
      const message = e?.message || OTP_SCREEN_COPY.genericErrorTitle;
      setErrorMessage(message);
      void trackAuthenticationEvent(false, { stage: "verify_otp", message });
      Alert.alert(OTP_SCREEN_COPY.genericErrorTitle, message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await sendOtp(mobile);
      setTimer(response?.resendAfter || resendAfter);
      Alert.alert(OTP_SCREEN_COPY.otpSentTitle, OTP_SCREEN_COPY.doneLabel);
    } catch (e: any) {
      const message = e?.message || OTP_SCREEN_COPY.genericErrorTitle;
      setErrorMessage(message);
      Alert.alert(OTP_SCREEN_COPY.genericErrorTitle, message);
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
          <Text style={styles.eyebrow}>{OTP_SCREEN_COPY.verificationEyebrow}</Text>
          <Text style={styles.title}>{OTP_SCREEN_COPY.verifyTitle}</Text>
          <Text style={styles.subtitle}>
            {`${OTP_SCREEN_COPY.otpSentToLabel} +91 ${mobile || OTP_SCREEN_COPY.yourNumberLabel}.`}
          </Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
            placeholder={OTP_SCREEN_COPY.otpPlaceholder}
            placeholderTextColor={COLORS.textMuted}
            value={otp}
            onChangeText={setOtp}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.buttonText}>{OTP_SCREEN_COPY.verifyTitle}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={timer > 0 || loading}
            onPress={handleResend}
          >
            <Text style={styles.resend}>
              {timer > 0 ? `${OTP_SCREEN_COPY.resendLabel} ${timer}s` : OTP_SCREEN_COPY.resendLabel}
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
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.textPrimary,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: "center",
    paddingHorizontal: 16,
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
    padding: 16,
    alignItems: "center",
    backgroundColor: COLORS.secondary,
  },
  buttonText: {
    color: COLORS.background,
    fontWeight: "800",
    fontSize: 15,
  },
  resend: {
    marginTop: 24,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});

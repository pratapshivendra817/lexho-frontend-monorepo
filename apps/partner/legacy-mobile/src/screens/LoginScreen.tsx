import React, { useMemo, useState } from "react";
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
import { adminLogin } from "../services/authService";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => isValidEmail(email) && password.trim().length >= 6 && !loading,
    [email, loading, password]
  );

  const onLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (normalizedPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await adminLogin({ email: normalizedEmail, password: normalizedPassword });
      navigation.navigate("Otp", {
        email: normalizedEmail,
        password: normalizedPassword,
      });
    } catch (e: any) {
      setError(e?.message || "Unable to login. Please try again.");
    } finally {
      setLoading(false);
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
          <Text style={styles.badge}>Admin Portal</Text>
          <Text style={styles.title}>Secure Sign In</Text>
          <Text style={styles.subtitle}>Email + Password + OTP verification</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="admin@company.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="Enter password"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!canSubmit}
            onPress={onLogin}
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
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
  glowOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#7C3AED33",
    top: 30,
    right: -70,
  },
  glowTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#14B8A626",
    bottom: 20,
    left: -50,
  },
  headerBlock: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED33",
    color: "#D7C7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  label: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 8,
  },
  passwordLabel: {
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
});

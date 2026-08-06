import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { sendOtp, verifyOtp } from "../../api/authApi";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { useAppDispatch } from "../../redux/hooks";
import { setSession } from "../../redux/authSlice";
import { resetLocationState } from "../../redux/locationSlice";
import { saveSession } from "../../utils/storage";
import { setAnalyticsUser, trackAnalyticsEvent } from "../../services/firebaseAnalytics";
import { setCrashlyticsUser } from "../../services/firebaseCrashlytics";
import { trackUserLogin, trackUserRegistration } from "../../services/customerAnalyticsEvents";
import { extractAccessToken, extractRefreshToken } from "../../utils/authSessionManager";

const schema = z.object({ otp: z.string().regex(/^\d{4,6}$/, "Enter valid OTP") });

import { COLORS } from '../../theme/colors';

type Form = z.infer<typeof schema>;
const BRAND_BADGE = require("../../assets/images/lexho-login-logo.jpeg");
const LOGIN_BACKGROUND = "#06132D";

export function OtpScreen({ navigation, route }: any) {
  const mobile = route.params.mobile as string;
  const dispatch = useAppDispatch();
  const [timer, setTimer] = useState(30);
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { otp: "" }, resolver: zodResolver(schema) });

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((p) => p - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const verifyMutation = useMutation({ mutationFn: ({ otp }: Form) => verifyOtp(mobile, otp), onSuccess: async (data: any) => {
    const token = extractAccessToken(data);
    const refreshToken = extractRefreshToken(data, null) || undefined;
    const user = data?.user || data?.data?.user || { id: "", mobile };
    if (!token) throw new Error("Token missing");
    dispatch(resetLocationState());
    await saveSession(token, refreshToken, user);
    dispatch(setSession({ token, refreshToken, user }));
    await setAnalyticsUser(user?.id);
    await setCrashlyticsUser(user?.id);
    await trackAnalyticsEvent("login_success", {
      method: "otp",
      user_id_present: Boolean(user?.id),
    });
    await trackUserLogin({
      method: "otp",
      user_id_present: Boolean(user?.id),
    });
    const isNewUser = Boolean(
      data?.isNewUser ??
        data?.newUser ??
        data?.data?.isNewUser ??
        data?.data?.newUser ??
        data?.data?.registered,
    );
    if (isNewUser) {
      await trackUserRegistration({
        method: "otp",
        user_id_present: Boolean(user?.id),
      });
    }
  }});

  const resendMutation = useMutation({ mutationFn: () => sendOtp(mobile), onSuccess: () => setTimer(30) });
  const submitOtp = handleSubmit((values) => {
    if (!verifyMutation.isPending) verifyMutation.mutate(values);
  });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Pressable style={styles.dismissArea} onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Image source={BRAND_BADGE} style={styles.logo} resizeMode="contain" accessible accessibilityLabel="Lexho logo" />
          </View>
          <View style={styles.panel}>
            <Text variant="headlineMedium" style={styles.title}>Verify OTP</Text>
            <Text style={styles.sub}>Enter the secure code sent to +91 {mobile}</Text>
            <Controller control={control} name="otp" render={({ field: { value, onChange } }) => (
              <TextInput
                mode="outlined"
                label="OTP"
                keyboardType="number-pad"
                value={value}
                onChangeText={(text: string) => onChange(text.replace(/\D/g, "").slice(0, 6))}
                onSubmitEditing={submitOtp}
                maxLength={6}
                error={!!errors.otp}
                textColor={COLORS.white}
                cursorColor={COLORS.goldSoft}
                outlineColor={COLORS.gold}
                activeOutlineColor={COLORS.goldSoft}
                selectionColor={COLORS.goldSoft}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                importantForAutofill="yes"
                accessibilityLabel="OTP"
                accessibilityHint="Enter the OTP sent to your mobile number"
                style={styles.input}
                theme={{ colors: { onSurfaceVariant: COLORS.neutral100 } }}
              />
            )} />
            {errors.otp ? <Text style={styles.err}>{errors.otp.message}</Text> : null}
            <Text style={styles.trustText}>Use the OTP received on your mobile number to continue securely.</Text>
            <PrimaryButton
              label="Verify & Continue"
              onPress={submitOtp}
              loading={verifyMutation.isPending}
              disabled={verifyMutation.isPending}
              buttonColor={COLORS.gold}
              textColor={COLORS.navyDark}
              borderColor={COLORS.goldSoft}
            />
            <PrimaryButton
              label={timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
              onPress={() => resendMutation.mutate()}
              disabled={timer > 0 || resendMutation.isPending}
              loading={resendMutation.isPending}
              buttonColor={COLORS.gold}
              textColor={COLORS.navyDark}
              borderColor={COLORS.goldSoft}
            />
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Change mobile number">
              <Text style={styles.changeNumber}>Change mobile number</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Pressable>
      <Snackbar visible={verifyMutation.isError} onDismiss={() => verifyMutation.reset()}>{verifyMutation.error instanceof Error ? verifyMutation.error.message : "Failed"}</Snackbar>
      <Snackbar visible={resendMutation.isError} onDismiss={() => resendMutation.reset()}>{resendMutation.error instanceof Error ? resendMutation.error.message : "Resend failed"}</Snackbar>
      <Snackbar visible={resendMutation.isSuccess} onDismiss={() => resendMutation.reset()}>OTP resent successfully</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LOGIN_BACKGROUND,
  },
  dismissArea: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 18 },
  brand: { alignItems: "center" },
  logo: { width: "100%", maxWidth: 290, height: 238 },
  panel: {
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 18,
    backgroundColor: LOGIN_BACKGROUND,
    padding: 20,
  },
  title: { color: COLORS.white, fontWeight: "800" },
  sub: { color: COLORS.neutral100 },
  input: { backgroundColor: LOGIN_BACKGROUND },
  err: { color: COLORS.error },
  trustText: { color: COLORS.neutral100, fontSize: 12, lineHeight: 18 },
  changeNumber: { color: COLORS.goldSoft, fontWeight: "800", textAlign: "center", textDecorationLine: "underline" },
});

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { sendOtp } from "../../api/authApi";
import { getCustomerProfileContent } from "../../api/customerProfileApi";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";

const schema = z.object({ mobile: z.string().regex(/^[6-9][0-9]{9}$/, "Enter valid 10-digit mobile") });

import { COLORS } from '../../theme/colors';

const TERMS_CONTENT = `# Terms of Service

By using Lexho, you agree to provide accurate information and use the platform only for lawful home-service bookings.

Service availability, pricing and booking schedules may vary by location. Payments, cancellations and refunds are handled according to the applicable booking terms.

Please contact support if you need help with a booking or payment.`;

const PRIVACY_CONTENT = `# Privacy Policy

Lexho uses your account details, phone number and location information to provide home services, manage bookings and support your requests.

We use reasonable safeguards to protect your information. Your data is shared only where required to deliver services, process payments or comply with applicable law.

You can contact support for privacy-related questions or account assistance.`;

type Form = z.infer<typeof schema>;
const BRAND_BADGE = require("../../assets/images/lexho-login-logo.jpeg");
const LOGIN_BACKGROUND = "#06132D";

export function LoginScreen({ navigation }: any) {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { mobile: "" }, resolver: zodResolver(schema) });
  const mutation = useMutation({ mutationFn: ({ mobile }: Form) => sendOtp(mobile), onSuccess: (_, vars) => navigation.navigate("Otp", { mobile: vars.mobile }) });
  const legalContentQuery = useQuery({
    queryKey: ["customer-profile-content", "login"],
    queryFn: getCustomerProfileContent,
    retry: false,
  });
  const openLegalScreen = (screen: "TermsOfService" | "PrivacyPolicy", content: string) => {
    navigation.getParent()?.navigate(screen, { content });
  };
  const submitMobile = handleSubmit((values) => {
    if (!mutation.isPending) mutation.mutate(values);
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
            <Text variant="headlineMedium" style={styles.title}>Sign in to Lexho</Text>
            <Text style={styles.sub}>Fast home services at your doorstep</Text>
            <Controller control={control} name="mobile" render={({ field: { value, onChange } }) => (
              <TextInput
                mode="outlined"
                label="Mobile Number"
                keyboardType="phone-pad"
                maxLength={10}
                value={value}
                onChangeText={(text: string) => onChange(text.replace(/\D/g, "").slice(0, 10))}
                onSubmitEditing={submitMobile}
                error={!!errors.mobile}
                textColor={COLORS.white}
                cursorColor={COLORS.goldSoft}
                outlineColor={COLORS.gold}
                activeOutlineColor={COLORS.goldSoft}
                selectionColor={COLORS.goldSoft}
                autoComplete="tel"
                textContentType="telephoneNumber"
                importantForAutofill="yes"
                accessibilityLabel="Mobile number"
                accessibilityHint="Enter your 10 digit mobile number to receive an OTP"
                left={<TextInput.Affix text="+91" textStyle={styles.prefix} />}
                style={styles.input}
                theme={{ colors: { onSurfaceVariant: COLORS.neutral100 } }}
              />
            )} />
            {errors.mobile ? <Text style={styles.err}>{errors.mobile.message}</Text> : null}
            <Text style={styles.trustText}>We will send a secure OTP to verify your number.</Text>
            <PrimaryButton
              label="Send OTP"
              onPress={submitMobile}
              loading={mutation.isPending}
              disabled={mutation.isPending}
              accessibilityLabel="Send OTP to verify mobile number"
              buttonColor={COLORS.gold}
              textColor={COLORS.navyDark}
              borderColor={COLORS.goldSoft}
            />
            <Text style={styles.consent}>
              By continuing, you agree to our{" "}
              <Text
                style={styles.legalLink}
                accessibilityRole="link"
                onPress={() => openLegalScreen("TermsOfService", legalContentQuery.data?.termsOfService || TERMS_CONTENT)}
              >
                Terms & Conditions
              </Text>
              {" "}and{" "}
              <Text
                style={styles.legalLink}
                accessibilityRole="link"
                onPress={() => openLegalScreen("PrivacyPolicy", legalContentQuery.data?.privacyPolicy || PRIVACY_CONTENT)}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </Pressable>
      <Snackbar visible={mutation.isError} onDismiss={() => mutation.reset()}>{mutation.error instanceof Error ? mutation.error.message : "Failed"}</Snackbar>
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
  prefix: { color: COLORS.goldSoft, fontWeight: "800" },
  err: { color: COLORS.error },
  trustText: { color: COLORS.neutral100, fontSize: 12, lineHeight: 18 },
  consent: { color: COLORS.neutral100, fontSize: 12, lineHeight: 18, textAlign: "center" },
  legalLink: { color: COLORS.goldSoft, fontWeight: "800", textDecorationLine: "underline" },
});

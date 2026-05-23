import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { sendOtp, verifyOtp } from "../../api/authApi";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { useAppDispatch } from "../../redux/hooks";
import { setSession } from "../../redux/authSlice";
import { resetLocationState } from "../../redux/locationSlice";
import { saveSession } from "../../utils/storage";
import { initializePushNotifications } from "../../services/notificationsService";
import { extractAccessToken, extractRefreshToken } from "../../utils/authSessionManager";

const schema = z.object({ otp: z.string().regex(/^\d{4,6}$/, "Enter valid OTP") });
type Form = z.infer<typeof schema>;

export function OtpScreen({ route }: any) {
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
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[auth:otp:verify:response]", {
        topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [],
        hasData: !!data?.data,
      });
    }
    const token = extractAccessToken(data);
    const refreshToken = extractRefreshToken(data, null) || undefined;
    const user = data?.user || data?.data?.user || { id: "", mobile };
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[auth:otp:verify:extracted]", {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUser: !!user,
      });
    }
    if (!token) throw new Error("Token missing");
    dispatch(resetLocationState());
    await saveSession(token, refreshToken, user);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[auth:otp:verify:saveSession:done]");
    }
    dispatch(setSession({ token, refreshToken, user }));
    await initializePushNotifications();
  }});

  const resendMutation = useMutation({ mutationFn: () => sendOtp(mobile), onSuccess: () => setTimer(30) });

  return (
    <View style={styles.root}>
      <Text variant="headlineMedium">Verify OTP</Text>
      <Text style={styles.sub}>Code sent to +91 {mobile}</Text>
      <Controller control={control} name="otp" render={({ field: { value, onChange } }) => (
        <TextInput mode="outlined" label="OTP" keyboardType="number-pad" value={value} onChangeText={onChange} maxLength={6} error={!!errors.otp} />
      )} />
      {errors.otp ? <Text style={styles.err}>{errors.otp.message}</Text> : null}
      <PrimaryButton label="Verify & Continue" onPress={handleSubmit((v) => verifyMutation.mutate(v))} loading={verifyMutation.isPending} />
      <PrimaryButton label={timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"} onPress={() => resendMutation.mutate()} disabled={timer > 0 || resendMutation.isPending} loading={resendMutation.isPending} />
      <Snackbar visible={verifyMutation.isError} onDismiss={() => verifyMutation.reset()}>{verifyMutation.error instanceof Error ? verifyMutation.error.message : "Failed"}</Snackbar>
      <Snackbar visible={resendMutation.isError} onDismiss={() => resendMutation.reset()}>{resendMutation.error instanceof Error ? resendMutation.error.message : "Resend failed"}</Snackbar>
      <Snackbar visible={resendMutation.isSuccess} onDismiss={() => resendMutation.reset()}>OTP resent successfully</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, justifyContent: "center", padding: 20, gap: 12 }, sub: { color: "#64748B" }, err: { color: "#DC2626" } });

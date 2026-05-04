import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { sendOtp } from "../../api/authApi";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";

const schema = z.object({ mobile: z.string().regex(/^\d{10}$/, "Enter valid 10-digit mobile") });
type Form = z.infer<typeof schema>;

export function LoginScreen({ navigation }: any) {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { mobile: "" }, resolver: zodResolver(schema) });
  const mutation = useMutation({ mutationFn: ({ mobile }: Form) => sendOtp(mobile), onSuccess: (_, vars) => navigation.navigate("Otp", { mobile: vars.mobile }) });

  return (
    <View style={styles.root}>
      <Text variant="headlineMedium">Sign in to Lexho</Text>
      <Text style={styles.sub}>Fast home services at your doorstep</Text>
      <Controller control={control} name="mobile" render={({ field: { value, onChange } }) => (
        <TextInput mode="outlined" label="Mobile Number" keyboardType="number-pad" maxLength={10} value={value} onChangeText={onChange} error={!!errors.mobile} />
      )} />
      {errors.mobile ? <Text style={styles.err}>{errors.mobile.message}</Text> : null}
      <PrimaryButton label="Send OTP" onPress={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending} />
      <Snackbar visible={mutation.isError} onDismiss={() => mutation.reset()}>{mutation.error instanceof Error ? mutation.error.message : "Failed"}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, justifyContent: "center", padding: 20, gap: 12 }, sub: { color: "#64748B" }, err: { color: "#DC2626" } });

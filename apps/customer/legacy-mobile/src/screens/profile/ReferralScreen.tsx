import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { applyReferral, generateReferral } from "../../api/referralApi";

const schema = z.object({ code: z.string().min(4, "Enter valid referral code") });

import { COLORS } from '../../theme/colors';

type Form = z.infer<typeof schema>;

export function ReferralScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { code: "" }, resolver: zodResolver(schema) });
  const generate = useMutation({ mutationFn: generateReferral });
  const apply = useMutation({ mutationFn: ({ code }: Form) => applyReferral({ code }) });

  return (
    <View style={styles.root}>
      <Card style={styles.card}>
        <Card.Title title="Referral Program" />
        <Card.Content style={styles.form}>
          <Button mode="contained" onPress={() => generate.mutate()} loading={generate.isPending}>Generate My Code</Button>
          <Text style={styles.code}>{generate.data?.code ?? generate.data?.data?.code ?? "No code generated"}</Text>
          <Controller control={control} name="code" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Enter referral code" value={value} onChangeText={onChange} autoCapitalize="characters" />} />
          {errors.code ? <Text style={styles.err}>{errors.code.message}</Text> : null}
          <Button mode="outlined" onPress={handleSubmit((v) => apply.mutate(v))} loading={apply.isPending}>Apply Referral</Button>
        </Card.Content>
      </Card>
      <Snackbar visible={apply.isError} onDismiss={() => apply.reset()}>{apply.error instanceof Error ? apply.error.message : "Apply failed"}</Snackbar>
      <Snackbar visible={apply.isSuccess} onDismiss={() => apply.reset()}>Referral applied</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16 }, card: { borderRadius: 16 }, form: { gap: 10 }, code: { fontWeight: "700", color: COLORS.slate900 }, err: { color: COLORS.danger } });






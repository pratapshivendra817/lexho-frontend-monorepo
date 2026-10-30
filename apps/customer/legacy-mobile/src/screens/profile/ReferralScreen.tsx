import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { applyReferral, generateReferral, getMyAppliedReferral } from "../../api/referralApi";
import { SkeletonList } from "../../components/common/SkeletonList";
import { palette, radii, spacing } from "../../constants/theme";
import { COLORS } from "../../theme/colors";

const schema = z.object({ code: z.string().min(4, "Enter a valid referral code") });
type Form = z.infer<typeof schema>;

function readableStatus(value?: string) {
  const status = String(value ?? "PENDING").trim().toUpperCase();
  return `${status.charAt(0)}${status.slice(1).toLowerCase()}`;
}

export function ReferralScreen() {
  const queryClient = useQueryClient();
  const { control, handleSubmit, formState: { errors }, reset } = useForm<Form>({ defaultValues: { code: "" }, resolver: zodResolver(schema) });
  const [referralCode, setReferralCode] = useState("");
  const [snackMessage, setSnackMessage] = useState("");
  const [snackVisible, setSnackVisible] = useState(false);
  const appliedQuery = useQuery({ queryKey: ["my-applied-referral"], queryFn: getMyAppliedReferral });
  const generate = useMutation({
    mutationFn: generateReferral,
    onSuccess: result => {
      if (!result.code) {
        setSnackMessage("Referral code could not be generated. Please try again.");
      } else {
        setReferralCode(result.code);
        setSnackMessage("Referral code is ready to share.");
      }
      setSnackVisible(true);
    },
  });
  const apply = useMutation({
    mutationFn: ({ code }: Form) => applyReferral({ code }),
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ["my-applied-referral"] });
      setSnackMessage("Referral applied successfully.");
      setSnackVisible(true);
    },
  });

  useEffect(() => {
    generate.mutate();
    // A generated referral code is the only supported source for the current customer's share code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const referralLink = referralCode ? `https://lexho.app/signup?ref=${encodeURIComponent(referralCode)}` : "";
  const shareValue = async (value: string, title: string) => {
    if (!value) return;
    try {
      await Share.share({ message: value, title });
      setSnackMessage("Share sheet opened. You can also select the text to copy it.");
      setSnackVisible(true);
    } catch {
      Alert.alert("Share referral", "Tap and hold the code or link to copy it manually.");
    }
  };

  return (
    <View style={styles.root}>
      <Card style={styles.card}>
        <Card.Title title="Refer & Earn" subtitle="Share your code with friends." />
        <Card.Content style={styles.form}>
          <View style={styles.shareCard}>
            <View style={styles.shareRow}>
              <Text style={styles.label}>Your referral code</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Generate referral code" onPress={() => generate.mutate()}>
                <MaterialCommunityIcon name="refresh" size={18} color={COLORS.goldSoft} />
              </Pressable>
            </View>
            {generate.isPending && !referralCode ? <SkeletonList rows={1} /> : <Text selectable style={styles.code}>{referralCode || "Unavailable"}</Text>}
            <View style={styles.inlineActions}>
              <Button mode="contained" onPress={() => shareValue(referralCode, "Referral code")} disabled={!referralCode}>Share code</Button>
              <Button mode="outlined" onPress={() => generate.mutate()} loading={generate.isPending}>Refresh</Button>
            </View>
          </View>

          <View style={styles.shareCard}>
            <Text style={styles.label}>Referral link</Text>
            <Text selectable style={styles.linkText}>{referralLink || "Your referral link will appear here."}</Text>
            <View style={styles.inlineActions}>
              <Button mode="contained" onPress={() => shareValue(referralLink, "Referral link")} disabled={!referralLink}>Share link</Button>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How rewards work</Text>
            <Text style={styles.infoText}>Referral rewards are credited only after your referred friend's first successful paid booking.</Text>
          </View>

          {appliedQuery.data ? (
            <View style={styles.appliedCard}>
              <Text style={styles.infoTitle}>Applied referral</Text>
              <Text style={styles.appliedCode}>{appliedQuery.data.referralCode || "Referral applied"}</Text>
              <Text style={styles.infoText}>Status: {readableStatus(appliedQuery.data.status)}</Text>
            </View>
          ) : null}

          {!appliedQuery.data ? (
            <>
              <Text style={styles.sectionTitle}>Have a referral code?</Text>
              <Controller control={control} name="code" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Enter referral code" value={value} onChangeText={onChange} autoCapitalize="characters" autoCorrect={false} />} />
              {errors.code ? <Text style={styles.err}>{errors.code.message}</Text> : null}
              <Button mode="outlined" onPress={handleSubmit(values => apply.mutate(values))} loading={apply.isPending}>Apply referral</Button>
            </>
          ) : null}
        </Card.Content>
      </Card>
      <Snackbar visible={Boolean(generate.error)} onDismiss={() => generate.reset()}>{generate.error instanceof Error ? generate.error.message : "Unable to generate referral code"}</Snackbar>
      <Snackbar visible={Boolean(appliedQuery.error)} onDismiss={() => queryClient.invalidateQueries({ queryKey: ["my-applied-referral"] })}>{appliedQuery.error instanceof Error ? appliedQuery.error.message : "Referral details unavailable"}</Snackbar>
      <Snackbar visible={apply.isError} onDismiss={() => apply.reset()}>{apply.error instanceof Error ? apply.error.message : "Unable to apply referral"}</Snackbar>
      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)}>{snackMessage}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: palette.bg },
  card: { borderRadius: 20, backgroundColor: COLORS.navyDark, borderWidth: 1, borderColor: COLORS.goldSoft },
  form: { gap: 14 },
  shareCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: "rgba(224,169,75,0.45)", backgroundColor: COLORS.navy, padding: 14, gap: 8 },
  shareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  code: { fontWeight: "900", color: COLORS.white, fontSize: 24, letterSpacing: 1.2 },
  linkText: { color: COLORS.neutral100, fontWeight: "700", lineHeight: 20 },
  inlineActions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  infoCard: { borderRadius: radii.lg, backgroundColor: "rgba(224,169,75,0.12)", padding: 14, gap: 6 },
  appliedCard: { borderRadius: radii.lg, backgroundColor: "rgba(224,169,75,0.18)", padding: 14, gap: 6 },
  infoTitle: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  infoText: { color: COLORS.neutral100, lineHeight: 20, fontWeight: "600" },
  appliedCode: { color: COLORS.goldSoft, fontWeight: "900", fontSize: 18 },
  sectionTitle: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  err: { color: COLORS.danger },
});

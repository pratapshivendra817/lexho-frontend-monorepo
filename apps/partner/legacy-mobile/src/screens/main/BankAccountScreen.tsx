import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { getPartnerBankDetails, updatePartnerBankDetails } from "../../services/partnerService";
import type { PartnerBankDetails } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function normalizeBankAccountInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 18);
}

export function normalizeIfscInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

export function validateBankAccountDetails(accountNumber: string, ifscCode: string) {
  const normalizedAccount = normalizeBankAccountInput(accountNumber);
  const normalizedIfsc = ifscCode.trim().toUpperCase();

  if (normalizedAccount.length < 9 || normalizedAccount.length > 18) {
    return { error: "Enter a valid bank account number" as const, normalizedAccount, normalizedIfsc };
  }

  if (!IFSC_PATTERN.test(normalizedIfsc)) {
    return { error: "Enter a valid IFSC code" as const, normalizedAccount, normalizedIfsc };
  }

  return { error: null, normalizedAccount, normalizedIfsc };
}

export default function BankAccountScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [saved, setSaved] = useState<PartnerBankDetails | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await getPartnerBankDetails();
      setSaved(next);
      setIfscCode(next?.ifscCode ?? "");
    } catch (error: any) {
      toast(error?.message ?? "Unable to load bank account");
    }
  }, [toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const save = async () => {
    const { error, normalizedAccount, normalizedIfsc } = validateBankAccountDetails(accountNumber, ifscCode);
    if (error) {
      toast(error);
      return;
    }

    setSaving(true);
    try {
      setSaved(await updatePartnerBankDetails({ accountNumber: normalizedAccount, ifscCode: normalizedIfsc }));
      setAccountNumber("");
      toast("Bank account updated");
      await load();
    } catch (error: any) {
      toast(error?.message ?? "Unable to update bank account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PaymentHeader title="Bank Account" onBack={() => navigation.goBack()} />
        <Text style={styles.subtitle}>Your account number is masked after saving.</Text>
        <View style={[styles.saved, styles.fullBleed]}>
          <MaterialCommunityIcons name="bank-outline" size={28} color={COLORS.secondary} />
          <View style={styles.savedCopy}>
            <Text style={styles.label}>Linked Account</Text>
            <Text style={styles.account}>{saved?.maskedAccountNumber || "No bank account linked"}</Text>
            {saved?.ifscCode ? <Text style={styles.meta}>IFSC: {saved.ifscCode}</Text> : null}
            <Text style={styles.meta}>Verification: {saved?.verificationStatus ?? "PENDING"}</Text>
          </View>
        </View>
        {saved?.verificationStatus && String(saved.verificationStatus).toUpperCase() !== "APPROVED" ? (
          <View style={[styles.actionBanner, styles.fullBleed]}>
            <Text style={styles.actionTitle}>Action Required</Text>
            <Text style={styles.actionText}>
              {saved.rejectionReason || "Bank account verification is pending. Please confirm your account number and IFSC are correct."}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{saved ? "Update Bank Account" : "Add Bank Account"}</Text>
        <TextInput
          testID="bank-account-number-input"
          value={accountNumber}
          onChangeText={(value) => setAccountNumber(normalizeBankAccountInput(value))}
          keyboardType="number-pad"
          placeholder="Account number"
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, styles.fullBleed]}
          accessibilityLabel="Bank account number"
        />
        <TextInput
          testID="bank-ifsc-input"
          value={ifscCode}
          onChangeText={(value) => setIfscCode(normalizeIfscInput(value))}
          autoCapitalize="characters"
          placeholder="IFSC code"
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, styles.fullBleed]}
          accessibilityLabel="IFSC code"
        />
        <TouchableOpacity testID="bank-save-button" style={[styles.button, styles.fullBleed, saving && styles.disabled]} disabled={saving} onPress={save}>
          <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Bank Account"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  fullBleed: { marginHorizontal: -16 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13 },
  saved: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  savedCopy: { flex: 1, gap: 4 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  account: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800" },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  actionBanner: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 12, backgroundColor: COLORS.surfaceElevated, padding: 12, gap: 4 },
  actionTitle: { color: COLORS.accent, fontWeight: "900" },
  actionText: { color: COLORS.textPrimary, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800", marginTop: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  button: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: COLORS.secondary },
  disabled: { opacity: 0.55 },
  buttonText: { color: COLORS.background, fontWeight: "800" },
});

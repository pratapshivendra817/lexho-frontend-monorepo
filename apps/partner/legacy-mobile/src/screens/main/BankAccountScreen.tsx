import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { getPartnerBankDetails, updatePartnerBankDetails } from "../../services/partnerService";
import type { PartnerBankDetails } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_COPY = {
  loadError: "Unable to load bank account",
  updateSuccess: "Bank account updated",
  updateError: "Unable to update bank account",
  title: "Bank Account",
  subtitle: "Your account number is masked after saving.",
  linkedAccount: "Linked Account",
  noAccountLinked: "No bank account linked",
  ifsc: "IFSC",
  verification: "Verification",
  actionRequired: "Action Required",
  verificationPendingHint: "Bank account verification is pending. Please confirm your account number and IFSC are correct.",
  updateTitle: "Update Bank Account",
  addTitle: "Add Bank Account",
  accountPlaceholder: "Account number",
  accountAccessibility: "Bank account number",
  ifscPlaceholder: "IFSC code",
  ifscAccessibility: "IFSC code",
  saving: "Saving...",
  saveButton: "Save Bank Account",
} as const;

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
      toast(error?.message ?? BANK_COPY.loadError);
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
      toast(BANK_COPY.updateSuccess);
      await load();
    } catch (error: any) {
      toast(error?.message ?? BANK_COPY.updateError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PaymentHeader title={BANK_COPY.title} onBack={() => navigation.goBack()} />
        <Text style={styles.subtitle}>{BANK_COPY.subtitle}</Text>
        <View style={[styles.saved, styles.fullBleed]}>
          <MaterialCommunityIcons name="bank-outline" size={28} color={COLORS.secondary} />
          <View style={styles.savedCopy}>
            <Text style={styles.label}>{BANK_COPY.linkedAccount}</Text>
            <Text style={styles.account}>{saved?.maskedAccountNumber || BANK_COPY.noAccountLinked}</Text>
            {saved?.ifscCode ? <Text style={styles.meta}>{`${BANK_COPY.ifsc}: ${saved.ifscCode}`}</Text> : null}
            <Text style={styles.meta}>{`${BANK_COPY.verification}: ${saved?.verificationStatus ?? "PENDING"}`}</Text>
          </View>
        </View>
        {saved?.verificationStatus && String(saved.verificationStatus).toUpperCase() !== "APPROVED" ? (
          <View style={[styles.actionBanner, styles.fullBleed]}>
            <Text style={styles.actionTitle}>{BANK_COPY.actionRequired}</Text>
            <Text style={styles.actionText}>
              {saved.rejectionReason || BANK_COPY.verificationPendingHint}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{saved ? BANK_COPY.updateTitle : BANK_COPY.addTitle}</Text>
        <TextInput
          testID="bank-account-number-input"
          value={accountNumber}
          onChangeText={(value) => setAccountNumber(normalizeBankAccountInput(value))}
          keyboardType="number-pad"
          placeholder={BANK_COPY.accountPlaceholder}
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, styles.fullBleed]}
          accessibilityLabel={BANK_COPY.accountAccessibility}
        />
        <TextInput
          testID="bank-ifsc-input"
          value={ifscCode}
          onChangeText={(value) => setIfscCode(normalizeIfscInput(value))}
          autoCapitalize="characters"
          placeholder={BANK_COPY.ifscPlaceholder}
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, styles.fullBleed]}
          accessibilityLabel={BANK_COPY.ifscAccessibility}
        />
        <TouchableOpacity testID="bank-save-button" style={[styles.button, styles.fullBleed, saving && styles.disabled]} disabled={saving} onPress={save}>
          <Text style={styles.buttonText}>{saving ? BANK_COPY.saving : BANK_COPY.saveButton}</Text>
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

import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Checkbox, Text, TextInput } from "react-native-paper";
import { COLORS } from "../../../constants/colors";
import PaymentHeader from "../../../components/payments/PaymentHeader";
import { addEmergencyContact, getEmergencyContacts } from "../services/SOSApiService";
import type { EmergencyContact } from "../types";

const EMERGENCY_CONTACTS_COPY = {
  limitTitle: "Contact limit reached",
  limitBody: "You can add up to 5 emergency contacts.",
  invalidTitle: "Invalid contact",
  invalidBody: "Enter name and valid phone number.",
  addedTitle: "Contact added",
  addedBody: "Emergency contact saved successfully.",
  saveErrorTitle: "Unable to save contact",
  saveErrorBody: "Please check the details and try again.",
  title: "Emergency Contacts",
  helper: "Add up to 5 contacts you want to notify in an emergency.",
  fullName: "Full Name",
  phoneNumber: "Phone Number",
  relationship: "Relationship",
  emailOptional: "Email Address (Optional)",
  primaryContact: "Mark as primary contact",
  saveButton: "Save Emergency Contact",
  noContacts: "No emergency contacts added yet.",
  primaryShort: "Primary",
} as const;

export function EmergencyContactsScreen({ navigation }: any) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [primaryContact, setPrimaryContact] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getEmergencyContacts().then(setContacts).catch(() => null);
  }, []);

  const add = async () => {
    const cleanName = name.trim();
    const cleanPhone = phoneNumber.replace(/[^+\d]/g, "");
    if (contacts.length >= 5) return Alert.alert(EMERGENCY_CONTACTS_COPY.limitTitle, EMERGENCY_CONTACTS_COPY.limitBody);
    if (!cleanName || cleanPhone.length < 7) return Alert.alert(EMERGENCY_CONTACTS_COPY.invalidTitle, EMERGENCY_CONTACTS_COPY.invalidBody);
    setLoading(true);
    try {
      const contact = await addEmergencyContact({ name: cleanName, phoneNumber: cleanPhone, relationship: relationship.trim() || undefined, email: email.trim() || undefined, primaryContact });
      setContacts(current => [contact, ...current.filter(item => item.id !== contact.id)].slice(0, 5));
      setName(""); setPhoneNumber(""); setRelationship(""); setEmail(""); setPrimaryContact(false);
      Alert.alert(EMERGENCY_CONTACTS_COPY.addedTitle, EMERGENCY_CONTACTS_COPY.addedBody);
    } catch {
      Alert.alert(EMERGENCY_CONTACTS_COPY.saveErrorTitle, EMERGENCY_CONTACTS_COPY.saveErrorBody);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <PaymentHeader title={EMERGENCY_CONTACTS_COPY.title} onBack={() => navigation.goBack()} />
      <Text style={styles.helper}>{EMERGENCY_CONTACTS_COPY.helper}</Text>
      <TextInput label={EMERGENCY_CONTACTS_COPY.fullName} value={name} onChangeText={setName} mode="outlined" style={styles.input} textColor={COLORS.textPrimary} outlineColor={COLORS.accent} activeOutlineColor={COLORS.accent} theme={{ colors: { onSurfaceVariant: COLORS.accent, primary: COLORS.accent, background: COLORS.surface } }} />
      <TextInput label={EMERGENCY_CONTACTS_COPY.phoneNumber} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" mode="outlined" style={styles.input} textColor={COLORS.textPrimary} outlineColor={COLORS.accent} activeOutlineColor={COLORS.accent} theme={{ colors: { onSurfaceVariant: COLORS.accent, primary: COLORS.accent, background: COLORS.surface } }} />
      <TextInput label={EMERGENCY_CONTACTS_COPY.relationship} value={relationship} onChangeText={setRelationship} mode="outlined" style={styles.input} textColor={COLORS.textPrimary} outlineColor={COLORS.accent} activeOutlineColor={COLORS.accent} theme={{ colors: { onSurfaceVariant: COLORS.accent, primary: COLORS.accent, background: COLORS.surface } }} />
      <TextInput label={EMERGENCY_CONTACTS_COPY.emailOptional} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" mode="outlined" style={styles.input} textColor={COLORS.textPrimary} outlineColor={COLORS.accent} activeOutlineColor={COLORS.accent} theme={{ colors: { onSurfaceVariant: COLORS.accent, primary: COLORS.accent, background: COLORS.surface } }} />
      <View style={styles.primaryRow}><Checkbox status={primaryContact ? "checked" : "unchecked"} onPress={() => setPrimaryContact(value => !value)} color={COLORS.accent} uncheckedColor={COLORS.accent} /><Text style={styles.primaryText}>{EMERGENCY_CONTACTS_COPY.primaryContact}</Text></View>
      <Button mode="contained" buttonColor="#C62828" loading={loading} disabled={contacts.length >= 5} onPress={() => void add()} style={[styles.button, contacts.length >= 5 && styles.buttonDisabled]} contentStyle={styles.buttonContent} labelStyle={styles.buttonLabel}>{EMERGENCY_CONTACTS_COPY.saveButton}</Button>
      <FlatList style={styles.fullBleed} data={contacts} keyExtractor={item => item.id} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.empty}>{EMERGENCY_CONTACTS_COPY.noContacts}</Text>} renderItem={({ item }) => <Card style={styles.card}><Card.Content style={styles.cardContent}><Text variant="titleMedium" style={styles.cardTitle}>{item.name}{item.primaryContact ? ` (${EMERGENCY_CONTACTS_COPY.primaryShort})` : ""}</Text><Text style={styles.cardText}>{item.phoneNumber}</Text>{item.relationship ? <Text style={styles.cardText}>{item.relationship}</Text> : null}{item.email ? <Text style={styles.cardText}>{item.email}</Text> : null}</Card.Content></Card>} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 18, gap: 12, backgroundColor: COLORS.background },
  fullBleed: {
    alignSelf: "stretch",
    marginHorizontal: -18,
  },
  helper: { color: COLORS.textSecondary, marginTop: 10, marginBottom: 2, lineHeight: 19 },
  input: { backgroundColor: COLORS.surface, marginHorizontal: -18 },
  primaryRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.accent, borderRadius: 12, backgroundColor: COLORS.surface, paddingRight: 12, marginHorizontal: -18 },
  primaryText: { color: COLORS.textPrimary, fontWeight: "700" },
  button: { borderRadius: 14, overflow: "hidden", marginTop: 4, marginHorizontal: -18 },
  buttonDisabled: { opacity: 0.72 },
  buttonContent: { minHeight: 50 },
  buttonLabel: { fontWeight: "900", fontSize: 15 },
  listContent: { paddingTop: 4, paddingBottom: 24 },
  card: { width: "100%", marginTop: 12, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.accent, borderRadius: 22, overflow: "hidden" },
  cardContent: { gap: 6 },
  cardTitle: { color: COLORS.textPrimary, fontWeight: "900" },
  cardText: { color: COLORS.textSecondary, fontSize: 13 },
  empty: { textAlign: "center", marginTop: 24, color: COLORS.accent, fontWeight: "700" },
});

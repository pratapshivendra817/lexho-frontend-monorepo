import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Checkbox } from "react-native-paper";
import { acceptLegalDocument, cancelDeleteAccountRequest, createDeleteAccountRequest, getCustomerFaqs, getDeleteAccountStatus, getLegalDocument, getSupportContact, type LegalDocumentType } from "../../api/complianceApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { CustomButton } from "../../modules/profile/components/CustomButton";
import { DeleteAccountConfirmationModal } from "../../modules/compliance/components/DeleteAccountConfirmationModal";
import { COLORS } from "../../theme/colors";
import { radii, spacing } from "../../constants/theme";

const websiteOptions = [
  { path: "/terms", label: "Terms & Conditions", icon: "file-document-outline" },
  { path: "/privacy", label: "Privacy Policy", icon: "shield-account-outline" },
  { path: "/cancellation-policy", label: "Cancellation Policy", icon: "calendar-remove-outline" },
  { path: "/about", label: "About Lexho", icon: "information-outline" },
  { path: "/manage-data", label: "Manage data", icon: "database-cog-outline" },
];
const date = (value?: string) => value ? new Date(value).toLocaleString() : "Not available";

export function LegalDocumentsScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.sub}>Read Lexho policies and manage your account data on our website.</Text>
      {websiteOptions.map((option) => (
        <Pressable
          key={option.path}
          style={styles.item}
          accessibilityRole="link"
          accessibilityLabel={option.label}
          accessibilityHint="Opens the Lexho website inside the app"
          onPress={() => navigation.navigate("LegalWebsite", { path: option.path, title: option.label })}
        >
          <MaterialCommunityIcon name={option.icon} size={22} color={COLORS.goldSoft} />
          <Text style={styles.itemText}>{option.label}</Text>
          <MaterialCommunityIcon name="chevron-right" size={22} color={COLORS.white} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function ManageDataScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <MaterialCommunityIcon name="database-cog-outline" size={40} color={COLORS.goldSoft} />
      <Text style={styles.heading}>Manage data</Text>
      <Text style={styles.sub}>Manage your Lexho account and personal data.</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Request account deletion</Text>
        <Text style={styles.muted}>You can request deletion of your account and associated personal data. Our team reviews the request before processing it. Your account is not deleted immediately.</Text>
      </View>
      <CustomButton label="Request account deletion" variant="danger" onPress={() => navigation.navigate("DeleteAccount")} />
      <CustomButton label="View deletion request status" variant="ghost" onPress={() => navigation.navigate("DeleteAccountStatus")} />
      <Pressable accessibilityRole="button" accessibilityLabel="Read privacy policy" onPress={() => navigation.navigate("LegalDocumentDetail", { type: "privacy" })}>
        <Text style={styles.action}>Read privacy policy</Text>
      </Pressable>
    </ScrollView>
  );
}

export function LegalDocumentDetailScreen({ route, navigation }: any) {
  const type = route?.params?.type as LegalDocumentType; const document = useQuery({ queryKey:["legal-document", type], queryFn:() => getLegalDocument(type), enabled:Boolean(type) });
  if (document.isLoading) return <View style={styles.loading}><SkeletonList rows={5} /></View>;
  if (document.isError || !document.data?.content) return <View style={styles.loading}><EmptyStateCard title="Document unavailable" subtitle="Please check your connection and retry." onPress={() => void document.refetch()} /></View>;
  const current = document.data;
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}><Text style={styles.heading}>{current.title}</Text><Text style={styles.version}>Version {current.version || "Current"}</Text>{current.effectiveDate ? <Text style={styles.muted}>Effective: {date(current.effectiveDate)}</Text> : null}<Text style={styles.document}>{current.content}</Text><Text style={styles.muted}>Published: {date(current.publishedAt || current.updatedAt)}</Text>{type !== "about" ? <CustomButton label="Review acceptance" onPress={() => navigation.navigate("LegalAcceptance", { type, title: current.title, version: current.version })} /> : null}</ScrollView>;
}

export function LegalAcceptanceScreen({ route, navigation }: any) {
  const { type, title, version } = route.params as { type: LegalDocumentType; title: string; version: string }; const [checked, setChecked] = useState(false);
  const accept = useMutation({ mutationFn:() => acceptLegalDocument(type, version), onSuccess:() => { Alert.alert("Acceptance recorded", "Your acceptance has been saved.", [{ text:"Done", onPress:() => navigation.goBack() }]); } });
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}><Text style={styles.heading}>Accept {title}</Text><View style={styles.notice}><Text style={styles.noticeTitle}>Version {version || "Current"}</Text><Text style={styles.muted}>By accepting, you confirm you have read and agree to this published document.</Text></View><Pressable style={styles.checkRow} onPress={() => setChecked(!checked)}><Checkbox status={checked ? "checked" : "unchecked"} color={COLORS.goldSoft} /><Text style={styles.checkText}>I have read and accept the {title}.</Text></Pressable><CustomButton label="Accept and continue" disabled={!checked} loading={accept.isPending} onPress={() => accept.mutate()} />{accept.isError ? <Text style={styles.error}>{accept.error.message}</Text> : null}</ScrollView>;
}

export function CustomerFaqScreen() {
  const [query, setQuery] = useState(""); const [expanded, setExpanded] = useState<string | null>(null); const faqs = useQuery({ queryKey:["customer-faqs"], queryFn:getCustomerFaqs });
  const rows = useMemo(() => (faqs.data ?? []).filter((item) => `${item.category} ${item.question} ${item.answer}`.toLowerCase().includes(query.toLowerCase())), [faqs.data, query]);
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={faqs.isRefetching} onRefresh={() => void faqs.refetch()} />}><TextInput value={query} onChangeText={setQuery} placeholder="Search FAQs" placeholderTextColor={COLORS.neutral100} style={styles.search} />{faqs.isLoading ? <SkeletonList rows={4} /> : faqs.isError ? <EmptyStateCard title="Could not load FAQs" subtitle="Tap to retry." onPress={() => void faqs.refetch()} /> : rows.length ? rows.map((faq) => <View key={faq.id} style={styles.faq}><Pressable style={styles.faqBtn} onPress={() => setExpanded(expanded === faq.id ? null : faq.id)}><View style={{ flex:1 }}><Text style={styles.category}>{faq.category}</Text><Text style={styles.itemText}>{faq.question}</Text></View><MaterialCommunityIcon name={expanded === faq.id ? "chevron-up" : "chevron-down"} size={22} color={COLORS.goldSoft} /></Pressable>{expanded === faq.id ? <Text style={styles.answer}>{faq.answer}</Text> : null}</View>) : <EmptyStateCard title="No FAQs found" subtitle="Try a different search." />}</ScrollView>;
}

export function CustomerSupportScreen({ navigation }: any) {
  const contact = useQuery({ queryKey:["support-contact"], queryFn:getSupportContact }); const copy = (value?: string) => Alert.alert("Contact information", value || "Not available");
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={contact.isRefetching} onRefresh={() => void contact.refetch()} />}><Text style={styles.heading}>Support</Text><Text style={styles.sub}>Use a support ticket for booking and account issues, or reach our team directly.</Text><CustomButton label="Open support tickets" onPress={() => navigation.navigate("SupportTickets")} />{contact.isLoading ? <SkeletonList rows={2} /> : contact.isError ? <EmptyStateCard title="Contact details unavailable" subtitle="Tap to retry." onPress={() => void contact.refetch()} /> : <><View style={styles.contact}><MaterialCommunityIcon name="email-outline" size={23} color={COLORS.goldSoft} /><View style={{flex:1}}><Text style={styles.itemText}>Email support</Text><Text style={styles.muted}>{contact.data?.email || "Not available"}</Text></View><Pressable onPress={() => contact.data?.email && void Linking.openURL(`mailto:${contact.data.email}`)}><Text style={styles.action}>Email</Text></Pressable></View><View style={styles.contact}><MaterialCommunityIcon name="phone-outline" size={23} color={COLORS.goldSoft} /><View style={{flex:1}}><Text style={styles.itemText}>Call support</Text><Text style={styles.muted}>{contact.data?.phone || "Not available"}</Text></View><Pressable onPress={() => contact.data?.phone && void Linking.openURL(`tel:${contact.data.phone}`)}><Text style={styles.action}>Call</Text></Pressable></View><Pressable style={styles.copy} onPress={() => copy(contact.data?.email || contact.data?.phone)}><Text style={styles.action}>Copy contact information</Text></Pressable></>}</ScrollView>;
}

export function DeleteAccountScreen({ navigation }: any) { return <ScrollView style={styles.root} contentContainerStyle={styles.content}><MaterialCommunityIcon name="alert-outline" size={40} color={COLORS.danger} /><Text style={styles.heading}>Delete account</Text><Text style={styles.sub}>Deleting your account is a request that requires backend review. It is not immediate.</Text><View style={styles.notice}><Text style={styles.noticeTitle}>Before you continue</Text><Text style={styles.muted}>Your profile information may be removed or anonymized under our policy. Booking, payment and refund records may be retained where legally required. Once deletion is permanently processed, account access may no longer be available.</Text></View><CustomButton label="Continue" variant="danger" onPress={() => navigation.navigate("DeleteAccountConfirmation")} /><Pressable onPress={() => navigation.navigate("DeleteAccountStatus")}><Text style={styles.action}>View deletion request status</Text></Pressable></ScrollView>; }
export function DeleteAccountConfirmationScreen({ navigation }: any) { const [visible,setVisible]=useState(true); const request=useMutation({mutationFn:createDeleteAccountRequest,onSuccess:()=>{setVisible(false);navigation.replace("DeleteAccountStatus");}}); return <View style={styles.root}><DeleteAccountConfirmationModal visible={visible} loading={request.isPending} onClose={()=>navigation.goBack()} onConfirm={()=>request.mutate()} />{request.isError?<Text style={styles.error}>{request.error.message}</Text>:null}</View>; }
export function DeleteAccountStatusScreen() { const status=useQuery({queryKey:["delete-account-status"],queryFn:getDeleteAccountStatus}); const cancel=useMutation({mutationFn:cancelDeleteAccountRequest,onSuccess:()=>void status.refetch()}); return <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={status.isRefetching} onRefresh={()=>void status.refetch()}/>}><Text style={styles.heading}>Deletion status</Text>{status.isLoading?<SkeletonList rows={2}/>:status.isError?<EmptyStateCard title="Could not load status" subtitle="Tap to retry." onPress={()=>void status.refetch()}/>:!status.data?<EmptyStateCard title="No deletion request" subtitle="Your account remains active."/>:<View style={styles.notice}><Text style={styles.noticeTitle}>{status.data.status.replace(/_/g," ")}</Text><Text style={styles.muted}>Requested: {date(status.data.requestedAt)}</Text>{status.data.scheduledAt?<Text style={styles.muted}>Scheduled: {date(status.data.scheduledAt)}</Text>:null}{status.data.reason?<Text style={styles.muted}>{status.data.reason}</Text>:null}{status.data.canCancel?<CustomButton label="Cancel deletion request" loading={cancel.isPending} variant="ghost" onPress={()=>Alert.alert("Cancel deletion?","Your account will remain active.",[{text:"Keep request",style:"cancel"},{text:"Cancel deletion",onPress:()=>cancel.mutate()}])}/>:null}{cancel.isError?<Text style={styles.error}>{cancel.error.message}</Text>:null}</View>}</ScrollView>; }

const styles=StyleSheet.create({root:{flex:1,backgroundColor:COLORS.navyDark},content:{padding:spacing.md+2,gap:12,paddingBottom:28},loading:{flex:1,backgroundColor:COLORS.navyDark,padding:18},heading:{color:COLORS.white,fontSize:25,fontWeight:"900"},sub:{color:COLORS.neutral100,fontSize:14,lineHeight:21,marginBottom:6},item:{alignItems:"center",backgroundColor:COLORS.navyDark,borderColor:COLORS.goldSoft,borderRadius:radii.md,borderWidth:1,flexDirection:"row",gap:12,padding:15},itemText:{color:COLORS.white,fontSize:15,fontWeight:"800",flex:1},muted:{color:COLORS.neutral100,fontSize:13,lineHeight:20},version:{color:COLORS.goldSoft,fontWeight:"800"},document:{color:COLORS.white,fontSize:15,lineHeight:24,marginVertical:12},notice:{backgroundColor:"rgba(217,164,65,.13)",borderColor:COLORS.goldSoft,borderRadius:radii.md,borderWidth:1,gap:8,padding:15},noticeTitle:{color:COLORS.goldSoft,fontSize:17,fontWeight:"900"},checkRow:{alignItems:"center",flexDirection:"row",gap:4,paddingVertical:10},checkText:{color:COLORS.white,flex:1,lineHeight:20},error:{color:COLORS.danger,marginTop:10},search:{backgroundColor:"rgba(255,255,255,.06)",borderColor:COLORS.goldSoft,borderRadius:10,borderWidth:1,color:COLORS.white,padding:12},faq:{borderBottomColor:"rgba(217,164,65,.35)",borderBottomWidth:1},faqBtn:{alignItems:"center",flexDirection:"row",gap:10,paddingVertical:15},category:{color:COLORS.goldSoft,fontSize:11,fontWeight:"800",textTransform:"uppercase"},answer:{color:COLORS.neutral100,lineHeight:21,paddingBottom:15},contact:{alignItems:"center",backgroundColor:COLORS.navyDark,borderColor:COLORS.goldSoft,borderRadius:radii.md,borderWidth:1,flexDirection:"row",gap:12,padding:15},action:{color:COLORS.goldSoft,fontWeight:"900",paddingVertical:9,textAlign:"center"},copy:{borderColor:COLORS.goldSoft,borderRadius:radii.md,borderWidth:1,paddingHorizontal:12,marginTop:2} });

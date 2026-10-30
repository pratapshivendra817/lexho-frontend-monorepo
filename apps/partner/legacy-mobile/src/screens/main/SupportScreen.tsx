import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { APP_CONFIG } from "../../constants/app";
import { COLORS } from "../../constants/colors";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import {
  createPartnerSupportTicket,
  fetchPartnerSupportTicketDetail,
  fetchPartnerSupportTickets,
  type PartnerSupportTicket,
  type PartnerSupportTicketPriority,
  type PartnerSupportTicketStatus,
} from "../../services/supportService";

const SUPPORT_COPY = {
  title: "Support",
  faqTitle: "FAQ",
  faqBody: "Find answers for payments, cancellations, and service start issues.",
  raiseTicketTitle: "Raise Ticket",
  raiseTicketBody: "Create a support request and track replies from the support team.",
  contactUs: "Contact Us",
  callSupport: "Call Support",
  emailSupport: "Email Support",
  newTicketTitle: "New Ticket",
  subject: "Subject",
  description: "Description",
  categoryOptional: "Category ID (optional)",
  bookingOptional: "Booking ID (optional)",
  createTicket: "Create Ticket",
  ticketCreated: "Support ticket created",
  ticketHistoryTitle: "Ticket History",
  ticketDetailTitle: "Ticket Detail",
  noTicketsYet: "No support tickets yet.",
  generalCategory: "GENERAL",
  selectTicketHint: "Select a ticket to view the conversation.",
  noRepliesYet: "No replies yet.",
  loadError: "Unable to load support tickets",
  detailError: "Unable to load ticket details",
  createError: "Unable to create support ticket",
  subjectRequired: "Subject is required",
  messageRequired: "Message is required",
  submitting: "Submitting...",
  logout: "Logout",
  logoutTitle: "Logout",
  logoutMessage: "Are you sure you want to logout?",
  cancel: "Cancel",
  all: "ALL",
} as const;

export default function SupportScreen({ onLogout, navigation }: { onLogout?: () => Promise<void> | void; navigation?: any }) {
  const { toast } = useAppFeedback();
  const [tickets, setTickets] = useState<PartnerSupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<PartnerSupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<PartnerSupportTicketStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [priority, setPriority] = useState<PartnerSupportTicketPriority>("MEDIUM");

  const priorityLabel = (value: PartnerSupportTicketPriority | string) => String(value);
  const statusLabel = (value: PartnerSupportTicketStatus | string) => String(value);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await fetchPartnerSupportTickets({ status: statusFilter, page: 0, size: 20 });
      setTickets(response.tickets);
      if (response.tickets.length === 0) {
        setSelectedTicketId("");
        setSelectedTicket(null);
        return;
      }
      const nextSelectedId = response.tickets.some((ticket) => ticket.id === selectedTicketId)
        ? selectedTicketId
        : response.tickets[0]?.id || "";
      setSelectedTicketId(nextSelectedId);
    } catch (error: any) {
      toast(error?.message ?? SUPPORT_COPY.loadError);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    if (!ticketId) return;
    try {
      const detail = await fetchPartnerSupportTicketDetail(ticketId);
      setSelectedTicket(detail);
    } catch (error: any) {
      toast(error?.message ?? SUPPORT_COPY.detailError);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedTicketId) return;
    void loadTicketDetail(selectedTicketId);
  }, [selectedTicketId]);

  const submitTicket = async () => {
    if (!subject.trim()) {
      toast(SUPPORT_COPY.subjectRequired);
      return;
    }
    if (!message.trim()) {
      toast(SUPPORT_COPY.messageRequired);
      return;
    }
    try {
      setSubmitting(true);
      const created = await createPartnerSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        categoryId: categoryId.trim() || undefined,
        bookingId: bookingId.trim() || undefined,
        priority,
      });
      toast(SUPPORT_COPY.ticketCreated);
      setSubject("");
      setMessage("");
      setCategoryId("");
      setBookingId("");
      setPriority("MEDIUM");
      await loadTickets();
      setSelectedTicketId(created.id);
      setSelectedTicket(created);
    } catch (error: any) {
      toast(error?.message ?? SUPPORT_COPY.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadTickets()} />}
    >
      <Text style={styles.title}>{SUPPORT_COPY.title}</Text>
      <Card title={SUPPORT_COPY.faqTitle} body={SUPPORT_COPY.faqBody} />
      <Card title={SUPPORT_COPY.raiseTicketTitle} body={SUPPORT_COPY.raiseTicketBody} />
      <Card title={SUPPORT_COPY.contactUs} body={`${APP_CONFIG.supportPhone}\n${APP_CONFIG.supportEmail}`} />

      <TouchableOpacity style={[styles.btn, styles.fullBleed]} onPress={() => Linking.openURL(`tel:${APP_CONFIG.supportPhone.replace(/\s+/g, "")}`)}>
        <Text style={styles.btnText}>{SUPPORT_COPY.callSupport}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleed]} onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}>
        <Text style={styles.btnText}>{SUPPORT_COPY.emailSupport}</Text>
      </TouchableOpacity>

      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>{SUPPORT_COPY.newTicketTitle}</Text>
        <TextInput testID="support-subject-input" value={subject} onChangeText={setSubject} placeholder={SUPPORT_COPY.subject} placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <TextInput
          testID="support-message-input"
          value={message}
          onChangeText={setMessage}
          placeholder={SUPPORT_COPY.description}
          placeholderTextColor={COLORS.textSecondary}
          multiline
          style={[styles.input, styles.textarea]}
        />
        <TextInput value={categoryId} onChangeText={setCategoryId} placeholder={SUPPORT_COPY.categoryOptional} placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <TextInput value={bookingId} onChangeText={setBookingId} placeholder={SUPPORT_COPY.bookingOptional} placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <View style={styles.priorityRow}>
          {(["LOW", "MEDIUM", "HIGH", "URGENT"] as PartnerSupportTicketPriority[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.pill, priority === item ? styles.pillActive : null]}
              onPress={() => setPriority(item)}
            >
              <Text style={[styles.pillText, priority === item ? styles.pillTextActive : null]}>{priorityLabel(item)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity testID="support-submit-button" style={[styles.btn, submitting ? styles.btnDisabled : null]} disabled={submitting} onPress={() => void submitTicket()}>
          <Text style={styles.btnText}>{submitting ? SUPPORT_COPY.submitting : SUPPORT_COPY.createTicket}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>{SUPPORT_COPY.ticketHistoryTitle}</Text>
        <View style={styles.filterRow}>
          {(["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as Array<PartnerSupportTicketStatus | "">).map((item) => (
            <TouchableOpacity
              key={item || "ALL"}
              style={[styles.filterChip, statusFilter === item ? styles.filterChipActive : null]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterChipText, statusFilter === item ? styles.filterChipTextActive : null]}>
                {item ? statusLabel(item) : SUPPORT_COPY.all}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading && tickets.length === 0 ? <ActivityIndicator color={COLORS.secondary} /> : null}
        {!loading && tickets.length === 0 ? <Text style={styles.emptyText}>{SUPPORT_COPY.noTicketsYet}</Text> : null}
        {tickets.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            style={[styles.ticketItem, selectedTicketId === ticket.id ? styles.ticketItemActive : null]}
            onPress={() => setSelectedTicketId(ticket.id)}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketStatus}>{statusLabel(ticket.status)}</Text>
            </View>
            <Text style={styles.ticketMeta}>
              {(ticket.categoryId || SUPPORT_COPY.generalCategory)} {ticket.priority ? `- ${priorityLabel(ticket.priority)}` : ""} {ticket.bookingId ? `- ${ticket.bookingId}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>{SUPPORT_COPY.ticketDetailTitle}</Text>
        {!selectedTicket ? (
          <Text style={styles.emptyText}>{SUPPORT_COPY.selectTicketHint}</Text>
        ) : (
          <View style={styles.detailWrap}>
            <Text style={styles.detailTitle}>{selectedTicket.subject}</Text>
            <Text style={styles.ticketMeta}>
              {selectedTicket.id} - {statusLabel(selectedTicket.status)} - {priorityLabel(selectedTicket.priority || "MEDIUM")}
            </Text>
            {(selectedTicket.messages ?? []).length === 0 ? (
              <Text style={styles.emptyText}>{SUPPORT_COPY.noRepliesYet}</Text>
            ) : (
              (selectedTicket.messages ?? []).map((item) => (
                <View key={`${item.id || item.createdAt}-${item.sender}`} style={[styles.messageBubble, item.sender === "SUPPORT" ? styles.messageSupport : styles.messagePartner]}>
                  <Text style={styles.messageSender}>{String(item.sender)}</Text>
                  <Text style={styles.messageBody}>{item.message}</Text>
                  <Text style={styles.messageTime}>{item.createdAt || "-"}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {onLogout ? (
        <TouchableOpacity
          testID="support-logout-button"
          style={[styles.btn, styles.logoutBtn, styles.fullBleed]}
          onPress={() =>
            Alert.alert(SUPPORT_COPY.logoutTitle, SUPPORT_COPY.logoutMessage, [
              { text: SUPPORT_COPY.cancel, style: "cancel" },
              { text: SUPPORT_COPY.logout, style: "destructive", onPress: () => void onLogout() },
            ])
          }
        >
          <Text style={styles.logoutText}>{SUPPORT_COPY.logout}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <View style={[styles.card, styles.fullBleed]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  fullBleed: { marginHorizontal: -16 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, padding: 12, gap: 10 },
  cardTitle: { color: COLORS.textPrimary, fontWeight: "700" },
  cardBody: { color: COLORS.textSecondary, marginTop: 4 },
  btn: { borderRadius: 12, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
  logoutBtn: { borderColor: "#B42318", marginTop: 8 },
  logoutText: { color: "#B42318", fontWeight: "800" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  priorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  pillActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  pillText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: COLORS.white },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: COLORS.white },
  emptyText: { color: COLORS.textSecondary },
  ticketItem: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: COLORS.background },
  ticketItemActive: { borderColor: COLORS.secondary },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  ticketSubject: { color: COLORS.textPrimary, fontWeight: "700", flex: 1 },
  ticketStatus: { color: COLORS.secondary, fontWeight: "700" },
  ticketMeta: { color: COLORS.textSecondary, fontSize: 12 },
  detailWrap: { gap: 10 },
  detailTitle: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  messageBubble: { borderRadius: 12, padding: 12, gap: 4 },
  messageSupport: { backgroundColor: COLORS.surfaceElevated },
  messagePartner: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  messageSender: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  messageBody: { color: COLORS.textPrimary },
  messageTime: { color: COLORS.textSecondary, fontSize: 11 },
});

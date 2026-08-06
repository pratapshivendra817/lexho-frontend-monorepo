import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
      toast(error?.message ?? "Unable to load support tickets");
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
      toast(error?.message ?? "Unable to load ticket details");
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
      toast("Subject is required");
      return;
    }
    if (!message.trim()) {
      toast("Message is required");
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
      toast("Support ticket created");
      setSubject("");
      setMessage("");
      setCategoryId("");
      setBookingId("");
      setPriority("MEDIUM");
      await loadTickets();
      setSelectedTicketId(created.id);
      setSelectedTicket(created);
    } catch (error: any) {
      toast(error?.message ?? "Unable to create support ticket");
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
      <Text style={styles.title}>Support</Text>
      <Card title="FAQ" body="Find answers for payments, cancellations, and service start issues." />
      <Card title="Raise Ticket" body="Create a support request and track replies from the support team." />
      <Card title="Contact Support" body={`${APP_CONFIG.supportPhone}\n${APP_CONFIG.supportEmail}`} />

      <TouchableOpacity style={[styles.btn, styles.fullBleed]} onPress={() => Linking.openURL(`tel:${APP_CONFIG.supportPhone.replace(/\s+/g, "")}`)}>
        <Text style={styles.btnText}>Call Support</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleed]} onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}>
        <Text style={styles.btnText}>Email Support</Text>
      </TouchableOpacity>

      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>New Ticket</Text>
        <TextInput testID="support-subject-input" value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <TextInput
          testID="support-message-input"
          value={message}
          onChangeText={setMessage}
          placeholder="Describe the issue"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          style={[styles.input, styles.textarea]}
        />
        <TextInput value={categoryId} onChangeText={setCategoryId} placeholder="Category ID (optional)" placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <TextInput value={bookingId} onChangeText={setBookingId} placeholder="Booking ID (optional)" placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <View style={styles.priorityRow}>
          {(["LOW", "MEDIUM", "HIGH", "URGENT"] as PartnerSupportTicketPriority[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.pill, priority === item ? styles.pillActive : null]}
              onPress={() => setPriority(item)}
            >
              <Text style={[styles.pillText, priority === item ? styles.pillTextActive : null]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity testID="support-submit-button" style={[styles.btn, submitting ? styles.btnDisabled : null]} disabled={submitting} onPress={() => void submitTicket()}>
          <Text style={styles.btnText}>{submitting ? "Submitting..." : "Submit Ticket"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>Ticket History</Text>
        <View style={styles.filterRow}>
          {(["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as Array<PartnerSupportTicketStatus | "">).map((item) => (
            <TouchableOpacity
              key={item || "ALL"}
              style={[styles.filterChip, statusFilter === item ? styles.filterChipActive : null]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterChipText, statusFilter === item ? styles.filterChipTextActive : null]}>
                {item || "ALL"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading && tickets.length === 0 ? <ActivityIndicator color={COLORS.secondary} /> : null}
        {!loading && tickets.length === 0 ? <Text style={styles.emptyText}>No support tickets yet.</Text> : null}
        {tickets.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            style={[styles.ticketItem, selectedTicketId === ticket.id ? styles.ticketItemActive : null]}
            onPress={() => setSelectedTicketId(ticket.id)}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketStatus}>{ticket.status}</Text>
            </View>
            <Text style={styles.ticketMeta}>
              {(ticket.categoryId || "GENERAL")} {ticket.priority ? `• ${ticket.priority}` : ""} {ticket.bookingId ? `• ${ticket.bookingId}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>Ticket Detail</Text>
        {!selectedTicket ? (
          <Text style={styles.emptyText}>Select a ticket to view the conversation.</Text>
        ) : (
          <View style={styles.detailWrap}>
            <Text style={styles.detailTitle}>{selectedTicket.subject}</Text>
            <Text style={styles.ticketMeta}>
              {selectedTicket.id} • {selectedTicket.status} • {selectedTicket.priority || "MEDIUM"}
            </Text>
            {(selectedTicket.messages ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No replies yet.</Text>
            ) : (
              (selectedTicket.messages ?? []).map((item) => (
                <View key={`${item.id || item.createdAt}-${item.sender}`} style={[styles.messageBubble, item.sender === "SUPPORT" ? styles.messageSupport : styles.messagePartner]}>
                  <Text style={styles.messageSender}>{item.sender}</Text>
                  <Text style={styles.messageBody}>{item.message}</Text>
                  <Text style={styles.messageTime}>{item.createdAt || "-"}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
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

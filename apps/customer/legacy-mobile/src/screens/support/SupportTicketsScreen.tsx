import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { createSupportTicket, getSupportFaqCategories, getSupportHistory } from "../../api/supportApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { palette, radii, shadows, spacing } from "../../constants/theme";
import { COLORS } from '../../theme/colors';

const schema = z.object({
  subject: z.string().min(3, "Subject required"),
  message: z.string().min(8, "Message must be detailed"),
});

type Form = z.infer<typeof schema>;

type FaqItem = { id: string; question: string; answer: string };
type FaqCategory = { id: string; label: string; faqs: FaqItem[]; order?: number };

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "frequently-asked",
    label: "Frequently Asked",
    faqs: [
      {
        id: "booking-cancelled",
        question: "Why was my booking cancelled?",
        answer: "A booking may cancel if partner assignment fails, payment doesn't complete in time, or service area is unavailable.",
      },
      {
        id: "refund-pending",
        question: "I have not received my refund",
        answer: "Refunds usually reflect within 3-7 business days depending on your bank or payment mode.",
      },
      {
        id: "cancellation-fee",
        question: "Why have I been charged a cancellation fee?",
        answer: "Cancellation fee can apply when cancellation is close to service start or after partner is already assigned.",
      },
      {
        id: "slots-unavailable",
        question: "Why can't I see any available slots?",
        answer: "Slots depend on location demand and partner availability. Try another time window or nearby date.",
      },
    ],
  },
  {
    id: "booking",
    label: "Booking",
    faqs: [
      {
        id: "booking-edit",
        question: "Can I reschedule my booking?",
        answer: "Yes, you can reschedule from booking details before service starts, subject to slot availability.",
      },
      {
        id: "booking-track",
        question: "How can I track my partner?",
        answer: "Use the booking status screen to see assignment updates and live tracking when available.",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    faqs: [
      {
        id: "account-mobile",
        question: "How do I change my mobile number?",
        answer: "Contact support from this page and we will verify and update account details securely.",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    faqs: [
      {
        id: "payment-failed",
        question: "Payment failed but amount deducted",
        answer: "If booking did not confirm, the amount is auto-reversed by bank within 3-7 business days.",
      },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    faqs: [
      {
        id: "safety-report",
        question: "How do I report a safety issue?",
        answer: "Please open a support ticket immediately with booking ID and issue details for priority handling.",
      },
    ],
  },
];

export function SupportTicketsScreen({ navigation }: any) {
  const [activeCategory, setActiveCategory] = useState<string>(FAQ_CATEGORIES[0]?.id ?? "frequently-asked");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    defaultValues: { subject: "Support", message: "" },
    resolver: zodResolver(schema),
  });

  const history = useQuery<any>({ queryKey: ["support-history"], queryFn: getSupportHistory });
  const faqQuery = useQuery({ queryKey: ["support-faq-categories"], queryFn: getSupportFaqCategories });
  const remoteFaqData = useMemo(
    () => (Array.isArray(faqQuery.data) ? faqQuery.data : []),
    [faqQuery.data],
  );
  const create = useMutation({
    mutationFn: (values: Form) => createSupportTicket(values),
    onSuccess: () => {
      reset({ subject: "Support", message: "" });
      setOpenForm(false);
      void history.refetch();
    },
  });

  const tickets = useMemo(() => history.data?.data ?? history.data ?? [], [history.data]);
  const hasRemoteFaqData = remoteFaqData.length > 0;
  const faqCategories = useMemo(() => {
    if (hasRemoteFaqData) {
      const remoteCategories = remoteFaqData.map((category: any, categoryIdx: number) => ({
        id: String(category?.id ?? `category-${categoryIdx + 1}`),
        label: String(category?.label ?? category?.name ?? category?.title ?? "General"),
        order: Number(category?.displayOrder ?? category?.order ?? category?.position ?? categoryIdx + 1),
        faqs: (Array.isArray(category?.faqs) ? category.faqs : [])
          .map((faq: any, faqIdx: number) => ({
            id: String(faq?.id ?? `faq-${faqIdx + 1}`),
            question: String(faq?.question ?? faq?.title ?? "").trim(),
            answer: String(faq?.answer ?? faq?.description ?? "").trim(),
          }))
          .filter((faq: FaqItem) => faq.question && faq.answer),
      }));
      const remoteIds = new Set(remoteCategories.map((item) => item.id));
      const missingDefaults = FAQ_CATEGORIES
        .filter((item) => !remoteIds.has(item.id))
        .map((item, idx) => ({ ...item, order: 1000 + idx }));
      return [...remoteCategories, ...missingDefaults].sort(
        (a, b) => Number(a.order ?? 9999) - Number(b.order ?? 9999),
      );
    }
    return FAQ_CATEGORIES.map((item, idx) => ({ ...item, order: idx + 1 }));
  }, [hasRemoteFaqData, remoteFaqData]);

  const effectiveActiveCategory = useMemo(() => {
    const exists = faqCategories.some((item) => item.id === activeCategory);
    return exists ? activeCategory : faqCategories[0]?.id ?? "frequently-asked";
  }, [activeCategory, faqCategories]);
  const activeFaqs = useMemo(() => faqCategories.find((item) => item.id === effectiveActiveCategory)?.faqs ?? [], [effectiveActiveCategory, faqCategories]);

  const onShareTicket = async (item: any) => {
    const message = [
      "Support Ticket",
      `Ticket ID: ${String(item?.id ?? "-")}`,
      `Subject: ${String(item?.subject ?? "Support")}`,
      `Status: ${String(item?.status ?? "OPEN")}`,
      `Message: ${String(item?.message ?? "")}`,
    ].join("\n");
    await Share.share({ title: "Support Ticket", message });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {faqCategories.map((category) => {
            const isActive = category.id === effectiveActiveCategory;
            return (
              <Pressable key={category.id} style={styles.tabBtn} onPress={() => setActiveCategory(category.id)}>
                <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>{category.label}</Text>
                {isActive ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.faqWrap}>
        {faqQuery.isLoading && !hasRemoteFaqData ? <SkeletonList rows={2} /> : null}
        {activeFaqs.map((faq: FaqItem) => {
          const isExpanded = expandedFaq === faq.id;
          return (
            <Card key={faq.id} style={styles.faqCard} mode="contained">
              <Pressable style={styles.faqBtn} onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <MaterialCommunityIcon name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.goldSoft} />
              </Pressable>
              {isExpanded ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
            </Card>
          );
        })}
      </View>

      <View style={styles.helpWrap}>
        <View style={styles.helpHeader}>
          <Text style={styles.helpTitle}>Still need help?</Text>
          <TouchableOpacity style={styles.faqLinkBtn} onPress={() => navigation.navigate("Faq")}>
            <Text style={styles.faqBtnText}>Open FAQs</Text>
          </TouchableOpacity>
        </View>
        <Card style={styles.chatCard} mode="contained">
          <Pressable style={styles.chatBtn} onPress={() => setOpenForm((prev) => !prev)}>
            <View style={styles.chatLeft}>
              <MaterialCommunityIcon name="message-text-outline" size={24} color={COLORS.gold} />
              <Text style={styles.chatText}>Chat with us</Text>
            </View>
            <MaterialCommunityIcon name={openForm ? "chevron-up" : "chevron-right"} size={24} color={COLORS.goldSoft} />
          </Pressable>
        </Card>
      </View>

      {openForm ? (
        <Card style={styles.card}>
          <Card.Title title="Create Support Ticket" titleStyle={styles.formTitle} />
          <Card.Content style={styles.form}>
            <Controller
              control={control}
              name="subject"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  mode="outlined"
                  label="Subject"
                  value={value}
                  onChangeText={onChange}
                  textColor={COLORS.white}
                  outlineColor={COLORS.goldSoft}
                  activeOutlineColor={COLORS.goldSoft}
                  theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }}
                />
              )}
            />
            {errors.subject ? <Text style={styles.err}>{errors.subject.message}</Text> : null}
            <Controller
              control={control}
              name="message"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  mode="outlined"
                  label="Message"
                  multiline
                  value={value}
                  onChangeText={onChange}
                  textColor={COLORS.white}
                  outlineColor={COLORS.goldSoft}
                  activeOutlineColor={COLORS.goldSoft}
                  theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }}
                />
              )}
            />
            {errors.message ? <Text style={styles.err}>{errors.message.message}</Text> : null}
            <Button
              mode="contained"
              onPress={handleSubmit((v) => create.mutate(v))}
              loading={create.isPending}
              buttonColor={COLORS.goldSoft}
              textColor={COLORS.navyDark}
            >
              Submit
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      <View style={styles.historyWrap}>
        <Text style={styles.historyTitle}>Your Tickets</Text>
        {history.isLoading ? <SkeletonList rows={2} /> : null}
        {!history.isLoading && (!Array.isArray(tickets) || tickets.length === 0) ? <EmptyStateCard title="No tickets yet" subtitle="Create a support request and track status here." /> : null}
        {Array.isArray(tickets) ? (
          <FlatList
            data={tickets}
            keyExtractor={(item, idx) => String(item?.id ?? idx)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Card style={styles.ticket}>
                <Card.Content>
                  <Text style={styles.title}>{item?.subject ?? "Support"}</Text>
                  <Text style={styles.ticketMessage}>{item?.message ?? ""}</Text>
                  <Text style={styles.status}>Status: {item?.status ?? "OPEN"}</Text>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareTicket(item)}>
                    <MaterialCommunityIcon name="share-variant-outline" size={16} color={COLORS.goldSoft} />
                    <Text style={styles.shareText}>Share</Text>
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            )}
          />
        ) : null}
      </View>
      <Snackbar visible={create.isError} onDismiss={() => create.reset()}>{create.error instanceof Error ? create.error.message : "Failed to create ticket"}</Snackbar>
      <Snackbar visible={create.isSuccess} onDismiss={() => create.reset()}>Ticket created</Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark },
  content: { paddingBottom: 24 },
  tabsWrap: { backgroundColor: COLORS.navyDark, borderBottomWidth: 1, borderBottomColor: COLORS.goldSoft },
  tabsContent: { paddingHorizontal: spacing.md + 2, gap: spacing.lg + 2 },
  tabBtn: { paddingVertical: spacing.md + 2, alignItems: "center" },
  tabText: { color: COLORS.neutral100, fontSize: 16, fontWeight: "500" },
  tabTextActive: { color: COLORS.goldSoft, fontWeight: "700" },
  tabUnderline: { marginTop: spacing.sm + 2, height: 3, width: "100%", borderRadius: radii.sm, backgroundColor: COLORS.gold },
  faqWrap: { paddingVertical: spacing.md + 2, gap: spacing.sm + 2 },
  faqCard: { borderRadius: radii.lg + 2, backgroundColor: COLORS.navyDark, borderWidth: 1, borderColor: COLORS.goldSoft, ...shadows.sm },
  faqBtn: { minHeight: 72, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "space-between" },
  faqQuestion: { flex: 1, color: COLORS.white, fontSize: 16, fontWeight: "800", lineHeight: 24 },
  faqAnswer: { color: COLORS.neutral100, fontSize: 14, lineHeight: 22, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  helpWrap: { marginTop: spacing.sm, paddingTop: spacing.md + 2, borderTopWidth: 1, borderTopColor: COLORS.goldSoft },
  helpHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  helpTitle: { color: COLORS.white, fontSize: 22, fontWeight: "800" },
  faqLinkBtn: { borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: radii.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 6, backgroundColor: COLORS.navyDark },
  faqBtnText: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "700" },
  chatCard: { borderRadius: radii.lg + 2, backgroundColor: COLORS.navyDark, borderWidth: 1, borderColor: COLORS.goldSoft, ...shadows.sm },
  chatBtn: { minHeight: 72, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  chatText: { color: COLORS.white, fontSize: 18, fontWeight: "700" },
  card: { marginTop: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark, ...shadows.sm },
  form: { gap: 8 },
  historyWrap: { marginTop: spacing.md },
  historyTitle: { color: COLORS.white, fontSize: 18, fontWeight: "800", marginBottom: spacing.sm + 2 },
  ticket: { marginBottom: spacing.sm + 2, borderRadius: radii.sm + 2, borderWidth: 1, borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark, ...shadows.sm },
  title: { fontWeight: "700", color: COLORS.white },
  ticketMessage: { color: COLORS.neutral100 },
  status: { marginTop: 4, color: COLORS.neutral100 },
  formTitle: { color: COLORS.white },
  shareBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: COLORS.navyDark,
  },
  shareText: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "700" },
  err: { color: palette.danger },
});







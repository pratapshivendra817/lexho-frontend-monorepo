import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

import { getSupportFaqCategories } from "../../api/supportApi";

export function FaqScreen() {
  const faqQuery = useQuery({ queryKey: ["support-faq-categories"], queryFn: getSupportFaqCategories });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const categories = Array.isArray(faqQuery.data) ? faqQuery.data : [];
    return categories.flatMap((category: any) =>
      (Array.isArray(category?.faqs) ? category.faqs : []).map((faq: any, index: number) => ({
        id: String(faq?.id ?? `${category?.id ?? "cat"}-${index + 1}`),
        question: String(faq?.question ?? ""),
        answer: String(faq?.answer ?? ""),
      })),
    );
  }, [faqQuery.data]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Frequently Asked Questions</Text>
      {rows.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <Card key={item.id} style={styles.card}>
            <Pressable style={styles.row} onPress={() => setExpandedId(expanded ? null : item.id)}>
              <Text style={styles.question}>{item.question}</Text>
              <MaterialCommunityIcon name={expanded ? "chevron-up" : "chevron-down"} size={22} color="#64748B" />
            </Pressable>
            {expanded ? <Text style={styles.answer}>{item.answer}</Text> : null}
          </Card>
        );
      })}
      {rows.length === 0 ? <Text style={styles.empty}>FAQ not available right now.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 14, gap: 10 },
  heading: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  card: { borderRadius: 12, backgroundColor: "#FFFFFF" },
  row: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  question: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1E293B" },
  answer: { paddingHorizontal: 14, paddingBottom: 14, color: "#475569", lineHeight: 20 },
  empty: { color: "#64748B", fontSize: 14 },
});

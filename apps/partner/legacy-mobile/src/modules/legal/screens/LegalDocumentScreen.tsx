import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PaymentHeader from "../../../components/payments/PaymentHeader";
import { COLORS } from "../../../constants/colors";
import { getPartnerLegalDocument } from "../api/legalContentApi";
import LegalContentRenderer from "../components/LegalContentRenderer";
import type { LegalDocumentSlug, PartnerLegalDocument } from "../types";

const LEGAL_COPY = {
  loadError: "Unable to load legal content",
  version: "Version",
  lastUpdated: "Last updated",
  loading: "Loading...",
  somethingWentWrong: "Something went wrong",
  retry: "Retry",
  emptyTitle: "Content not available",
  emptyDescription: "The latest legal content has not been published yet.",
} as const;

export default function LegalDocumentScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const slug = String(route?.params?.slug ?? "terms-and-conditions") as LegalDocumentSlug;
  const title = String(route?.params?.title ?? "Legal Document");

  const [document, setDocument] = useState<PartnerLegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await getPartnerLegalDocument(slug);
      setDocument(response);
    } catch (loadError: any) {
      setError(String(loadError?.message ?? LEGAL_COPY.loadError));
      setDocument(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const metadata = useMemo(() => {
    if (!document) return [];
    const entries = [];
    if (document.version) entries.push(`${LEGAL_COPY.version} ${document.version}`);
    if (document.updatedAt) {
      entries.push(
        `${LEGAL_COPY.lastUpdated} ${new Date(document.updatedAt).toLocaleDateString()}`,
      );
    }
    return entries;
  }, [document]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        <PaymentHeader title={title} onBack={() => navigation.goBack()} />

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={COLORS.secondary} />
            <Text style={styles.helperText}>{LEGAL_COPY.loading}</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>{LEGAL_COPY.somethingWentWrong}</Text>
            <Text style={styles.helperText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void load()}>
              <Text style={styles.retryText}>{LEGAL_COPY.retry}</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && document && !document.content.trim() ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>{LEGAL_COPY.emptyTitle}</Text>
            <Text style={styles.helperText}>{LEGAL_COPY.emptyDescription}</Text>
          </View>
        ) : null}

        {!loading && !error && document?.content.trim() ? (
          <View style={styles.card}>
            {document.summary ? <Text style={styles.summary}>{document.summary}</Text> : null}
            {metadata.length ? <Text style={styles.meta}>{metadata.join(" • ")}</Text> : null}
            <LegalContentRenderer content={document.content} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    padding: 16,
    gap: 10,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorTitle: {
    color: COLORS.error,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  retryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  retryText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  summary: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});

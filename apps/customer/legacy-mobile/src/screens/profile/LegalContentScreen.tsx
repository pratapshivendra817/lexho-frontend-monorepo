import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCustomerProfileContent } from "../../api/customerProfileApi";
import { COLORS } from "../../theme/colors";

type LegalBlockType = "h1" | "h2" | "p" | "li" | "num" | "quote";

type LegalBlock = {
  type: LegalBlockType;
  text: string;
};

const DEFAULT_LEGAL_CONTENT = {
  AboutUs: `# About Us

Lexho helps customers book trusted home services quickly and conveniently from their phones.

We focus on reliable service partners, smooth bookings, and clear communication so day-to-day home needs feel simple and manageable.

If you need help with your account, bookings, or service experience, please contact our support team.`,
  TermsOfService: `# Terms of Service

By using Lexho, you agree to provide accurate information and use the platform only for lawful home-service bookings.

Service availability, pricing, and booking schedules may vary by location. Payments, cancellations, and refunds are handled according to the applicable booking terms.

Please contact support if you need help with a booking or payment.`,
  PrivacyPolicy: `# Privacy Policy

Lexho uses your account details, phone number, and location information to provide home services, manage bookings, and support your requests.

We use reasonable safeguards to protect your information. Your data is shared only where required to deliver services, process payments, or comply with applicable law.

You can contact support for privacy-related questions or account assistance.`,
} as const;

function normalizeContent(input: string) {
  const withMarkdownHints = input
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, "**$2**")
    .replace(/<(em|i)>(.*?)<\/(em|i)>/gi, "*$2*")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return withMarkdownHints;
}

function parseBlocks(normalizedText: string): LegalBlock[] {
  const lines = normalizedText.split("\n").map((line) => line.trim());
  const blocks: LegalBlock[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (/^#\s+/.test(line)) {
      blocks.push({ type: "h1", text: line.replace(/^#\s+/, "").trim() });
      continue;
    }

    if (/^##\s+/.test(line) || /^###\s+/.test(line)) {
      blocks.push({ type: "h2", text: line.replace(/^#{2,3}\s+/, "").trim() });
      continue;
    }

    if (/^(\*|-)\s+/.test(line)) {
      blocks.push({ type: "li", text: line.replace(/^(\*|-)\s+/, "").trim() });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      blocks.push({ type: "num", text: line.replace(/^\d+\.\s+/, "").trim() });
      continue;
    }

    if (/^>\s+/.test(line)) {
      blocks.push({ type: "quote", text: line.replace(/^>\s+/, "").trim() });
      continue;
    }

    if (/^[A-Z][A-Za-z\s]{2,40}:$/.test(line)) {
      blocks.push({ type: "h2", text: line.replace(/:$/, "") });
      continue;
    }

    blocks.push({ type: "p", text: line });
  }

  if (blocks.length === 0) {
    return [{ type: "p", text: "Content not available" }];
  }

  return blocks;
}

function buildLinkTarget(token: string) {
  if (/^https?:\/\//i.test(token)) return token;
  if (/^www\./i.test(token)) return `https://${token}`;
  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(token)) return `mailto:${token}`;
  if (/^\+?[\d\s-]{8,}$/.test(token)) return `tel:${token.replace(/[\s-]/g, "")}`;
  return "";
}

function renderInline(
  text: string,
  keyPrefix: string,
  textStyle: any,
  boldStyle: any,
  italicStyle: any,
  linkStyle: any,
) {
  const pieces: Array<{ text: string; style: "normal" | "bold" | "italic" }> = [];
  const mdRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let mdMatch: RegExpExecArray | null;

  while ((mdMatch = mdRegex.exec(text)) !== null) {
    const token = mdMatch[0];
    const idx = mdMatch.index;
    if (idx > last) {
      pieces.push({ text: text.slice(last, idx), style: "normal" });
    }
    if (token.startsWith("**") && token.endsWith("**")) {
      pieces.push({ text: token.slice(2, -2), style: "bold" });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      pieces.push({ text: token.slice(1, -1), style: "italic" });
    } else {
      pieces.push({ text: token, style: "normal" });
    }
    last = idx + token.length;
  }
  if (last < text.length) {
    pieces.push({ text: text.slice(last), style: "normal" });
  }

  const output: any[] = [];
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?[\d\s-]{8,}\d)/gi;

  pieces.forEach((piece, idx) => {
    const style = piece.style === "bold" ? [textStyle, boldStyle] : piece.style === "italic" ? [textStyle, italicStyle] : textStyle;
    let partLast = 0;
    let lm: RegExpExecArray | null;

    while ((lm = linkRegex.exec(piece.text)) !== null) {
      const token = lm[0];
      const start = lm.index;
      if (start > partLast) {
        output.push(
          <Text key={`${keyPrefix}-t-${idx}-${partLast}`} style={style}>
            {piece.text.slice(partLast, start)}
          </Text>,
        );
      }

      const href = buildLinkTarget(token);
      if (href) {
        output.push(
          <Text
            key={`${keyPrefix}-l-${idx}-${start}`}
            style={[style, linkStyle]}
            onPress={() => {
              void Linking.openURL(href);
            }}
          >
            {token}
          </Text>,
        );
      } else {
        output.push(
          <Text key={`${keyPrefix}-tx-${idx}-${start}`} style={style}>
            {token}
          </Text>,
        );
      }

      partLast = start + token.length;
    }

    if (partLast < piece.text.length) {
      output.push(
        <Text key={`${keyPrefix}-r-${idx}-${partLast}`} style={style}>
          {piece.text.slice(partLast)}
        </Text>,
      );
    }

    linkRegex.lastIndex = 0;
  });

  return output;
}

export function LegalContentScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [fallbackContent, setFallbackContent] = useState("");
  const [loadError, setLoadError] = useState(false);

  const routeTitle = String(route?.name ?? "");
  const title =
    routeTitle === "TermsOfService"
      ? "Terms of Service"
      : routeTitle === "PrivacyPolicy"
        ? "Privacy Policy"
        : "About Us";
  const defaultContent =
    routeTitle === "TermsOfService"
      ? DEFAULT_LEGAL_CONTENT.TermsOfService
      : routeTitle === "PrivacyPolicy"
        ? DEFAULT_LEGAL_CONTENT.PrivacyPolicy
        : DEFAULT_LEGAL_CONTENT.AboutUs;

  const routeContent = String(route?.params?.content ?? "").trim();
  const lastUpdated = String(route?.params?.lastUpdated ?? "").trim();
  const rawText = (routeContent || fallbackContent || defaultContent).trim();

  const normalizedText = useMemo(() => normalizeContent(rawText), [rawText]);
  const blocks = useMemo(() => parseBlocks(normalizedText), [normalizedText]);

  useEffect(() => {
    if (!routeContent) {
      return () => undefined;
    }

    const timer = setTimeout(() => setShowSkeleton(false), 350);
    return () => clearTimeout(timer);
  }, [refreshSeed, routeContent]);

  useEffect(() => {
    let active = true;

    if (routeContent) {
      setFallbackContent("");
      setLoadError(false);
      return () => {
        active = false;
      };
    }

    setLoadError(false);
    void (async () => {
      try {
        const content = await getCustomerProfileContent();
        if (!active) return;

        const next =
          routeTitle === "TermsOfService"
            ? content.termsOfService
            : routeTitle === "PrivacyPolicy"
              ? content.privacyPolicy
              : content.aboutUs;

        setFallbackContent(String(next ?? "").trim() || defaultContent);
        setLoadError(false);
      } catch {
        if (!active) return;
        setFallbackContent(defaultContent);
        setLoadError(false);
      } finally {
        if (active) {
          setShowSkeleton(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [defaultContent, refreshSeed, routeContent, routeTitle]);

  const hasError = !rawText && loadError;

  const textSize = 16;
  const lineHeight = 24;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top, paddingBottom: 20 + insets.bottom }]}
      >
        <Text style={styles.title}>{title}</Text>

        {showSkeleton ? (
          <View style={styles.skeletonWrap}>
            <ActivityIndicator color={COLORS.goldSoft} />
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineMed} />
            <View style={styles.skeletonLineShort} />
          </View>
        ) : hasError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>Content not available</Text>
            <Text style={styles.errorSub}>Please try again.</Text>
            <View style={styles.errorActions}>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  setShowSkeleton(true);
                  setLoadError(false);
                  setRefreshSeed((s) => s + 1);
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
              <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.retryText}>Back</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.blocksWrap}>
            {blocks.map((block, index) => {
              const key = `legal-block-${index}`;
              if (block.type === "h1") {
                return (
                  <Text key={key} style={[styles.h1, { fontSize: 24, lineHeight: 30 }]}>
                    {block.text}
                  </Text>
                );
              }
              if (block.type === "h2") {
                return (
                  <Text key={key} style={[styles.h2, { fontSize: 19, lineHeight: 25 }]}>
                    {block.text}
                  </Text>
                );
              }
              if (block.type === "quote") {
                return (
                  <Text key={key} style={[styles.quote, { fontSize: textSize, lineHeight }]}> 
                    {renderInline(block.text, key, styles.inlineBase, styles.bold, styles.italic, styles.link)}
                  </Text>
                );
              }
              if (block.type === "li") {
                return (
                  <Text key={key} style={[styles.bullet, { fontSize: textSize, lineHeight }]}> 
                    <Text style={styles.bulletMark}>- </Text>
                    {renderInline(block.text, key, styles.inlineBase, styles.bold, styles.italic, styles.link)}
                  </Text>
                );
              }
              if (block.type === "num") {
                return (
                  <Text key={key} style={[styles.bullet, { fontSize: textSize, lineHeight }]}> 
                    <Text style={styles.bulletMark}>{`${index + 1}. `}</Text>
                    {renderInline(block.text, key, styles.inlineBase, styles.bold, styles.italic, styles.link)}
                  </Text>
                );
              }
              return (
                <Text key={key} style={[styles.body, { fontSize: textSize, lineHeight }]}> 
                  {renderInline(block.text, key, styles.inlineBase, styles.bold, styles.italic, styles.link)}
                </Text>
              );
            })}
          </View>
        )}

        {lastUpdated ? <Text style={styles.lastUpdated}>{`Last updated: ${lastUpdated}`}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#001a4d" },
  scroll: {
    flex: 1,
    backgroundColor: "#001a4d",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  content: { paddingHorizontal: 10 },
  title: {
    color: COLORS.goldSoft,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    marginBottom: 14,
  },
  blocksWrap: { gap: 10 },
  h1: {
    color: COLORS.gold,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 8,
  },
  h2: {
    color: COLORS.goldSoft,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 6,
  },
  body: {
    color: COLORS.white,
    marginBottom: 6,
  },
  bullet: {
    color: COLORS.white,
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletMark: {
    color: COLORS.goldSoft,
    fontWeight: "900",
  },
  quote: {
    color: COLORS.neutral100,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.goldSoft,
    paddingLeft: 10,
    marginBottom: 6,
  },
  inlineBase: {
    color: COLORS.white,
  },
  bold: {
    fontWeight: "800",
    color: COLORS.white,
  },
  italic: {
    fontStyle: "italic",
    color: COLORS.neutral100,
  },
  link: {
    color: "#9ed0ff",
    textDecorationLine: "underline",
  },
  lastUpdated: {
    marginTop: 16,
    color: COLORS.goldSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  skeletonWrap: {
    gap: 10,
    paddingVertical: 16,
  },
  skeletonLineLong: {
    height: 12,
    borderRadius: 6,
    width: "96%",
    backgroundColor: "rgba(217,164,65,0.24)",
  },
  skeletonLineMed: {
    height: 12,
    borderRadius: 6,
    width: "88%",
    backgroundColor: "rgba(217,164,65,0.2)",
  },
  skeletonLineShort: {
    height: 12,
    borderRadius: 6,
    width: "74%",
    backgroundColor: "rgba(217,164,65,0.16)",
  },
  errorWrap: {
    paddingVertical: 18,
    gap: 8,
  },
  errorTitle: {
    color: COLORS.goldSoft,
    fontSize: 18,
    fontWeight: "800",
  },
  errorSub: {
    color: COLORS.white,
    fontSize: 14,
  },
  errorActions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});

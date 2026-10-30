export type LegalBlockType = "h1" | "h2" | "p" | "li" | "num" | "quote";

export type LegalBlock = {
  type: LegalBlockType;
  text: string;
};

export function normalizeLegalContent(input: string) {
  return input
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, "$2")
    .replace(/<(em|i)>(.*?)<\/(em|i)>/gi, "$2")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseLegalContent(input: string): LegalBlock[] {
  const lines = normalizeLegalContent(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    if (/^#\s+/.test(line)) {
      return { type: "h1", text: line.replace(/^#\s+/, "").trim() };
    }
    if (/^##\s+/.test(line) || /^###\s+/.test(line)) {
      return { type: "h2", text: line.replace(/^#{2,3}\s+/, "").trim() };
    }
    if (/^(\*|-)\s+/.test(line)) {
      return { type: "li", text: line.replace(/^(\*|-)\s+/, "").trim() };
    }
    if (/^\d+\.\s+/.test(line)) {
      return { type: "num", text: line.replace(/^\d+\.\s+/, "").trim() };
    }
    if (/^>\s+/.test(line)) {
      return { type: "quote", text: line.replace(/^>\s+/, "").trim() };
    }
    return { type: "p", text: line };
  });
}

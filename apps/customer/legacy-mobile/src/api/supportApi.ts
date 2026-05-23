import { api, parseApiError } from "./client";
import type { CreateSupportTicketRequest, SupportTicketDto } from "../types/contracts";

export async function createSupportTicket(payload: CreateSupportTicketRequest) { try { const { data } = await api.post('/api/support/create', payload); return data as SupportTicketDto; } catch (e) { throw new Error(parseApiError(e, 'Support create failed')); } }
export async function getSupportHistory(): Promise<SupportTicketDto[]> { try { const { data } = await api.get('/api/support/history'); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as SupportTicketDto[]; } catch (e) { throw new Error(parseApiError(e, 'Support history failed')); } }

export type SupportFaqItemDto = { id?: string; question?: string; answer?: string };
export type SupportFaqCategoryDto = { id?: string; label?: string; name?: string; title?: string; faqs?: SupportFaqItemDto[]; items?: SupportFaqItemDto[] };

function toOrder(value: any, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFaqRows(rows: any[]): SupportFaqCategoryDto[] {
  return rows
    .map((raw, categoryIdx: number) => {
      const faqs = Array.isArray(raw?.faqs) ? raw.faqs : Array.isArray(raw?.items) ? raw.items : [];
      const normalizedFaqs = faqs
        .map((faq: any, idx: number) => ({
          id: String(faq?.id ?? `faq-${idx + 1}`),
          question: String(faq?.question ?? faq?.title ?? "").trim(),
          answer: String(faq?.answer ?? faq?.description ?? "").trim(),
          order: toOrder(faq?.displayOrder ?? faq?.order ?? faq?.position, idx),
        }))
        .filter((faq: SupportFaqItemDto) => faq.question && faq.answer);
      const sortedFaqs = normalizedFaqs.sort((a: any, b: any) => a.order - b.order);

      return {
        id: String(raw?.id ?? raw?.key ?? raw?.slug ?? ""),
        label: String(raw?.label ?? raw?.name ?? raw?.title ?? "").trim(),
        faqs: sortedFaqs,
        order: toOrder(raw?.displayOrder ?? raw?.order ?? raw?.position, categoryIdx),
      };
    })
    .filter((category: SupportFaqCategoryDto) => category.id && category.label && Array.isArray(category.faqs) && category.faqs.length > 0)
    .sort((a: any, b: any) => a.order - b.order);
}

function extractRows(data: any): any[] {
  return Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.payload?.content)
        ? data.payload.content
        : Array.isArray(data?.payload?.data)
          ? data.payload.data
          : Array.isArray(data)
            ? data
            : [];
}

export async function getSupportFaqCategories(): Promise<SupportFaqCategoryDto[]> {
  const endpoints = ["/api/support/faqs", "/api/support/faq", "/api/customer/support/faqs"];
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      const rows = extractRows(data);
      const normalized = normalizeFaqRows(rows);
      if (normalized.length > 0) return normalized;
    } catch {
      // try next endpoint and fallback to static UI data in screen
    }
  }
  return [];
}

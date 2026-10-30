import { isAxiosError } from "axios";

import API, { getReadableApiError } from "../../../services/api";
import type { LegalDocumentSlug, PartnerLegalDocument } from "../types";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

function normalizeDocument(input: unknown, slug: LegalDocumentSlug): PartnerLegalDocument {
  const source = asRecord(input);
  return {
    id: asString(source.id) || undefined,
    slug,
    title: asString(source.title) || humanizeSlug(slug),
    format: asString(source.format).toUpperCase() === "JSON_RICH_TEXT" ? "JSON_RICH_TEXT" : "MARKDOWN",
    content: asString(source.content || source.body || source.markdown),
    summary: asString(source.summary || source.description) || undefined,
    version: asNumber(source.version),
    updatedAt: asString(source.updatedAt || source.lastUpdated) || undefined,
    publishedAt: asString(source.publishedAt) || undefined,
  };
}

function extractDocument(raw: unknown, slug: LegalDocumentSlug): PartnerLegalDocument {
  const root = asRecord(raw);
  const nestedData = asRecord(root.data);
  const pageData = asRecord(nestedData.data);
  const candidates = [
    pageData,
    asRecord(pageData.document),
    asRecord(pageData.content),
    nestedData,
    asRecord(nestedData.document),
    asRecord(nestedData.content),
    root,
    asRecord(root.document),
    asRecord(root.content),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDocument(candidate, slug);
    if (normalized.content || normalized.summary || normalized.version) {
      return normalized;
    }
  }

  return normalizeDocument({}, slug);
}

function humanizeSlug(slug: LegalDocumentSlug) {
  if (slug === "terms-and-conditions") return "Terms & Conditions";
  if (slug === "privacy-policy") return "Privacy Policy";
  return "About Us";
}

export async function getPartnerLegalDocument(
  slug: LegalDocumentSlug,
): Promise<PartnerLegalDocument> {
  const endpoints = [
    { url: `/api/v1/legal/${slug === "terms-and-conditions" ? "partner-terms" : slug === "privacy-policy" ? "privacy" : "about"}` },
  ];

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const { data } = await API.get(endpoint.url);
      return extractDocument(data, slug);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        lastError = error;
        continue;
      }
      lastError = error;
    }
  }

  throw new Error(getReadableApiError(lastError, "Unable to load legal content"));
}

export type LegalDocumentSlug =
  | "terms-and-conditions"
  | "privacy-policy"
  | "about-us";

export type LegalDocumentFormat = "MARKDOWN" | "JSON_RICH_TEXT";

export type PartnerLegalDocument = {
  id?: string;
  slug: LegalDocumentSlug;
  title: string;
  format: LegalDocumentFormat;
  content: string;
  summary?: string;
  version?: number;
  updatedAt?: string;
  publishedAt?: string;
};

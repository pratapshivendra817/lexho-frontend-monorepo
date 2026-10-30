import { z } from "zod";

export const legalContentDocumentSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  summary: z.string().trim().max(240, "Summary can be up to 240 characters"),
  content: z.string().trim().min(1, "Content is required"),
  format: z.enum(["MARKDOWN", "JSON_RICH_TEXT"]),
});

import { z } from "zod";

import { awarenessCategories, contentKinds } from "@/features/learn/categories";

// Mirrors awareness_content / content_sources constraints.
export const contentSchema = z.object({
  kind: z.enum(contentKinds),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  category: z.enum(awarenessCategories),
  titleBn: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  summaryBn: z.string().trim().max(500).optional().or(z.literal("")),
  summaryEn: z.string().trim().max(500).optional().or(z.literal("")),
  bodyBn: z.string().trim().min(1).max(20000),
  bodyEn: z.string().trim().min(1).max(20000),
  sortOrder: z.number().int().min(0).max(10000),
});
export type ContentFormInput = z.infer<typeof contentSchema>;

export const sourceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  organization: z.string().trim().max(200).optional().or(z.literal("")),
  url: z
    .string()
    .trim()
    .max(500)
    .regex(/^https?:\/\/\S+$/i),
  // Checking a source today is a human act, so the form only offers "today".
  checked: z.boolean(),
});
export type SourceFormInput = z.infer<typeof sourceSchema>;

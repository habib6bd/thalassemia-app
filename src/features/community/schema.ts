import { z } from "zod";

// Mirrors the community enums and constraints (migration 20260928110000).
// No money-related topic exists on purpose (§28.11, OPEN_QUESTIONS Q24).
export const communityTopics = [
  "treatment_centre_experience",
  "transfusion_experience",
  "managing_transfusions",
  "family_experience",
  "emotional_support",
  "support_resources",
  "newly_diagnosed",
  "questions",
] as const;
export type CommunityTopic = (typeof communityTopics)[number];

// "Selling blood" comes first so it is the most prominent choice (§28.11).
export const reportReasons = [
  "selling_blood",
  "medical_misinformation",
  "harassment",
  "privacy",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const communityPostSchema = z.object({
  topic: z.enum(communityTopics),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
});
export type CommunityPostInput = z.infer<typeof communityPostSchema>;

export const communityCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;

export const reportSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ReportInput = z.infer<typeof reportSchema>;

export type ModerationAction = "restore" | "hide" | "remove";
export type CommunityTargetType = "post" | "comment";

// Mirrors the awareness_category enum (migration 20260928130000).
export const awarenessCategories = [
  "what_is_thalassemia",
  "what_is_carrier",
  "why_screening",
  "both_carriers",
  "genetic_counselling",
  "screening",
  "family_awareness",
  "living_with_thalassemia",
  "medicines",
] as const;
export type AwarenessCategory = (typeof awarenessCategories)[number];

export const contentKinds = ["article", "faq", "medicine"] as const;
export type ContentKind = (typeof contentKinds)[number];

export type ReviewStatus =
  "draft" | "in_review" | "approved" | "published" | "retired";

export const reviewStatusIcons = {
  draft: "pencil",
  in_review: "eye-check-outline",
  approved: "check",
  published: "check-decagram",
  retired: "archive",
} as const satisfies Record<ReviewStatus, string>;

/** Next steps an admin may take from each status (ARCHITECTURE §7.6). */
export const reviewTransitions: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["published", "draft"],
  published: ["published", "retired"],
  retired: ["draft"],
};

// "Learn about carrier screening" journey (§16): steps are categories whose
// published articles are shown; it ends with talking to a professional.
export const screeningJourney: AwarenessCategory[] = [
  "what_is_carrier",
  "why_screening",
  "screening",
  "both_carriers",
  "genetic_counselling",
];

/** Picks the bn or en field, falling back to the other if one is empty. */
export function localized(
  language: string,
  bn: string | null | undefined,
  en: string | null | undefined,
): string {
  return (language === "bn" ? bn || en : en || bn) ?? "";
}

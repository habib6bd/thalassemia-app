import { z } from "zod";

// Mirrors profiles' DB constraints (ARCHITECTURE.md §5.1) and
// complete_onboarding's allowed self-service roles (patient/guardian/donor).
export const selfServiceRoles = ["patient", "guardian", "donor"] as const;
export type SelfServiceRole = (typeof selfServiceRoles)[number];

const phoneRegex = /^\+[1-9][0-9]{7,14}$/;

export const onboardingSchema = z.object({
  roles: z.array(z.enum(selfServiceRoles)).min(1),
  displayName: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "invalid_phone")
    .optional()
    .or(z.literal("")),
  districtId: z.number().int().positive(),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  language: z.enum(["bn", "en"]),
  shareContactOnAccept: z.boolean(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

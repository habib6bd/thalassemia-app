import { z } from "zod";

// Mirrors the organizations table (migration 20260928120000).
export const organizationTypes = [
  "treatment_centre",
  "hospital",
  "blood_bank",
  "diagnostic_centre",
  "genetic_counselling",
  "support_org",
] as const;
export type OrganizationType = (typeof organizationTypes)[number];

export const verificationMethods = [
  "phone_call",
  "official_website",
  "in_person",
  "official_document",
] as const;
export type VerificationMethod = (typeof verificationMethods)[number];

export type VerificationStatus = "pending" | "verified" | "stale" | "rejected";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

// Coordinates are typed as text in the form; both or neither.
const coordinate = (limit: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (!Number.isNaN(Number(value)) && Math.abs(Number(value)) <= limit),
    );

export const organizationSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    nameBn: optionalText(200),
    type: z.enum(organizationTypes),
    districtId: z.number().int().positive(),
    address: optionalText(300),
    latitude: coordinate(90),
    longitude: coordinate(180),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9][0-9]{7,14}$/)
      .optional()
      .or(z.literal("")),
    website: z
      .string()
      .trim()
      .max(300)
      .regex(/^https?:\/\/\S+$/i)
      .optional()
      .or(z.literal("")),
    services: optionalText(1000),
    openingHours: optionalText(300),
  })
  .refine((value) => (value.latitude === "") === (value.longitude === ""), {
    path: ["longitude"],
  });
export type OrganizationInput = z.infer<typeof organizationSchema>;

export const verificationSchema = z
  .object({
    status: z.enum(["pending", "verified", "rejected"]),
    method: z.enum(verificationMethods).optional(),
    note: optionalText(500),
  })
  .refine((value) => value.status !== "verified" || !!value.method, {
    path: ["method"],
  });
export type VerificationInput = z.infer<typeof verificationSchema>;

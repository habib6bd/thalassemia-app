import { z } from "zod";

// Mirrors blood_requests' DB constraints (ARCHITECTURE.md §5.4).
export const bloodRequestSchema = z.object({
  patientId: z.string().uuid(),
  requiredAt: z.string().min(1), // ISO datetime
  treatingCentre: z.string().trim().min(1),
  districtId: z.number().int().positive(),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  unitsNeeded: z.number().int().min(1).max(10),
  // Free text "as advised by the hospital" — the app never picks components (Q5).
  component: z.string().trim().max(200).optional().or(z.literal("")),
  isEmergency: z.boolean(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type BloodRequestInput = z.infer<typeof bloodRequestSchema>;

export const confirmDonationSchema = z.object({
  donatedOn: z.string().min(1), // ISO date, not in the future
});
export type ConfirmDonationInput = z.infer<typeof confirmDonationSchema>;

export const scheduleDonationSchema = z.object({
  scheduledAt: z.string().min(1), // ISO datetime
});
export type ScheduleDonationInput = z.infer<typeof scheduleDonationSchema>;

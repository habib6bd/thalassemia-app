import { z } from "zod";

import { bloodGroups } from "@/lib/bloodGroups";

export const donorAvailabilities = [
  "available",
  "unavailable",
  "paused",
] as const;

export const donorProfileSchema = z.object({
  bloodGroup: z.enum(bloodGroups),
  availability: z.enum(donorAvailabilities),
  availableFrom: z.string().optional().or(z.literal("")), // ISO date string
  emergencyAvailable: z.boolean(),
});
export type DonorProfileInput = z.infer<typeof donorProfileSchema>;

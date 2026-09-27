import { z } from "zod";

import { bloodGroups } from "@/lib/bloodGroups";

// Mirrors the patients table (ARCHITECTURE.md §5.2).
export const patientSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  bloodGroup: z.enum(bloodGroups),
  districtId: z.number().int().positive(),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  treatingCentre: z.string().trim().optional().or(z.literal("")),
  nextTransfusionDate: z.string().optional().or(z.literal("")), // ISO date
  thalassemiaType: z.string().trim().optional().or(z.literal("")),
  asSelf: z.boolean(),
  showTreatingCentre: z.boolean(),
  showArea: z.boolean(),
  showNextTransfusion: z.boolean(),
  showThalassemiaType: z.boolean(),
});
export type PatientInput = z.infer<typeof patientSchema>;

import { patientSchema } from "@/features/patients/schema";

const base = {
  displayName: "Rahim",
  bloodGroup: "O_POS" as const,
  districtId: 1,
  area: "",
  treatingCentre: "",
  nextTransfusionDate: "",
  thalassemiaType: "",
  asSelf: false,
  showTreatingCentre: true,
  showArea: true,
  showNextTransfusion: true,
  showThalassemiaType: false,
};

describe("patientSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(patientSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a display name over 80 characters", () => {
    const result = patientSchema.safeParse({
      ...base,
      displayName: "a".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid blood group", () => {
    const result = patientSchema.safeParse({ ...base, bloodGroup: "Z_POS" });
    expect(result.success).toBe(false);
  });

  it("requires a district", () => {
    const result = patientSchema.safeParse({ ...base, districtId: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects an area over 120 characters", () => {
    const result = patientSchema.safeParse({ ...base, area: "a".repeat(121) });
    expect(result.success).toBe(false);
  });
});

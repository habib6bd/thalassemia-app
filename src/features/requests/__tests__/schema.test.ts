import { bloodRequestSchema } from "@/features/requests/schema";

const base = {
  patientId: "11111111-1111-4111-8111-111111111111",
  requiredAt: new Date().toISOString(),
  treatingCentre: "City Hospital",
  districtId: 1,
  area: "",
  unitsNeeded: 1,
  component: "",
  isEmergency: false,
  notes: "",
};

describe("bloodRequestSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(bloodRequestSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a non-uuid patientId", () => {
    const result = bloodRequestSchema.safeParse({
      ...base,
      patientId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty treating centre", () => {
    const result = bloodRequestSchema.safeParse({
      ...base,
      treatingCentre: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects units needed above 10", () => {
    const result = bloodRequestSchema.safeParse({ ...base, unitsNeeded: 11 });
    expect(result.success).toBe(false);
  });

  it("rejects units needed below 1", () => {
    const result = bloodRequestSchema.safeParse({ ...base, unitsNeeded: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects notes over 500 characters", () => {
    const result = bloodRequestSchema.safeParse({
      ...base,
      notes: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

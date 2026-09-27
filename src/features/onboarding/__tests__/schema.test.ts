import { onboardingSchema } from "@/features/onboarding/schema";

const base = {
  roles: ["guardian"] as const,
  displayName: "Fatema Begum",
  phone: "",
  districtId: 1,
  area: "",
  language: "bn" as const,
  shareContactOnAccept: false,
};

describe("onboardingSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(onboardingSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty roles array", () => {
    const result = onboardingSchema.safeParse({ ...base, roles: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a display name that is empty", () => {
    const result = onboardingSchema.safeParse({ ...base, displayName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const result = onboardingSchema.safeParse({
      ...base,
      phone: "01700000000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid E.164 phone number", () => {
    const result = onboardingSchema.safeParse({
      ...base,
      phone: "+8801700000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a role outside patient/guardian/donor", () => {
    const result = onboardingSchema.safeParse({ ...base, roles: ["admin"] });
    expect(result.success).toBe(false);
  });
});

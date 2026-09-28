import {
  organizationSchema,
  verificationSchema,
} from "@/features/organizations/schema";

const base = {
  name: "Centre",
  nameBn: "",
  type: "treatment_centre",
  districtId: 1,
  address: "",
  latitude: "",
  longitude: "",
  phone: "",
  website: "",
  services: "",
  openingHours: "",
};

describe("organizationSchema", () => {
  it("accepts a minimal entry", () => {
    expect(organizationSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a phone number that is not E.164", () => {
    expect(
      organizationSchema.safeParse({ ...base, phone: "01700000000" }).success,
    ).toBe(false);
  });

  it("accepts an E.164 phone number and an https website", () => {
    expect(
      organizationSchema.safeParse({
        ...base,
        phone: "+8801700000000",
        website: "https://example.org",
      }).success,
    ).toBe(true);
  });

  it("rejects a website without a scheme", () => {
    expect(
      organizationSchema.safeParse({ ...base, website: "example.org" }).success,
    ).toBe(false);
  });

  it("requires both coordinates or neither", () => {
    expect(
      organizationSchema.safeParse({ ...base, latitude: "23.7" }).success,
    ).toBe(false);
    expect(
      organizationSchema.safeParse({
        ...base,
        latitude: "23.7",
        longitude: "90.4",
      }).success,
    ).toBe(true);
  });

  it("rejects an out-of-range latitude", () => {
    expect(
      organizationSchema.safeParse({
        ...base,
        latitude: "123",
        longitude: "90",
      }).success,
    ).toBe(false);
  });
});

describe("verificationSchema", () => {
  it("requires a method to verify", () => {
    expect(
      verificationSchema.safeParse({ status: "verified", note: "" }).success,
    ).toBe(false);
    expect(
      verificationSchema.safeParse({
        status: "verified",
        method: "phone_call",
        note: "",
      }).success,
    ).toBe(true);
  });

  it("allows rejecting without a method", () => {
    expect(
      verificationSchema.safeParse({ status: "rejected", note: "closed" })
        .success,
    ).toBe(true);
  });
});

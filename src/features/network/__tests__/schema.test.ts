import { inviteCodeSchema } from "@/features/network/schema";

describe("inviteCodeSchema", () => {
  it("accepts a valid 8-character code", () => {
    expect(inviteCodeSchema.safeParse({ inviteCode: "ABCD2345" }).success).toBe(
      true,
    );
  });

  it("uppercases and trims before validating", () => {
    const result = inviteCodeSchema.safeParse({ inviteCode: " abcd2345 " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteCode).toBe("ABCD2345");
    }
  });

  it("rejects a code that is too short", () => {
    expect(inviteCodeSchema.safeParse({ inviteCode: "ABCD" }).success).toBe(
      false,
    );
  });

  it("rejects a code with symbols", () => {
    expect(inviteCodeSchema.safeParse({ inviteCode: "ABCD-234" }).success).toBe(
      false,
    );
  });
});

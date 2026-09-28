import {
  communityCommentSchema,
  communityPostSchema,
  communityTopics,
  reportReasons,
  reportSchema,
} from "@/features/community/schema";

describe("communityPostSchema", () => {
  const base = { topic: "questions", title: "A question", body: "Some text" };

  it("accepts a valid post", () => {
    expect(communityPostSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a whitespace-only title", () => {
    expect(
      communityPostSchema.safeParse({ ...base, title: "   " }).success,
    ).toBe(false);
  });

  it("rejects a title longer than 120 characters", () => {
    expect(
      communityPostSchema.safeParse({ ...base, title: "x".repeat(121) })
        .success,
    ).toBe(false);
  });

  it("rejects a body longer than 5000 characters", () => {
    expect(
      communityPostSchema.safeParse({ ...base, body: "x".repeat(5001) })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown topic", () => {
    expect(
      communityPostSchema.safeParse({ ...base, topic: "fundraising" }).success,
    ).toBe(false);
  });
});

describe("community enums", () => {
  it("has no money-related topic", () => {
    for (const topic of communityTopics) {
      expect(topic).not.toMatch(/money|financ|fund|price|pay|sell/);
    }
  });

  it("lists selling blood first among report reasons", () => {
    expect(reportReasons[0]).toBe("selling_blood");
  });
});

describe("communityCommentSchema", () => {
  it("rejects an empty comment", () => {
    expect(communityCommentSchema.safeParse({ body: " " }).success).toBe(false);
  });

  it("rejects a comment longer than 2000 characters", () => {
    expect(
      communityCommentSchema.safeParse({ body: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("reportSchema", () => {
  it("accepts a reason without details", () => {
    expect(
      reportSchema.safeParse({ reason: "spam", details: "" }).success,
    ).toBe(true);
  });

  it("rejects details longer than 500 characters", () => {
    expect(
      reportSchema.safeParse({ reason: "other", details: "x".repeat(501) })
        .success,
    ).toBe(false);
  });
});

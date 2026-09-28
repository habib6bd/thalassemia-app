import { contentSchema, sourceSchema } from "@/features/learn/schema";

const base = {
  kind: "article",
  slug: "what-is-a-carrier",
  category: "what_is_carrier",
  titleBn: "শিরোনাম",
  titleEn: "Title",
  summaryBn: "",
  summaryEn: "",
  bodyBn: "লেখা",
  bodyEn: "Text",
  sortOrder: 0,
};

describe("contentSchema", () => {
  it("accepts a valid item", () => {
    expect(contentSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a slug with spaces", () => {
    expect(contentSchema.safeParse({ ...base, slug: "bad slug" }).success).toBe(
      false,
    );
  });

  it("needs both languages", () => {
    expect(contentSchema.safeParse({ ...base, bodyEn: "" }).success).toBe(
      false,
    );
    expect(contentSchema.safeParse({ ...base, titleBn: " " }).success).toBe(
      false,
    );
  });
});

describe("sourceSchema", () => {
  it("needs an http(s) url", () => {
    expect(
      sourceSchema.safeParse({ title: "WHO", url: "who.int", checked: false })
        .success,
    ).toBe(false);
    expect(
      sourceSchema.safeParse({
        title: "WHO",
        url: "https://www.who.int",
        checked: true,
      }).success,
    ).toBe(true);
  });
});

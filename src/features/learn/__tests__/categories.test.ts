import {
  localized,
  reviewTransitions,
  screeningJourney,
} from "@/features/learn/categories";

describe("reviewTransitions", () => {
  it("never lets a draft skip review", () => {
    expect(reviewTransitions.draft).toEqual(["in_review"]);
  });

  it("only approved content can be published", () => {
    const canPublish = Object.entries(reviewTransitions)
      .filter(([, next]) => next.includes("published"))
      .map(([from]) => from)
      .sort();
    expect(canPublish).toEqual(["approved", "published"]);
  });
});

describe("screeningJourney", () => {
  it("ends with genetic counselling", () => {
    expect(screeningJourney[screeningJourney.length - 1]).toBe(
      "genetic_counselling",
    );
  });
});

describe("localized", () => {
  it("prefers the active language and falls back", () => {
    expect(localized("bn", "বাংলা", "English")).toBe("বাংলা");
    expect(localized("en", "বাংলা", "English")).toBe("English");
    expect(localized("bn", null, "English")).toBe("English");
  });
});

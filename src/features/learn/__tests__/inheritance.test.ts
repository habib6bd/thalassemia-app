import { inheritanceGrid, outcomeCounts } from "@/features/learn/inheritance";

describe("inheritance example", () => {
  it("carrier × carrier gives 1 / 2 / 1 of 4 boxes", () => {
    expect(outcomeCounts("carrierCarrier")).toEqual({
      notCarrier: 1,
      carrier: 2,
      thalassemia: 1,
    });
  });

  it("carrier × non-carrier gives 2 / 2 / 0 of 4 boxes", () => {
    expect(outcomeCounts("carrierNonCarrier")).toEqual({
      notCarrier: 2,
      carrier: 2,
      thalassemia: 0,
    });
  });

  it("always has exactly four boxes", () => {
    expect(inheritanceGrid("carrierCarrier")).toHaveLength(4);
    expect(inheritanceGrid("carrierNonCarrier")).toHaveLength(4);
  });
});

import { approximate } from "@/features/donors/location";

// jest hoists this above the import; the native module isn't needed here.
jest.mock("expo-location", () => ({}));

describe("approximate", () => {
  it("rounds to about 1 km (2 decimals)", () => {
    expect(approximate({ latitude: 23.81234, longitude: 90.41789 })).toEqual({
      latitude: 23.81,
      longitude: 90.42,
    });
  });
});

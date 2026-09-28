import bnCommon from "@/locales/bn/common.json";
import enCommon from "@/locales/en/common.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe("locale key parity", () => {
  it("has the same keys in bn/common.json and en/common.json", () => {
    const bnKeys = flattenKeys(bnCommon).sort();
    const enKeys = flattenKeys(enCommon).sort();

    expect(bnKeys).toEqual(enKeys);
  });
});

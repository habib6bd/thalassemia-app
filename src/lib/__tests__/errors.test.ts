import i18n from "@/lib/i18n";
import { mapSupabaseError } from "@/lib/errors";

describe("mapSupabaseError", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("maps an RPC error (code P0001, key in message) to its translation", () => {
    const error = {
      code: "P0001",
      message: "last_manager",
      details: "",
      hint: "",
      name: "PostgrestError",
    };
    expect(mapSupabaseError(error)).toBe(i18n.t("errors.last_manager"));
    expect(mapSupabaseError(error)).not.toBe(i18n.t("errors.generic"));
  });

  it("prefers a mapped auth error code", () => {
    const error = Object.assign(new Error("Invalid login credentials"), {
      code: "invalid_credentials",
    });
    expect(mapSupabaseError(error)).toBe(i18n.t("errors.invalid_credentials"));
  });

  it("falls back to the generic message for unknown errors", () => {
    expect(mapSupabaseError(new Error("relation does not exist"))).toBe(
      i18n.t("errors.generic"),
    );
    expect(mapSupabaseError(null)).toBe(i18n.t("errors.generic"));
  });
});

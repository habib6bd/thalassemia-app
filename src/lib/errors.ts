import type { PostgrestError } from "@supabase/supabase-js";
import i18n from "@/lib/i18n";

/**
 * RPC errors are raised as `errcode = 'P0001'` with `message` set to a stable
 * snake_case code (see ARCHITECTURE.md §3). We map that code to `errors.<code>`
 * in the active locale, falling back to a generic message for anything else
 * (network errors, unmapped codes, etc.) so the user never sees raw SQL text.
 */
export function mapSupabaseError(
  error: PostgrestError | Error | null | undefined,
): string {
  if (!error) return i18n.t("errors.generic");

  const code = "message" in error ? error.message : undefined;
  if (code) {
    const key = `errors.${code}`;
    if (i18n.exists(key)) {
      return i18n.t(key);
    }
  }

  return i18n.t("errors.generic");
}

import type { AuthError, PostgrestError } from "@supabase/supabase-js";
import i18n from "@/lib/i18n";

/**
 * RPC errors are raised as `errcode = 'P0001'` with `message` set to a stable
 * snake_case code (see ARCHITECTURE.md §3). We map that code to `errors.<code>`
 * in the active locale, falling back to a generic message for anything else
 * (network errors, unmapped codes, etc.) so the user never sees raw SQL text.
 * Supabase Auth errors (sign up/in/reset) carry their own stable `code`
 * (e.g. "invalid_credentials"), checked first since it's more specific than
 * their English `message`.
 */
export function mapSupabaseError(
  error: PostgrestError | AuthError | Error | null | undefined,
): string {
  if (!error) return i18n.t("errors.generic");

  // RPC errors arrive with code "P0001" and the stable key in `message`, so
  // try both rather than stopping at the first non-empty one.
  const candidates = [
    "code" in error ? error.code : undefined,
    "message" in error ? error.message : undefined,
  ];
  for (const code of candidates) {
    if (code && i18n.exists(`errors.${code}`)) {
      return i18n.t(`errors.${code}`);
    }
  }

  return i18n.t("errors.generic");
}

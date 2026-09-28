import i18n from "@/lib/i18n";

// delete_my_account() replaces the name with this sentinel (Phase 2b).
const DELETED_SENTINEL = "deleted";

export function personName(
  name: string | null | undefined,
): string | undefined {
  if (name == null) return undefined;
  return name === DELETED_SENTINEL ? i18n.t("common.deletedUser") : name;
}

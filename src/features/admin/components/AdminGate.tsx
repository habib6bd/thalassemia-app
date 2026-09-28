import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useIsAdmin } from "@/features/admin/api";

// Hides admin screens from non-admins. The server re-checks every call.
export function AdminGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { isAdmin, isPending } = useIsAdmin();

  if (isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorText message={t("errors.not_authorized")} />
      </Screen>
    );
  }

  return <>{children}</>;
}

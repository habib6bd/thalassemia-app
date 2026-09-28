import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function OrgPortalLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("orgPortal.title") }} />
      <Stack.Screen name="[id]" options={{ title: t("orgPortal.requests") }} />
      <Stack.Screen
        name="request/[id]"
        options={{ title: t("orgPortal.request") }}
      />
    </Stack>
  );
}

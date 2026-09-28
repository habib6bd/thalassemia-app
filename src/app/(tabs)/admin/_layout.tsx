import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function AdminLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("admin.title") }} />
      <Stack.Screen name="users" options={{ title: t("admin.users") }} />
      <Stack.Screen
        name="organizations/index"
        options={{ title: t("admin.organizations") }}
      />
      <Stack.Screen
        name="organizations/[id]"
        options={{ title: t("admin.organization") }}
      />
      <Stack.Screen name="settings" options={{ title: t("admin.settings") }} />
      <Stack.Screen
        name="content/index"
        options={{ title: t("admin.content") }}
      />
      <Stack.Screen
        name="content/[id]"
        options={{ title: t("admin.contentItem") }}
      />
      <Stack.Screen name="sources" options={{ title: t("admin.sources") }} />
      <Stack.Screen
        name="analytics"
        options={{ title: t("analytics.title") }}
      />
    </Stack>
  );
}

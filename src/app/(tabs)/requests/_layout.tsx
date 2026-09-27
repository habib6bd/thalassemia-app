import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function RequestsLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("requests.title") }} />
      <Stack.Screen
        name="new"
        options={{ title: t("requests.wizard.title") }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: t("requests.detailTitle") }}
      />
      <Stack.Screen
        name="response/[id]"
        options={{ title: t("requests.detailTitle") }}
      />
    </Stack>
  );
}

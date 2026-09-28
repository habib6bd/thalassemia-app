import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function LearnLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("learn.title") }} />
      <Stack.Screen name="[id]" options={{ title: t("learn.title") }} />
      <Stack.Screen
        name="simulator"
        options={{ title: t("learn.simulatorTitle") }}
      />
      <Stack.Screen
        name="journey"
        options={{ title: t("learn.journeyTitle") }}
      />
    </Stack>
  );
}

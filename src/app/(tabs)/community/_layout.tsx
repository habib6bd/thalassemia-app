import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function CommunityLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("community.title") }} />
      <Stack.Screen name="new" options={{ title: t("community.newPost") }} />
      <Stack.Screen name="[id]" options={{ title: t("community.title") }} />
      <Stack.Screen
        name="guidelines"
        options={{ title: t("community.guidelinesTitle") }}
      />
      <Stack.Screen
        name="blocked"
        options={{ title: t("community.blockedTitle") }}
      />
      <Stack.Screen
        name="moderation"
        options={{ title: t("community.moderationTitle") }}
      />
    </Stack>
  );
}

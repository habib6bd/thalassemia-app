import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function ProfileLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("nav.profile") }} />
      <Stack.Screen name="donor" options={{ title: t("donorProfile.title") }} />
      <Stack.Screen
        name="donations"
        options={{ title: t("donorProfile.donationHistory") }}
      />
      <Stack.Screen
        name="notification-preferences"
        options={{ title: t("notificationPreferences.title") }}
      />
    </Stack>
  );
}

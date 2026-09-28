import { Redirect, Stack } from "expo-router";

import { useProfile } from "@/features/profile/api";
import { useAppStore } from "@/stores/useAppStore";

export default function OnboardingLayout() {
  const session = useAppStore((state) => state.session);
  const sessionLoaded = useAppStore((state) => state.sessionLoaded);
  const profileQuery = useProfile(session?.user.id);

  if (sessionLoaded && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profileQuery.data?.onboarded_at) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

import { Redirect, Stack } from "expo-router";

import { useAppStore } from "@/stores/useAppStore";

export default function AuthLayout() {
  const session = useAppStore((state) => state.session);
  const sessionLoaded = useAppStore((state) => state.sessionLoaded);

  // Already signed in — let "/" decide where to send them (onboarding vs tabs).
  if (sessionLoaded && session) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

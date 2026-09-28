import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useProfile } from "@/features/profile/api";
import { useAppStore } from "@/stores/useAppStore";

export default function Index() {
  const session = useAppStore((state) => state.session);
  const sessionLoaded = useAppStore((state) => state.sessionLoaded);
  const profileQuery = useProfile(session?.user.id);

  if (!sessionLoaded || (session && profileQuery.isPending)) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profileQuery.data?.onboarded_at) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}

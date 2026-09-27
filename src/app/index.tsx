import { Redirect } from "expo-router";

// Phase 0 has no auth gate yet; Phase 1a adds a session check here to route
// signed-out users to (auth)/sign-in instead.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}

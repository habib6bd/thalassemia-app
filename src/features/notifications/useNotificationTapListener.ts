import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { navigateToNotificationTarget } from "@/features/notifications/api";
import { pushUnsupportedInExpoGo } from "@/features/notifications/usePushRegistration";

// Merely calling expo-notifications' handler/listener APIs throws in Expo Go
// on Android (SDK 53+ removed remote push from Expo Go entirely), so this
// whole module's setup is skipped there rather than just the push-specific
// calls (see usePushRegistration.ts for the same guard).
if (!pushUnsupportedInExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Deep-links a tapped push notification to its entity, same as tapping the
// in-app list row (ARCHITECTURE.md §10: the app always has the in-app list
// as the source of truth; push is just a nudge).
export function useNotificationTapListener() {
  useEffect(() => {
    if (pushUnsupportedInExpoGo) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { entityType?: string; entityId?: string }
        | undefined;
      if (data?.entityType && data.entityId) {
        void navigateToNotificationTarget(data.entityType, data.entityId);
      }
    });
    return () => subscription.remove();
  }, []);
}

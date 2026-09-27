import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { navigateToNotificationTarget } from "@/features/notifications/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Deep-links a tapped push notification to its entity, same as tapping the
// in-app list row (ARCHITECTURE.md §10: the app always has the in-app list
// as the source of truth; push is just a nudge).
export function useNotificationTapListener() {
  useEffect(() => {
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

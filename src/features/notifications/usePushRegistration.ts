import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useRegisterPushToken } from "@/features/notifications/api";

// Expo Go on Android cannot receive remote push (SDK 53+, ARCHITECTURE.md
// §10) — only an EAS development/production build can. iOS Expo Go and web
// are left to fail permission requests gracefully rather than special-cased,
// since that's a real (if less common) limitation too.
export const pushUnsupportedInExpoGo = Platform.OS === "android" && Constants.appOwnership === "expo";

export function usePushRegistration() {
  const registerPushToken = useRegisterPushToken();
  const [status, setStatus] = useState<Notifications.PermissionStatus | null>(null);
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (pushUnsupportedInExpoGo || !Device.isDevice) return;
    void Notifications.getPermissionsAsync().then((result) => setStatus(result.status));
  }, []);

  const registerToken = useCallback(async () => {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    registerPushToken.mutate({ token, platform: Platform.OS });
  }, [registerPushToken]);

  const requestAndRegister = useCallback(async () => {
    if (pushUnsupportedInExpoGo || !Device.isDevice) return;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    setStatus(newStatus);
    if (newStatus === "granted") {
      await registerToken();
    }
  }, [registerToken]);

  useEffect(() => {
    if (pushUnsupportedInExpoGo || !Device.isDevice || status !== "granted") return;
    listenerRef.current = Notifications.addPushTokenListener(() => {
      void registerToken();
    });
    return () => listenerRef.current?.remove();
  }, [status, registerToken]);

  return { status, requestAndRegister, isRegistering: registerPushToken.isPending };
}

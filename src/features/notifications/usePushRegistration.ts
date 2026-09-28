import Constants from "expo-constants";
import * as Device from "expo-device";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useRegisterPushToken } from "@/features/notifications/api";
import {
  Notifications,
  type ExpoNotifications,
} from "@/features/notifications/notificationsModule";

export { pushUnsupportedInExpoGo } from "@/features/notifications/notificationsModule";

export function usePushRegistration() {
  const registerPushToken = useRegisterPushToken();
  const [status, setStatus] = useState<ExpoNotifications.PermissionStatus | null>(null);
  const listenerRef = useRef<ExpoNotifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!Notifications || !Device.isDevice) return;
    void Notifications.getPermissionsAsync().then((result) => setStatus(result.status));
  }, []);

  const registerToken = useCallback(async () => {
    if (!Notifications) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    registerPushToken.mutate({ token, platform: Platform.OS });
  }, [registerPushToken]);

  const requestAndRegister = useCallback(async () => {
    if (!Notifications || !Device.isDevice) return;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    setStatus(newStatus);
    if (newStatus === "granted") {
      await registerToken();
    }
  }, [registerToken]);

  useEffect(() => {
    if (!Notifications || !Device.isDevice || status !== "granted") return;
    listenerRef.current = Notifications.addPushTokenListener(() => {
      void registerToken();
    });
    return () => listenerRef.current?.remove();
  }, [status, registerToken]);

  return { status, requestAndRegister, isRegistering: registerPushToken.isPending };
}

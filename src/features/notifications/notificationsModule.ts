import { isRunningInExpoGo } from "expo";
import type * as ExpoNotifications from "expo-notifications";
import { Platform } from "react-native";

// Expo Go on Android (SDK 53+) throws as soon as expo-notifications is
// imported: its DevicePushTokenAutoRegistration side-effect module registers a
// push-token listener at load time. So the package is only required lazily,
// and every caller must handle `Notifications === null`. The in-app list
// doesn't depend on it and keeps working (ARCHITECTURE.md §10).
export const pushUnsupportedInExpoGo = Platform.OS === "android" && isRunningInExpoGo();

export const Notifications: typeof ExpoNotifications | null = pushUnsupportedInExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("expo-notifications") as typeof ExpoNotifications);

export type { ExpoNotifications };

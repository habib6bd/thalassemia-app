import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { List, Switch, Text } from "react-native-paper";

import { Screen } from "@/components/Screen";
import {
  useNotificationPreferences,
  useSetNotificationPreference,
} from "@/features/notifications/api";
import { notificationTypes } from "@/features/notifications/types";
import { useAppStore } from "@/stores/useAppStore";

export default function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const userId = session?.user.id;
  const preferencesQuery = useNotificationPreferences(userId);
  const setPreference = useSetNotificationPreference(userId ?? "");

  const isPushEnabled = (type: string) =>
    preferencesQuery.data?.find((p) => p.type === type)?.push_enabled ?? true;

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.hint}>
          {t("notificationPreferences.inAppAlwaysOnHint")}
        </Text>

        {notificationTypes.map((type) => (
          <List.Item
            key={type}
            title={t(`notifications.messages.${type}`)}
            right={() => (
              <Switch
                value={isPushEnabled(type)}
                onValueChange={(value) =>
                  setPreference.mutate({ type, pushEnabled: value })
                }
              />
            )}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 4,
  },
  hint: {
    opacity: 0.7,
    marginBottom: 12,
  },
});

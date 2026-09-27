import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  navigateToNotificationTarget,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/api";
import { pushUnsupportedInExpoGo, usePushRegistration } from "@/features/notifications/usePushRegistration";
import type { Database } from "@/lib/database.types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const push = usePushRegistration();

  const hasUnread = (notificationsQuery.data ?? []).some((n) => !n.read_at);

  const onPress = (notification: Notification) => {
    if (!notification.read_at) markRead.mutate(notification.id);
    void navigateToNotificationTarget(notification.entity_type, notification.entity_id);
  };

  return (
    <Screen>
      <View style={styles.content}>
        {pushUnsupportedInExpoGo ? (
          <Text variant="bodySmall" style={styles.hint}>
            {t("notifications.pushUnsupportedInExpoGo")}
          </Text>
        ) : push.status !== "granted" && push.status !== null ? (
          <PrimaryButton
            label={t("notifications.enablePush")}
            mode="outlined"
            loading={push.isRegistering}
            onPress={() => void push.requestAndRegister()}
          />
        ) : null}

        {hasUnread ? (
          <PrimaryButton
            label={t("notifications.markAllRead")}
            mode="outlined"
            onPress={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
          />
        ) : null}

        {notificationsQuery.data?.length === 0 ? (
          <EmptyState
            title={t("notifications.emptyTitle")}
            description={t("notifications.emptyDescription")}
          />
        ) : (
          <FlatList
            data={notificationsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card
                style={[styles.card, !item.read_at ? styles.unreadCard : undefined]}
                onPress={() => onPress(item)}
              >
                <Card.Content>
                  <Text variant="bodyMedium">{t(`notifications.messages.${item.type}`)}</Text>
                  <Text variant="bodySmall" style={styles.time}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 12,
  },
  card: {
    marginBottom: 8,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#B3261E",
  },
  time: {
    opacity: 0.7,
    marginTop: 4,
  },
  hint: {
    opacity: 0.7,
  },
});

import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import { useMyRequests, useDonorInbox } from "@/features/requests/api";
import { EmergencyBadge } from "@/features/requests/components/EmergencyNotice";
import { requestStatusTone } from "@/features/requests/statusTone";
import { useAppStore } from "@/stores/useAppStore";

export default function RequestsScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const activeRole = useAppStore((state) => state.activeRole);
  const isDonorView = activeRole === "donor";

  const requestsQuery = useMyRequests();
  const inboxQuery = useDonorInbox(isDonorView ? session?.user.id : undefined);

  if (isDonorView) {
    return (
      <Screen>
        <View style={styles.content}>
          {inboxQuery.data?.length === 0 ? (
            <EmptyState
              title={t("requests.inbox.emptyTitle")}
              description={t("requests.inbox.emptyDescription")}
            />
          ) : (
            <FlatList
              data={inboxQuery.data ?? []}
              keyExtractor={(item) => item.response.id}
              renderItem={({ item }) => (
                <Card
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/requests/response/[id]",
                      params: { id: item.response.id },
                    })
                  }
                >
                  <Card.Content style={styles.cardContent}>
                    <View>
                      <Text variant="titleMedium">
                        {item.request.treating_centre}
                      </Text>
                      <Text variant="bodySmall">
                        {new Date(item.request.required_at).toLocaleString()}
                      </Text>
                      {item.request.is_emergency ? <EmergencyBadge /> : null}
                    </View>
                    <StatusChip
                      label={t(
                        `requests.responseStatus.${item.response.status}`,
                      )}
                      tone={requestStatusTone(item.response.status)}
                    />
                  </Card.Content>
                </Card>
              )}
            />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        <PrimaryButton
          label={t("requests.create")}
          onPress={() => router.push("/(tabs)/requests/new")}
        />

        {requestsQuery.data?.length === 0 ? (
          <EmptyState
            title={t("requests.emptyTitle")}
            description={t("requests.emptyDescription")}
          />
        ) : (
          <FlatList
            data={requestsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/requests/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <Card.Content style={styles.cardContent}>
                  <View>
                    <Text variant="titleMedium">{item.treating_centre}</Text>
                    <Text variant="bodySmall">
                      {new Date(item.required_at).toLocaleString()}
                    </Text>
                    {item.is_emergency ? <EmergencyBadge /> : null}
                  </View>
                  <StatusChip
                    label={t(`requests.status.${item.status}`)}
                    tone={requestStatusTone(item.status)}
                  />
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
  list: {
    gap: 8,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, List, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useRequestOverview } from "@/features/admin/api";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { mapSupabaseError } from "@/lib/errors";

const requestStatuses = [
  "draft",
  "open",
  "responding",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
  "expired",
] as const;

export default function AdminHomeScreen() {
  return (
    <AdminGate>
      <AdminHome />
    </AdminGate>
  );
}

function AdminHome() {
  const { t } = useTranslation();
  const overviewQuery = useRequestOverview(true);
  const overview = overviewQuery.data;

  const stat = (label: string, value: number | undefined) => (
    <View style={styles.statRow} key={label}>
      <Text variant="bodyMedium" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="titleMedium">{value ?? 0}</Text>
    </View>
  );

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Card>
          <List.Item
            title={t("admin.users")}
            left={(props) => <List.Icon {...props} icon="account-cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/(tabs)/admin/users")}
          />
          <List.Item
            title={t("admin.organizations")}
            description={
              overview
                ? t("admin.organizationsPending", {
                    count: overview.organizations_pending,
                  })
                : undefined
            }
            left={(props) => <List.Icon {...props} icon="domain" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/(tabs)/admin/organizations")}
          />
          <List.Item
            title={t("admin.content")}
            left={(props) => <List.Icon {...props} icon="book-education" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/(tabs)/admin/content")}
          />
          <List.Item
            title={t("admin.reports")}
            description={
              overview
                ? t("admin.openReports", { count: overview.open_reports })
                : undefined
            }
            left={(props) => <List.Icon {...props} icon="flag" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/(tabs)/community/moderation")}
          />
          <List.Item
            title={t("admin.settings")}
            left={(props) => <List.Icon {...props} icon="tune" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/(tabs)/admin/settings")}
          />
        </Card>

        <Card>
          <Card.Title title={t("admin.requestsOverview")} />
          <Card.Content style={styles.stats}>
            {overviewQuery.isPending ? <ActivityIndicator /> : null}
            {overviewQuery.isError ? (
              <ErrorText message={mapSupabaseError(overviewQuery.error)} />
            ) : null}
            {overview ? (
              <>
                {stat(t("admin.openEmergencies"), overview.open_emergencies)}
                {stat(t("admin.created7"), overview.created_last_7_days)}
                {stat(t("admin.created30"), overview.created_last_30_days)}
                {stat(t("admin.fulfilled30"), overview.fulfilled_last_30_days)}
                {stat(t("admin.donations30"), overview.donations_last_30_days)}
                <Text variant="labelLarge" style={styles.subTitle}>
                  {t("admin.byStatus")}
                </Text>
                {requestStatuses.map((status) =>
                  stat(
                    t(`requests.status.${status}`),
                    overview.by_status[status],
                  ),
                )}
              </>
            ) : null}
          </Card.Content>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  stats: {
    gap: 4,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 32,
  },
  statLabel: {
    flex: 1,
  },
  subTitle: {
    marginTop: 8,
  },
});

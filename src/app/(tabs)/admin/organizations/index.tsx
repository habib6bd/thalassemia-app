import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { useAdminOrganizations } from "@/features/organizations/api";

const statusIcons = {
  pending: "progress-clock",
  verified: "check-decagram",
  stale: "alert-circle-outline",
  rejected: "close-octagon",
} as const;

export default function AdminOrganizationsScreen() {
  return (
    <AdminGate>
      <AdminOrganizations />
    </AdminGate>
  );
}

function AdminOrganizations() {
  const { t } = useTranslation();
  const organizationsQuery = useAdminOrganizations(true);

  if (organizationsQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={organizationsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="bodyMedium">{t("admin.organizationsHint")}</Text>
            <PrimaryButton
              label={t("admin.addOrganization")}
              icon="plus"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/admin/organizations/[id]",
                  params: { id: "new" },
                })
              }
            />
          </View>
        }
        ListEmptyComponent={<EmptyState title={t("admin.noOrganizations")} />}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/admin/organizations/[id]",
                params: { id: item.id },
              })
            }
          >
            <Card.Content style={styles.content}>
              <Text variant="titleMedium">{item.name}</Text>
              <View style={styles.chipRow}>
                <Chip compact icon={statusIcons[item.verification_status]}>
                  {t(`admin.verificationStatus.${item.verification_status}`)}
                </Chip>
                <Chip compact icon="domain">
                  {t(`directory.types.${item.type}`)}
                </Chip>
              </View>
              {item.last_verified_at ? (
                <Text variant="bodySmall">
                  {t("directory.lastVerified", {
                    date: new Date(item.last_verified_at).toLocaleDateString(),
                  })}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

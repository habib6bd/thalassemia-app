import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { organizationDisplayName } from "@/features/organizations/components/OrganizationCard";
import { useMyOrganizations } from "@/features/orgPortal/api";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

export default function OrgPortalScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const organizationsQuery = useMyOrganizations(true);

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
            <Disclaimer textKey="orgPortal.intro" />
            {organizationsQuery.isError ? (
              <ErrorText message={mapSupabaseError(organizationsQuery.error)} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t("orgPortal.noOrganizations")}
            description={t("orgPortal.noOrganizationsHint")}
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={
              item.can_act
                ? () =>
                    router.push({
                      pathname: "/(tabs)/org/[id]",
                      params: { id: item.id },
                    })
                : undefined
            }
          >
            <Card.Content style={styles.content}>
              <Text variant="titleMedium">
                {organizationDisplayName(item, language)}
              </Text>
              <View style={styles.chips}>
                <Chip compact icon="domain">
                  {t(`directory.types.${item.type}`)}
                </Chip>
                {!item.can_act ? (
                  <Chip compact icon="lock-outline">
                    {t("orgPortal.notActive")}
                  </Chip>
                ) : null}
              </View>
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

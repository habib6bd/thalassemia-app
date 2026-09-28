import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { useAdminContentList } from "@/features/learn/api";
import { localized, reviewStatusIcons } from "@/features/learn/categories";
import { useAppStore } from "@/stores/useAppStore";

export default function AdminContentScreen() {
  return (
    <AdminGate>
      <AdminContentList />
    </AdminGate>
  );
}

function AdminContentList() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const listQuery = useAdminContentList(true);

  if (listQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={listQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Disclaimer textKey="admin.contentRules" />
            <View style={styles.row}>
              <PrimaryButton
                label={t("admin.newContent")}
                icon="plus"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/admin/content/[id]",
                    params: { id: "new" },
                  })
                }
              />
              <PrimaryButton
                label={t("admin.sources")}
                icon="book-open-variant"
                mode="outlined"
                onPress={() => router.push("/(tabs)/admin/sources")}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title={t("admin.noContent")} />}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/admin/content/[id]",
                params: { id: item.id },
              })
            }
          >
            <Card.Content style={styles.content}>
              <Text variant="titleMedium">
                {localized(language, item.title_bn, item.title_en)}
              </Text>
              <View style={styles.chips}>
                <Chip compact icon={reviewStatusIcons[item.review_status]}>
                  {t(`admin.reviewStatus.${item.review_status}`)}
                </Chip>
                <Chip compact icon="shape-outline">
                  {t(`admin.contentKind.${item.kind}`)}
                </Chip>
                {item.drafted_by === "agent" ? (
                  <Chip compact icon="robot-outline">
                    {t("admin.agentDraft")}
                  </Chip>
                ) : null}
                <Chip compact icon="book-open-variant">
                  {t("admin.sourceCount", { count: item.source_count })}
                </Chip>
              </View>
              {item.next_review_due ? (
                <Text variant="bodySmall">
                  {t("admin.nextReviewDue", {
                    date: new Date(item.next_review_due).toLocaleDateString(),
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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

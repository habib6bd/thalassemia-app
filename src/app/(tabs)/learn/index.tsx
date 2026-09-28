import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, List, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { usePublishedContent } from "@/features/learn/api";
import { awarenessCategories, localized } from "@/features/learn/categories";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

export default function LearnScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const contentQuery = usePublishedContent();
  const items = contentQuery.data ?? [];

  const open = (id: string) =>
    router.push({ pathname: "/(tabs)/learn/[id]", params: { id } });

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Disclaimer textKey="learn.disclaimer" />

        <Card onPress={() => router.push("/(tabs)/learn/journey")}>
          <Card.Title
            title={t("learn.journeyTitle")}
            subtitle={t("learn.journeySubtitle")}
            subtitleNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="map-marker-path" />}
          />
        </Card>
        <Card onPress={() => router.push("/(tabs)/learn/simulator")}>
          <Card.Title
            title={t("learn.simulatorTitle")}
            subtitle={t("learn.simulatorSubtitle")}
            subtitleNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="family-tree" />}
          />
        </Card>

        {contentQuery.isPending ? <ActivityIndicator /> : null}
        {contentQuery.isError ? (
          <ErrorText message={mapSupabaseError(contentQuery.error)} />
        ) : null}
        {contentQuery.isSuccess && items.length === 0 ? (
          <EmptyState
            title={t("learn.emptyTitle")}
            description={t("learn.emptyDescription")}
          />
        ) : null}

        {awarenessCategories.map((category) => {
          const inCategory = items.filter((item) => item.category === category);
          if (inCategory.length === 0) return null;
          return (
            <View key={category} style={styles.section}>
              <Text variant="titleMedium">
                {t(`learn.categories.${category}`)}
              </Text>
              {inCategory.map((item) => (
                <Card key={item.id} onPress={() => open(item.id)}>
                  <Card.Title
                    title={localized(language, item.title_bn, item.title_en)}
                    titleNumberOfLines={3}
                    subtitle={
                      localized(language, item.summary_bn, item.summary_en) ||
                      undefined
                    }
                    subtitleNumberOfLines={3}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={
                          item.kind === "faq"
                            ? "help-circle-outline"
                            : item.kind === "medicine"
                              ? "pill"
                              : "book-open-page-variant"
                        }
                      />
                    )}
                  />
                </Card>
              ))}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
});

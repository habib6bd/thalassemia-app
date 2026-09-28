import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { usePublishedItem } from "@/features/learn/api";
import { localized } from "@/features/learn/categories";
import { ContentBody } from "@/features/learn/components/ContentBody";
import { SourcesList } from "@/features/learn/components/SourcesList";
import { useAppStore } from "@/stores/useAppStore";

export default function LearnItemScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const language = useAppStore((state) => state.language);
  const itemQuery = usePublishedItem(id);

  if (itemQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const item = itemQuery.data;
  if (!item) {
    return (
      <Screen>
        <ErrorText message={t("errors.not_found")} />
      </Screen>
    );
  }

  const summary = localized(language, item.summary_bn, item.summary_en);

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Chip compact icon="tag-outline" style={styles.chip}>
          {t(`learn.categories.${item.category}`)}
        </Chip>
        <Text variant="headlineSmall">
          {localized(language, item.title_bn, item.title_en)}
        </Text>
        {summary ? (
          <Text variant="titleMedium" style={styles.summary}>
            {summary}
          </Text>
        ) : null}

        {item.kind === "medicine" ? (
          <Disclaimer textKey="learn.medicineDisclaimer" />
        ) : null}

        <ContentBody text={localized(language, item.body_bn, item.body_en)} />

        <View style={styles.meta}>
          {item.reviewed_at ? (
            <Chip compact icon="check-decagram" style={styles.chip}>
              {t("learn.reviewedOn", {
                date: new Date(item.reviewed_at).toLocaleDateString(),
              })}
            </Chip>
          ) : null}
          <Text variant="bodySmall">
            {t("learn.lastUpdated", {
              date: new Date(item.updated_at).toLocaleDateString(),
            })}
          </Text>
        </View>

        <SourcesList contentId={item.id} />

        <Disclaimer textKey="learn.disclaimer" />

        {item.category === "genetic_counselling" ||
        item.category === "both_carriers" ||
        item.category === "screening" ? (
          <PrimaryButton
            label={t("learn.findCounselling")}
            icon="hospital-building"
            mode="outlined"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/directory",
                params: { type: "genetic_counselling" },
              })
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  chip: {
    alignSelf: "flex-start",
  },
  summary: {
    opacity: 0.85,
  },
  meta: {
    gap: 6,
  },
});

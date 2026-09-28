import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, ProgressBar, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { usePublishedContent } from "@/features/learn/api";
import { localized, screeningJourney } from "@/features/learn/categories";
import { useAppStore } from "@/stores/useAppStore";

// "Learn about carrier screening" (§16): a guided reading path, not a quiz.
// Each step shows the reviewed articles of one category; the last step
// points to a doctor / genetic counsellor. It asks nothing and stores nothing.
export default function ScreeningJourneyScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const contentQuery = usePublishedContent({ kind: "article" });
  const [step, setStep] = useState(0);
  const totalSteps = screeningJourney.length + 1;
  const isLast = step === screeningJourney.length;
  const category = screeningJourney[step];
  const articles = (contentQuery.data ?? []).filter(
    (item) => item.category === category,
  );

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="labelLarge">
          {t("learn.stepOf", { step: step + 1, total: totalSteps })}
        </Text>
        <ProgressBar progress={(step + 1) / totalSteps} />

        {isLast ? (
          <View style={styles.content}>
            <Text variant="headlineSmall">{t("learn.journeyEndTitle")}</Text>
            <Text variant="bodyLarge">{t("learn.journeyEndBody")}</Text>
            <PrimaryButton
              label={t("learn.findCounselling")}
              icon="hospital-building"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/directory",
                  params: { type: "genetic_counselling" },
                })
              }
            />
          </View>
        ) : (
          <View style={styles.content}>
            <Text variant="headlineSmall">
              {t(`learn.categories.${category}`)}
            </Text>
            {contentQuery.isPending ? <ActivityIndicator /> : null}
            {contentQuery.isSuccess && articles.length === 0 ? (
              <Text variant="bodyMedium">{t("learn.stepComingSoon")}</Text>
            ) : null}
            {articles.map((item) => (
              <Card
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/learn/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <Card.Title
                  title={localized(language, item.title_bn, item.title_en)}
                  titleNumberOfLines={3}
                />
                <Card.Content>
                  <Text variant="bodyMedium">
                    {localized(language, item.summary_bn, item.summary_en)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.nav}>
          <PrimaryButton
            label={t("common.back")}
            mode="outlined"
            disabled={step === 0}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
          />
          {!isLast ? (
            <PrimaryButton
              label={t("common.next")}
              onPress={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            />
          ) : null}
        </View>

        <Disclaimer textKey="learn.disclaimer" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
});

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Card, SegmentedButtons, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  inheritanceGrid,
  outcomeCounts,
  scenarios,
  type ChildOutcome,
  type Gene,
  type Scenario,
} from "@/features/learn/inheritance";
import { router } from "expo-router";

// Outcome icon + text; never colour alone (CLAUDE.md UI rules).
const outcomeIcons: Record<
  ChildOutcome,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  notCarrier: "circle-outline",
  carrier: "circle-half-full",
  thalassemia: "circle",
};

const geneLabel = (gene: Gene) => (gene === "typical" ? "A" : "a");

// Fixed educational diagram (§16). No user input, nothing stored.
export default function InheritanceSimulatorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [scenario, setScenario] = useState<Scenario>("carrierCarrier");
  const grid = inheritanceGrid(scenario);
  const counts = outcomeCounts(scenario);
  const [parentA, parentB] = scenarios[scenario];

  return (
    <Screen scroll>
      <View style={styles.content}>
        <View
          style={[
            styles.banner,
            { backgroundColor: theme.colors.errorContainer },
          ]}
          accessibilityRole="alert"
        >
          <MaterialCommunityIcons
            name="school"
            size={24}
            color={theme.colors.onErrorContainer}
          />
          <Text
            variant="titleSmall"
            style={[
              styles.bannerText,
              { color: theme.colors.onErrorContainer },
            ]}
          >
            {t("learn.simulatorBanner")}
          </Text>
        </View>

        <SegmentedButtons
          value={scenario}
          onValueChange={(value) => setScenario(value as Scenario)}
          buttons={[
            {
              value: "carrierCarrier",
              label: t("learn.scenarioCarrierCarrier"),
            },
            {
              value: "carrierNonCarrier",
              label: t("learn.scenarioCarrierNonCarrier"),
            },
          ]}
        />

        <Text variant="bodyMedium">{t("learn.simulatorKey")}</Text>
        <Text variant="bodyMedium">
          {t("learn.parentA", { who: t(`learn.parent.${parentA}`) })}
          {"\n"}
          {t("learn.parentB", { who: t(`learn.parent.${parentB}`) })}
        </Text>

        <View style={styles.grid} accessibilityLabel={t("learn.gridLabel")}>
          {grid.map((cell, index) => (
            <Card key={index} style={styles.cell} mode="outlined">
              <Card.Content style={styles.cellContent}>
                <MaterialCommunityIcons
                  name={outcomeIcons[cell.outcome]}
                  size={28}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium">
                  {geneLabel(cell.fromA)}
                  {geneLabel(cell.fromB)}
                </Text>
                <Text variant="bodyMedium" style={styles.cellText}>
                  {t(`learn.outcome.${cell.outcome}`)}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Card>
          <Card.Content style={styles.summary}>
            <Text variant="titleSmall">{t("learn.inThisExample")}</Text>
            {(Object.keys(counts) as ChildOutcome[]).map((outcome) => (
              <View key={outcome} style={styles.summaryRow}>
                <MaterialCommunityIcons
                  name={outcomeIcons[outcome]}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="bodyMedium">
                  {t("learn.boxesOutOfFour", {
                    count: counts[outcome],
                    outcome: t(`learn.outcome.${outcome}`),
                  })}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Text variant="bodyMedium">{t("learn.simulatorNote")}</Text>

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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    padding: 12,
  },
  bannerText: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cell: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  cellContent: {
    alignItems: "center",
    gap: 4,
    minHeight: 96,
  },
  cellText: {
    textAlign: "center",
  },
  summary: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

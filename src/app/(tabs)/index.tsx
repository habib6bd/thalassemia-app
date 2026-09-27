import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/stores/useAppStore";
import type { SupportedLanguage } from "@/lib/i18n";

export default function HomeScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="headlineMedium">{t("welcome.title")}</Text>
        <Text variant="bodyLarge">{t("welcome.subtitle")}</Text>

        <View>
          <Text variant="labelLarge" style={styles.languageLabel}>
            {t("language.label")}
          </Text>
          <SegmentedButtons
            value={language}
            onValueChange={(value) => setLanguage(value as SupportedLanguage)}
            buttons={[
              { value: "bn", label: t("language.bn") },
              { value: "en", label: t("language.en") },
            ]}
          />
        </View>

        <Disclaimer />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  languageLabel: {
    marginBottom: 8,
  },
});

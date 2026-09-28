import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { Chip } from "react-native-paper";

// Shown on every community post (§28.10): icon + text, never colour alone.
export function PersonalExperienceLabel() {
  const { t } = useTranslation();

  return (
    <Chip compact icon="account-voice" style={styles.chip}>
      {t("community.personalExperienceLabel")}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
  },
});

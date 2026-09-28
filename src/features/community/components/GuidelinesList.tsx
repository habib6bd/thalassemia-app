import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { List, Text } from "react-native-paper";

const rules = [
  { key: "personal", icon: "account-voice" },
  { key: "noMedicalAdvice", icon: "medical-bag" },
  { key: "noMoney", icon: "cash-remove" },
  { key: "privacy", icon: "shield-account" },
  { key: "respect", icon: "hand-heart" },
  { key: "report", icon: "flag" },
  { key: "emergency", icon: "phone-alert" },
] as const;

export function GuidelinesList() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium">{t("community.guidelinesIntro")}</Text>
      {rules.map((rule) => (
        <List.Item
          key={rule.key}
          title={t(`community.guidelines.${rule.key}`)}
          titleNumberOfLines={6}
          left={(props) => <List.Icon {...props} icon={rule.icon} />}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
});

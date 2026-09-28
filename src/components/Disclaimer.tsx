import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

type DisclaimerProps = {
  /** Overrides the default generic disclaimer with a screen-specific one. */
  textKey?: string;
};

// Renders the non-negotiable "this app doesn't decide X" disclaimer
// (CLAUDE.md product rule #1). Used on any screen touching eligibility,
// requests, or donations.
export function Disclaimer({
  textKey = "disclaimer.generic",
}: DisclaimerProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {t(textKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
  },
});

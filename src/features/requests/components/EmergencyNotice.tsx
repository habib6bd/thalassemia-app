import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import { PrimaryButton } from "@/components/PrimaryButton";

// OPEN_QUESTIONS Q15: verify the number before release.
export const EMERGENCY_NUMBER = "999";

// CLAUDE.md #7 / master prompt §22: every emergency screen says the app is
// not an emergency service and points to the real one.
export function EmergencyNotice({ showCallButton = true }: { showCallButton?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.errorContainer }]}
      accessibilityRole="alert"
    >
      <View style={styles.titleRow}>
        <Icon source="alert-octagon" size={24} color={theme.colors.onErrorContainer} />
        <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, flex: 1 }}>
          {t("emergency.noticeTitle")}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
        {t("emergency.noticeBody", { number: EMERGENCY_NUMBER })}
      </Text>
      {showCallButton ? (
        <PrimaryButton
          label={t("emergency.callNumber", { number: EMERGENCY_NUMBER })}
          icon="phone"
          onPress={() => void Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
        />
      ) : null}
    </View>
  );
}

// Status is never colour-only (CLAUDE.md): icon + text label.
export function EmergencyBadge() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.errorContainer }]}>
      <Icon source="alert-octagon" size={16} color={theme.colors.onErrorContainer} />
      <Text variant="labelLarge" style={{ color: theme.colors.onErrorContainer }}>
        {t("emergency.badge")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

import { router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useMyRoles } from "@/features/profile/api";
import type { SupportedLanguage } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";

export default function HomeScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const activeRole = useAppStore((state) => state.activeRole);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const rolesQuery = useMyRoles(session?.user.id);

  const roles = (rolesQuery.data ?? []).filter(
    (r): r is "patient" | "guardian" | "donor" =>
      r === "patient" || r === "guardian" || r === "donor",
  );

  useEffect(() => {
    if (
      roles.length > 0 &&
      (!activeRole || !roles.includes(activeRole as (typeof roles)[number]))
    ) {
      setActiveRole(roles[0]);
    }
  }, [roles, activeRole, setActiveRole]);

  const isDonorPrimary = activeRole === "donor";

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="headlineMedium">{t("welcome.title")}</Text>
        <Text variant="bodyLarge">{t("welcome.subtitle")}</Text>

        {roles.length > 1 ? (
          <View>
            <Text variant="labelLarge" style={styles.switcherLabel}>
              {t("home.roleSwitcher")}
            </Text>
            <SegmentedButtons
              value={activeRole ?? roles[0]}
              onValueChange={(value) =>
                setActiveRole(value as (typeof roles)[number])
              }
              buttons={roles.map((role) => ({
                value: role,
                label: t(`roles.${role}`),
              }))}
            />
          </View>
        ) : null}

        <View style={styles.primaryAction}>
          <PrimaryButton
            label={
              isDonorPrimary
                ? t("home.viewBloodRequests")
                : t("home.requestBlood")
            }
            onPress={() =>
              router.push(
                isDonorPrimary ? "/(tabs)/requests" : "/(tabs)/requests/new",
              )
            }
          />
        </View>

        <View>
          <Text variant="labelLarge" style={styles.switcherLabel}>
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
  switcherLabel: {
    marginBottom: 8,
  },
  primaryAction: {
    gap: 4,
  },
});

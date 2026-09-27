import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Chip, List, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useSignOut } from "@/features/auth/api";
import { useAddRole, useMyRoles, useProfile } from "@/features/profile/api";
import {
  selfServiceRoles,
  type SelfServiceRole,
} from "@/features/onboarding/schema";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const profileQuery = useProfile(session?.user.id);
  const rolesQuery = useMyRoles(session?.user.id);
  const addRole = useAddRole();
  const signOut = useSignOut();
  const [error, setError] = useState<string | null>(null);

  const roles = rolesQuery.data ?? [];
  const missingRoles = selfServiceRoles.filter((role) => !roles.includes(role));

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="headlineSmall">{profileQuery.data?.display_name}</Text>
        <Text variant="bodyMedium">{session?.user.email}</Text>

        <View>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t("profile.rolesLabel")}
          </Text>
          <View style={styles.chipRow}>
            {roles.map((role) => (
              <Chip key={role}>{t(`roles.${role}`)}</Chip>
            ))}
          </View>
        </View>

        {missingRoles.length > 0 ? (
          <View>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              {t("profile.addRoleLabel")}
            </Text>
            <View style={styles.chipRow}>
              {missingRoles.map((role: SelfServiceRole) => (
                <Chip
                  key={role}
                  icon="plus"
                  onPress={() => {
                    setError(null);
                    addRole.mutate(role, {
                      onError: (err) => setError(mapSupabaseError(err)),
                    });
                  }}
                >
                  {t(`roles.${role}`)}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        {error ? <ErrorText message={error} /> : null}

        {roles.includes("donor") ? (
          <>
            <List.Item
              title={t("profile.donorSettings")}
              left={(props) => <List.Icon {...props} icon="water" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push("/(tabs)/profile/donor")}
            />
            <List.Item
              title={t("donorProfile.donationHistory")}
              left={(props) => <List.Icon {...props} icon="history" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push("/(tabs)/profile/donations")}
            />
          </>
        ) : null}

        <PrimaryButton
          label={t("profile.signOut")}
          mode="outlined"
          loading={signOut.isPending}
          onPress={() =>
            signOut.mutate(undefined, {
              onSuccess: () => router.replace("/(auth)/sign-in"),
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

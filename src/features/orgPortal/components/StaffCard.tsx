import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Button, Card, List, Searchbar, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { useAdminUsers } from "@/features/admin/api";
import {
  useOrganizationMembers,
  useSetOrganizationMember,
} from "@/features/orgPortal/api";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";

// Admin-only: staff who may use the organization portal (Phase 4b).
export function StaffCard({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const membersQuery = useOrganizationMembers(organizationId);
  const setMember = useSetOrganizationMember(organizationId);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const usersQuery = useAdminUsers(submitted, submitted.length > 0);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set((membersQuery.data ?? []).map((m) => m.user_id));

  const change = (userId: string, member: boolean) => {
    setError(null);
    setMember.mutate(
      { userId, member },
      { onError: (err) => setError(mapSupabaseError(err)) },
    );
  };

  return (
    <Card>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium">{t("orgPortal.staffTitle")}</Text>
        <Text variant="bodySmall">{t("orgPortal.staffHint")}</Text>
        {(membersQuery.data ?? []).length === 0 ? (
          <Text variant="bodyMedium">{t("orgPortal.noStaff")}</Text>
        ) : null}
        {(membersQuery.data ?? []).map((member) => (
          <List.Item
            key={member.user_id}
            title={personName(member.display_name) ?? ""}
            description={member.email}
            left={(props) => <List.Icon {...props} icon="badge-account" />}
            right={() => (
              <Button
                compact
                disabled={setMember.isPending}
                onPress={() => change(member.user_id, false)}
              >
                {t("orgPortal.removeStaff")}
              </Button>
            )}
          />
        ))}

        <Searchbar
          placeholder={t("admin.searchUsers")}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmitted(query.trim())}
          onIconPress={() => setSubmitted(query.trim())}
        />
        <View>
          {(usersQuery.data ?? [])
            .filter((user) => !user.deleted && !memberIds.has(user.user_id))
            .slice(0, 5)
            .map((user) => (
              <List.Item
                key={user.user_id}
                title={personName(user.display_name) ?? ""}
                description={user.email}
                right={() => (
                  <Button
                    compact
                    icon="plus"
                    disabled={setMember.isPending}
                    onPress={() => change(user.user_id, true)}
                  >
                    {t("orgPortal.addStaff")}
                  </Button>
                )}
              />
            ))}
        </View>
        {error ? <ErrorText message={error} /> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
  },
});

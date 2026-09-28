import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Searchbar,
  Text,
} from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useAdminUsers, useSetUserRole } from "@/features/admin/api";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";

// Only roles that can't be self-assigned are managed here.
const managedRoles = ["organization", "admin"] as const;
type ManagedRole = (typeof managedRoles)[number];

type PendingChange = {
  userId: string;
  name: string;
  role: ManagedRole;
  granted: boolean;
};

export default function AdminUsersScreen() {
  return (
    <AdminGate>
      <AdminUsers />
    </AdminGate>
  );
}

function AdminUsers() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const usersQuery = useAdminUsers(submitted, true);
  const setRole = useSetUserRole();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen>
      <FlatList
        data={usersQuery.data ?? []}
        keyExtractor={(item) => item.user_id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Searchbar
              placeholder={t("admin.searchUsers")}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => setSubmitted(query.trim())}
              onIconPress={() => setSubmitted(query.trim())}
            />
            {usersQuery.isPending ? <ActivityIndicator /> : null}
            {error ? <ErrorText message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          usersQuery.isSuccess ? (
            <EmptyState title={t("common.noResults")} />
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.content}>
              <Text variant="titleMedium">
                {item.deleted
                  ? t("common.deletedUser")
                  : personName(item.display_name)}
              </Text>
              <Text variant="bodySmall">{item.email}</Text>
              <View style={styles.chipRow}>
                {item.roles.map((role) => (
                  <Chip key={role} compact icon="badge-account">
                    {t(`roles.${role}`)}
                  </Chip>
                ))}
              </View>
              {!item.deleted ? (
                <View style={styles.chipRow}>
                  {managedRoles.map((role) => {
                    const has = item.roles.includes(role);
                    return (
                      <Chip
                        key={role}
                        icon={has ? "minus" : "plus"}
                        onPress={() =>
                          setPending({
                            userId: item.user_id,
                            name: personName(item.display_name) ?? "",
                            role,
                            granted: !has,
                          })
                        }
                      >
                        {t(has ? "admin.removeRole" : "admin.grantRole", {
                          role: t(`roles.${role}`),
                        })}
                      </Chip>
                    );
                  })}
                </View>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />

      <ConfirmDialog
        visible={!!pending}
        title={
          pending
            ? t(pending.granted ? "admin.grantRole" : "admin.removeRole", {
                role: t(`roles.${pending.role}`),
              })
            : ""
        }
        description={
          pending ? t("admin.roleConfirm", { name: pending.name }) : ""
        }
        confirmLabel={t("common.yes")}
        loading={setRole.isPending}
        onDismiss={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setError(null);
          setRole.mutate(
            {
              userId: pending.userId,
              role: pending.role,
              granted: pending.granted,
            },
            {
              onSuccess: () => setPending(null),
              onError: (err) => {
                setPending(null);
                setError(mapSupabaseError(err));
              },
            },
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 8,
  },
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

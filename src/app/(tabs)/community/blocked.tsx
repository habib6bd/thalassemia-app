import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, List } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useBlockedUsers, useUnblockUser } from "@/features/community/api";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const blockedQuery = useBlockedUsers();
  const unblock = useUnblockUser();
  const [error, setError] = useState<string | null>(null);

  if (blockedQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        {error ? <ErrorText message={error} /> : null}
        <FlatList
          data={blockedQuery.data ?? []}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={
            <EmptyState title={t("community.blockedEmpty")} />
          }
          renderItem={({ item }) => (
            <List.Item
              title={personName(item.display_name) ?? ""}
              left={(props) => <List.Icon {...props} icon="account-cancel" />}
              right={() => (
                <Button
                  compact
                  onPress={() => {
                    setError(null);
                    unblock.mutate(item.user_id, {
                      onError: (err) => setError(mapSupabaseError(err)),
                    });
                  }}
                >
                  {t("community.unblock")}
                </Button>
              )}
            />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 8,
  },
});

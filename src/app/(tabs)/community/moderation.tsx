import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import {
  useModerateContent,
  useModerationQueue,
} from "@/features/community/api";
import type {
  CommunityTargetType,
  ModerationAction,
} from "@/features/community/schema";
import { useMyRoles } from "@/features/profile/api";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

const actions: { action: ModerationAction; icon: string }[] = [
  { action: "restore", icon: "check" },
  { action: "hide", icon: "eye-off" },
  { action: "remove", icon: "delete" },
];

// Admin-only review queue (§28.8). The RPCs re-check the admin role.
export default function ModerationQueueScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const rolesQuery = useMyRoles(session?.user.id);
  const isAdmin = (rolesQuery.data ?? []).includes("admin");
  const queueQuery = useModerationQueue(isAdmin);
  const moderate = useModerateContent();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (rolesQuery.isPending || (isAdmin && queueQuery.isPending)) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorText message={t("errors.not_authorized")} />
      </Screen>
    );
  }

  const onModerate = (
    targetType: CommunityTargetType,
    targetId: string,
    action: ModerationAction,
  ) => {
    setError(null);
    moderate.mutate(
      { targetType, targetId, action, note: notes[targetId] },
      { onError: (err) => setError(mapSupabaseError(err)) },
    );
  };

  return (
    <Screen>
      <FlatList
        data={queueQuery.data ?? []}
        keyExtractor={(item) => `${item.target_type}:${item.target_id}`}
        ListHeaderComponent={error ? <ErrorText message={error} /> : null}
        ListEmptyComponent={
          <EmptyState title={t("community.moderationEmpty")} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.content}>
              <View style={styles.chipRow}>
                <Chip
                  compact
                  icon={item.target_type === "post" ? "text-box" : "comment"}
                >
                  {item.target_type === "post"
                    ? t("community.targetPost")
                    : t("community.targetComment")}
                </Chip>
                <Chip compact icon="information-outline">
                  {t(`community.status.${item.status}`)}
                </Chip>
                <Chip compact icon="flag">
                  {t("community.openReports", { count: item.open_reports })}
                </Chip>
              </View>
              {item.has_selling_blood ? (
                <Chip icon="alert" style={styles.flag}>
                  {t("community.sellingBloodFlag")}
                </Chip>
              ) : null}
              {item.title ? (
                <Text variant="titleMedium">{item.title}</Text>
              ) : null}
              <Text variant="bodyMedium" numberOfLines={8}>
                {item.body}
              </Text>
              <Text variant="bodySmall">
                {t("community.byAuthor", {
                  name: personName(item.author_name),
                })}
              </Text>
              <Text variant="bodySmall">
                {t("community.reasonsLabel", {
                  reasons: item.reasons
                    .map((reason) => t(`community.reasons.${reason}`))
                    .join(", "),
                })}
              </Text>
              {item.details.map((detail, index) => (
                <Text key={index} variant="bodySmall">
                  “{detail}”
                </Text>
              ))}
              {item.post_id && item.status === "published" ? (
                <Button
                  compact
                  icon="open-in-new"
                  style={styles.openButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/community/[id]",
                      params: { id: item.post_id as string },
                    })
                  }
                >
                  {t("community.targetPost")}
                </Button>
              ) : null}
              <TextField
                label={t("community.moderationNote")}
                value={notes[item.target_id] ?? ""}
                onChangeText={(text) =>
                  setNotes((prev) => ({ ...prev, [item.target_id]: text }))
                }
                maxLength={500}
                mode="outlined"
                dense
              />
              <View style={styles.chipRow}>
                {actions.map(({ action, icon }) => (
                  <Button
                    key={action}
                    mode={action === "restore" ? "outlined" : "contained-tonal"}
                    icon={icon}
                    disabled={moderate.isPending}
                    contentStyle={styles.actionButton}
                    onPress={() =>
                      onModerate(
                        item.target_type as CommunityTargetType,
                        item.target_id,
                        action,
                      )
                    }
                  >
                    {t(`community.${action}`)}
                  </Button>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  flag: {
    alignSelf: "flex-start",
  },
  openButton: {
    alignSelf: "flex-start",
  },
  actionButton: {
    minHeight: 48,
  },
});

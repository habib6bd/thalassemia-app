import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";

import { PersonalExperienceLabel } from "@/features/community/components/PersonalExperienceLabel";
import type { CommunityTopic } from "@/features/community/schema";
import { personName } from "@/lib/displayName";

type PostCardProps = {
  post: {
    title: string;
    body: string;
    topic: CommunityTopic;
    status: string;
    author_name: string;
    is_mine: boolean;
    comment_count?: number;
    created_at: string;
  };
  onPress?: () => void;
  /** Feed shows a preview; the detail screen shows the full text. */
  preview?: boolean;
};

export function PostCard({ post, onPress, preview = false }: PostCardProps) {
  const { t } = useTranslation();

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.chipRow}>
          <Chip compact icon="tag-outline">
            {t(`community.topics.${post.topic}`)}
          </Chip>
          {post.status === "hidden" ? (
            <Chip compact icon="eye-off">
              {t("community.statusHidden")}
            </Chip>
          ) : null}
        </View>
        <Text variant="titleMedium">{post.title}</Text>
        <Text variant="bodyMedium" numberOfLines={preview ? 4 : undefined}>
          {post.body}
        </Text>
        <PersonalExperienceLabel />
        <Text variant="bodySmall" style={styles.meta}>
          {t("community.byAuthor", {
            name: post.is_mine
              ? t("community.you")
              : personName(post.author_name),
          })}
          {" · "}
          {new Date(post.created_at).toLocaleDateString()}
          {post.comment_count !== undefined
            ? ` · ${t("community.commentCount", { count: post.comment_count })}`
            : ""}
        </Text>
      </Card.Content>
    </Card>
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
  meta: {
    opacity: 0.7,
  },
});

import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  useBlockUser,
  useCommunityComments,
  useCommunityGuidelinesAccepted,
  useCommunityPost,
  useCreateCommunityComment,
  useDeleteCommunityComment,
  useDeleteCommunityPost,
} from "@/features/community/api";
import { PostCard } from "@/features/community/components/PostCard";
import { ReportDialog } from "@/features/community/components/ReportDialog";
import {
  communityCommentSchema,
  type CommunityCommentInput,
  type CommunityTargetType,
} from "@/features/community/schema";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";

type PendingConfirm =
  | { kind: "deletePost" }
  | { kind: "deleteComment"; id: string }
  | { kind: "block"; userId: string; name: string };

export default function CommunityPostScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postQuery = useCommunityPost(id);
  const commentsQuery = useCommunityComments(id);
  const acceptedQuery = useCommunityGuidelinesAccepted();
  const createComment = useCreateCommunityComment(id);
  const deleteComment = useDeleteCommunityComment(id);
  const deletePost = useDeleteCommunityPost();
  const blockUser = useBlockUser();

  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: CommunityTargetType;
    id: string;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommunityCommentInput>({
    resolver: zodResolver(communityCommentSchema),
    defaultValues: { body: "" },
  });

  const onSendComment = handleSubmit((values) => {
    setError(null);
    createComment.mutate(values.body, {
      onSuccess: () => reset(),
      onError: (err) => setError(mapSupabaseError(err)),
    });
  });

  const onConfirm = () => {
    if (!confirm) return;
    const onError = (err: Error) => {
      setConfirm(null);
      setError(mapSupabaseError(err));
    };
    if (confirm.kind === "deletePost") {
      deletePost.mutate(id, { onSuccess: () => router.back(), onError });
    } else if (confirm.kind === "deleteComment") {
      deleteComment.mutate(confirm.id, {
        onSuccess: () => setConfirm(null),
        onError,
      });
    } else {
      // The blocked user's content disappears, so leave a post they wrote.
      const leave = confirm.userId === postQuery.data?.author_id;
      blockUser.mutate(confirm.userId, {
        onSuccess: () => {
          setConfirm(null);
          if (leave) router.back();
        },
        onError,
      });
    }
  };

  if (postQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (postQuery.isError || !postQuery.data) {
    return (
      <Screen>
        <ErrorText message={mapSupabaseError(postQuery.error)} />
      </Screen>
    );
  }

  const post = postQuery.data;
  const canComment = post.status === "published";

  return (
    <Screen>
      <FlatList
        data={commentsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <PostCard post={post} />
            {post.status === "hidden" ? (
              <Text variant="bodyMedium">{t("community.hiddenNotice")}</Text>
            ) : null}
            <View style={styles.actions}>
              {post.is_mine ? (
                <Button
                  icon="delete"
                  onPress={() => setConfirm({ kind: "deletePost" })}
                >
                  {t("community.delete")}
                </Button>
              ) : (
                <>
                  <Button
                    icon="flag"
                    disabled={post.reported_by_me}
                    onPress={() =>
                      setReportTarget({ type: "post", id: post.id })
                    }
                  >
                    {post.reported_by_me
                      ? t("community.reported")
                      : t("community.report")}
                  </Button>
                  <Button
                    icon="account-cancel"
                    onPress={() =>
                      setConfirm({
                        kind: "block",
                        userId: post.author_id,
                        name: personName(post.author_name) ?? "",
                      })
                    }
                  >
                    {t("community.block")}
                  </Button>
                </>
              )}
            </View>
            {error ? <ErrorText message={error} /> : null}
            <Text variant="titleMedium">{t("community.commentsTitle")}</Text>
            {commentsQuery.isSuccess && commentsQuery.data.length === 0 ? (
              <Text variant="bodyMedium">{t("community.noComments")}</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.comment}>
            <Card.Content style={styles.commentContent}>
              {item.status === "hidden" ? (
                <Text variant="labelMedium">{t("community.statusHidden")}</Text>
              ) : null}
              <Text variant="bodyMedium">{item.body}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                {t("community.byAuthor", {
                  name: item.is_mine
                    ? t("community.you")
                    : personName(item.author_name),
                })}
                {" · "}
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <View style={styles.actions}>
                {item.is_mine ? (
                  <Button
                    compact
                    icon="delete"
                    onPress={() =>
                      setConfirm({ kind: "deleteComment", id: item.id })
                    }
                  >
                    {t("community.delete")}
                  </Button>
                ) : (
                  <>
                    <Button
                      compact
                      icon="flag"
                      disabled={item.reported_by_me}
                      onPress={() =>
                        setReportTarget({ type: "comment", id: item.id })
                      }
                    >
                      {item.reported_by_me
                        ? t("community.reported")
                        : t("community.report")}
                    </Button>
                    <Button
                      compact
                      icon="account-cancel"
                      onPress={() =>
                        setConfirm({
                          kind: "block",
                          userId: item.author_id,
                          name: personName(item.author_name) ?? "",
                        })
                      }
                    >
                      {t("community.block")}
                    </Button>
                  </>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        ListFooterComponent={
          canComment ? (
            <View style={styles.footer}>
              {acceptedQuery.data ? (
                <>
                  <Controller
                    control={control}
                    name="body"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        label={t("community.commentLabel")}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        maxLength={2000}
                        mode="outlined"
                        error={!!errors.body}
                      />
                    )}
                  />
                  <PrimaryButton
                    label={t("community.sendComment")}
                    loading={createComment.isPending}
                    onPress={onSendComment}
                  />
                </>
              ) : (
                <PrimaryButton
                  label={t("community.readGuidelines")}
                  mode="outlined"
                  onPress={() => router.push("/(tabs)/community/guidelines")}
                />
              )}
            </View>
          ) : null
        }
      />

      <ReportDialog
        target={reportTarget}
        onDismiss={() => setReportTarget(null)}
        onReported={() => {
          setReportTarget(null);
          setSnackbar(t("community.reportThanks"));
        }}
      />

      <ConfirmDialog
        visible={!!confirm}
        title={
          confirm?.kind === "block"
            ? t("community.blockTitle", { name: confirm.name })
            : confirm?.kind === "deleteComment"
              ? t("community.deleteCommentTitle")
              : t("community.deletePostTitle")
        }
        description={
          confirm?.kind === "block"
            ? t("community.blockDescription")
            : confirm?.kind === "deleteComment"
              ? t("community.deleteCommentDescription")
              : t("community.deletePostDescription")
        }
        confirmLabel={
          confirm?.kind === "block"
            ? t("community.block")
            : t("community.delete")
        }
        loading={
          deletePost.isPending || deleteComment.isPending || blockUser.isPending
        }
        onConfirm={onConfirm}
        onDismiss={() => setConfirm(null)}
      />

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar(null)}>
        {snackbar ?? ""}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  comment: {
    marginBottom: 8,
  },
  commentContent: {
    gap: 4,
  },
  meta: {
    opacity: 0.7,
  },
  footer: {
    gap: 8,
    marginTop: 8,
  },
});

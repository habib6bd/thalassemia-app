import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Checkbox,
  Chip,
  HelperText,
  Text,
} from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { AdminGate } from "@/features/admin/components/AdminGate";
import {
  useAdminContent,
  useAdminSources,
  useSetContentSources,
  useTransitionContent,
  useUpsertContent,
  type AdminContent,
} from "@/features/learn/api";
import {
  awarenessCategories,
  contentKinds,
  reviewStatusIcons,
  reviewTransitions,
  type ReviewStatus,
} from "@/features/learn/categories";
import { contentSchema, type ContentFormInput } from "@/features/learn/schema";
import { mapSupabaseError } from "@/lib/errors";

type TextFieldName = Exclude<
  keyof ContentFormInput,
  "kind" | "category" | "sortOrder"
>;

const textFields: { name: TextFieldName; max: number; lines?: number }[] = [
  { name: "slug", max: 80 },
  { name: "titleBn", max: 200 },
  { name: "titleEn", max: 200 },
  { name: "summaryBn", max: 500, lines: 3 },
  { name: "summaryEn", max: 500, lines: 3 },
  { name: "bodyBn", max: 20000, lines: 12 },
  { name: "bodyEn", max: 20000, lines: 12 },
];

export default function AdminContentEditorScreen() {
  return (
    <AdminGate>
      <AdminContentEditor />
    </AdminGate>
  );
}

function AdminContentEditor() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const contentQuery = useAdminContent(id);

  if (!isNew && contentQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const content = contentQuery.data;
  if (!isNew && !content) {
    return (
      <Screen>
        <ErrorText message={t("errors.not_found")} />
      </Screen>
    );
  }

  const locked =
    content?.review_status === "published" ||
    content?.review_status === "retired";

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Disclaimer textKey="admin.contentRules" />
        {content ? <WorkflowCard content={content} /> : null}
        {content ? <SourcesCard content={content} locked={locked} /> : null}
        <ContentForm content={content ?? null} locked={locked} />
      </View>
    </Screen>
  );
}

function WorkflowCard({ content }: { content: AdminContent }) {
  const { t } = useTranslation();
  const transition = useTransitionContent(content.id);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onTransition = (toStatus: ReviewStatus) => {
    setError(null);
    transition.mutate(
      { toStatus, note },
      {
        onSuccess: () => setNote(""),
        onError: (err) => setError(mapSupabaseError(err)),
      },
    );
  };

  return (
    <Card>
      <Card.Content style={styles.form}>
        <Text variant="titleMedium">{t("admin.reviewTitle")}</Text>
        <View style={styles.chips}>
          <Chip compact icon={reviewStatusIcons[content.review_status]}>
            {t(`admin.reviewStatus.${content.review_status}`)}
          </Chip>
          {content.drafted_by === "agent" ? (
            <Chip compact icon="robot-outline">
              {t("admin.agentDraft")}
            </Chip>
          ) : null}
        </View>
        {content.reviewed_at ? (
          <Text variant="bodySmall">
            {t("admin.reviewedBy", {
              name: content.reviewer_name ?? "",
              date: new Date(content.reviewed_at).toLocaleDateString(),
            })}
          </Text>
        ) : null}
        {content.next_review_due ? (
          <Text variant="bodySmall">
            {t("admin.nextReviewDue", {
              date: new Date(content.next_review_due).toLocaleDateString(),
            })}
          </Text>
        ) : null}
        {content.review_note ? (
          <Text variant="bodySmall">“{content.review_note}”</Text>
        ) : null}
        <Text variant="bodySmall">{t("admin.reviewHint")}</Text>
        <TextField
          label={t("admin.reviewNote")}
          value={note}
          onChangeText={setNote}
          maxLength={1000}
          multiline
          mode="outlined"
        />
        <View style={styles.chips}>
          {reviewTransitions[content.review_status].map((toStatus) => (
            <PrimaryButton
              key={toStatus}
              label={t(
                toStatus === content.review_status
                  ? "admin.transition.rereview"
                  : `admin.transition.${toStatus}`,
              )}
              icon={reviewStatusIcons[toStatus]}
              mode={
                toStatus === "draft" || toStatus === "retired"
                  ? "outlined"
                  : "contained"
              }
              loading={
                transition.isPending &&
                transition.variables?.toStatus === toStatus
              }
              disabled={transition.isPending}
              onPress={() => onTransition(toStatus)}
            />
          ))}
        </View>
        {error ? <ErrorText message={error} /> : null}
      </Card.Content>
    </Card>
  );
}

function SourcesCard({
  content,
  locked,
}: {
  content: AdminContent;
  locked: boolean;
}) {
  const { t } = useTranslation();
  const sourcesQuery = useAdminSources(true);
  const setSources = useSetContentSources(content.id);
  const [selected, setSelected] = useState<string[]>(content.source_ids);
  const [error, setError] = useState<string | null>(null);

  const changed =
    selected.length !== content.source_ids.length ||
    selected.some((sourceId) => !content.source_ids.includes(sourceId));

  return (
    <Card>
      <Card.Content style={styles.form}>
        <Text variant="titleMedium">{t("admin.sources")}</Text>
        <Text variant="bodySmall">{t("admin.sourcesHint")}</Text>
        {(sourcesQuery.data ?? []).map((source) => (
          <Checkbox.Item
            key={source.id}
            label={`${source.title}${
              source.accessed_at
                ? ` · ${t("learn.sourceChecked", {
                    date: new Date(source.accessed_at).toLocaleDateString(),
                  })}`
                : ` · ${t("admin.sourceUnchecked")}`
            }`}
            labelStyle={styles.sourceLabel}
            status={selected.includes(source.id) ? "checked" : "unchecked"}
            disabled={locked}
            onPress={() =>
              setSelected((prev) =>
                prev.includes(source.id)
                  ? prev.filter((x) => x !== source.id)
                  : [...prev, source.id],
              )
            }
          />
        ))}
        {!locked ? (
          <PrimaryButton
            label={t("admin.saveSources")}
            mode="outlined"
            disabled={!changed}
            loading={setSources.isPending}
            onPress={() => {
              setError(null);
              setSources.mutate(selected, {
                onError: (err) => setError(mapSupabaseError(err)),
              });
            }}
          />
        ) : null}
        {error ? <ErrorText message={error} /> : null}
      </Card.Content>
    </Card>
  );
}

function ContentForm({
  content,
  locked,
}: {
  content: AdminContent | null;
  locked: boolean;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertContent();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ContentFormInput>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      kind: content?.kind ?? "article",
      slug: content?.slug ?? "",
      category: content?.category ?? "what_is_thalassemia",
      titleBn: content?.title_bn ?? "",
      titleEn: content?.title_en ?? "",
      summaryBn: content?.summary_bn ?? "",
      summaryEn: content?.summary_en ?? "",
      bodyBn: content?.body_bn ?? "",
      bodyEn: content?.body_en ?? "",
      sortOrder: content?.sort_order ?? 0,
    },
  });

  const onSave = handleSubmit((values) => {
    setError(null);
    setSaved(false);
    upsert.mutate(
      { ...values, contentId: content?.id ?? null },
      {
        onSuccess: (row) => {
          if (!content) {
            router.replace({
              pathname: "/(tabs)/admin/content/[id]",
              params: { id: row.id },
            });
          } else {
            setSaved(true);
          }
        },
        onError: (err) => setError(mapSupabaseError(err)),
      },
    );
  });

  return (
    <View style={styles.form}>
      {locked ? (
        <Text variant="bodyMedium">{t("admin.contentLockedHint")}</Text>
      ) : content ? (
        <Text variant="bodySmall">{t("admin.editResetsReview")}</Text>
      ) : null}

      <Text variant="labelLarge">{t("admin.contentFields.kind")}</Text>
      <Controller
        control={control}
        name="kind"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chips}>
            {contentKinds.map((kind) => (
              <Chip
                key={kind}
                selected={value === kind}
                showSelectedCheck
                disabled={locked}
                onPress={() => onChange(kind)}
              >
                {t(`admin.contentKind.${kind}`)}
              </Chip>
            ))}
          </View>
        )}
      />
      <Text variant="labelLarge">{t("admin.contentFields.category")}</Text>
      <Controller
        control={control}
        name="category"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chips}>
            {awarenessCategories.map((category) => (
              <Chip
                key={category}
                selected={value === category}
                showSelectedCheck
                disabled={locked}
                onPress={() => onChange(category)}
              >
                {t(`learn.categories.${category}`)}
              </Chip>
            ))}
          </View>
        )}
      />
      <Controller
        control={control}
        name="sortOrder"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t("admin.contentFields.sortOrder")}
            value={String(value)}
            onChangeText={(text) =>
              onChange(Number(text.replace(/\D/g, "")) || 0)
            }
            onBlur={onBlur}
            keyboardType="number-pad"
            mode="outlined"
            disabled={locked}
          />
        )}
      />
      {textFields.map((field) => (
        <View key={field.name}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label={t(`admin.contentFields.${field.name}`)}
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={field.max}
                multiline={!!field.lines}
                numberOfLines={field.lines}
                autoCapitalize={field.name === "slug" ? "none" : undefined}
                mode="outlined"
                disabled={locked}
                error={!!errors[field.name]}
              />
            )}
          />
          {errors[field.name] ? (
            <HelperText type="error">
              {t(
                field.name === "slug"
                  ? "admin.slugHint"
                  : "errors.invalid_content",
              )}
            </HelperText>
          ) : null}
        </View>
      ))}
      {error ? <ErrorText message={error} /> : null}
      {saved ? <Text variant="bodySmall">{t("admin.saved")}</Text> : null}
      {!locked ? (
        <PrimaryButton
          label={t("admin.saveDraft")}
          loading={upsert.isPending}
          onPress={onSave}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  form: {
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sourceLabel: {
    fontSize: 14,
  },
});

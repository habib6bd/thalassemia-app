import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Checkbox,
  HelperText,
  Text,
  TextInput,
} from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { useAdminSources, useUpsertSource } from "@/features/learn/api";
import { sourceSchema, type SourceFormInput } from "@/features/learn/schema";
import { mapSupabaseError } from "@/lib/errors";

type Source = {
  id: string;
  title: string;
  organization: string | null;
  url: string;
  accessed_at: string | null;
};

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function AdminSourcesScreen() {
  return (
    <AdminGate>
      <AdminSources />
    </AdminGate>
  );
}

function AdminSources() {
  const { t } = useTranslation();
  const sourcesQuery = useAdminSources(true);
  const [editing, setEditing] = useState<Source | "new" | null>(null);

  if (sourcesQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="bodyMedium">{t("admin.sourcesPageHint")}</Text>
        {editing ? (
          <SourceForm
            key={editing === "new" ? "new" : editing.id}
            source={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : (
          <PrimaryButton
            label={t("admin.addSource")}
            icon="plus"
            onPress={() => setEditing("new")}
          />
        )}
        {(sourcesQuery.data ?? []).map((source) => (
          <Card key={source.id}>
            <Card.Content style={styles.form}>
              <Text variant="titleMedium">{source.title}</Text>
              {source.organization ? (
                <Text variant="bodySmall">{source.organization}</Text>
              ) : null}
              <Text variant="bodySmall">
                {source.accessed_at
                  ? t("learn.sourceChecked", {
                      date: new Date(source.accessed_at).toLocaleDateString(),
                    })
                  : t("admin.sourceUnchecked")}
              </Text>
              <View style={styles.row}>
                <Button
                  icon="open-in-new"
                  onPress={() => void Linking.openURL(source.url)}
                >
                  {t("admin.openSource")}
                </Button>
                <Button icon="pencil" onPress={() => setEditing(source)}>
                  {t("admin.editSource")}
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function SourceForm({
  source,
  onDone,
}: {
  source: Source | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertSource();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SourceFormInput>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      title: source?.title ?? "",
      organization: source?.organization ?? "",
      url: source?.url ?? "",
      checked: !!source?.accessed_at,
    },
  });

  const onSave = handleSubmit((values) => {
    setError(null);
    upsert.mutate(
      {
        sourceId: source?.id ?? null,
        title: values.title,
        url: values.url,
        organization: values.organization,
        // Keep an earlier check date; a new check is dated today.
        accessedAt: values.checked ? (source?.accessed_at ?? todayIso()) : null,
      },
      {
        onSuccess: onDone,
        onError: (err) => setError(mapSupabaseError(err)),
      },
    );
  });

  return (
    <Card>
      <Card.Content style={styles.form}>
        {(["title", "organization", "url"] as const).map((name) => (
          <View key={name}>
            <Controller
              control={control}
              name={name}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t(`admin.sourceFields.${name}`)}
                  value={value ?? ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize={name === "url" ? "none" : undefined}
                  keyboardType={name === "url" ? "url" : undefined}
                  mode="outlined"
                  error={!!errors[name]}
                />
              )}
            />
            {errors[name] ? (
              <HelperText type="error">{t("errors.invalid_source")}</HelperText>
            ) : null}
          </View>
        ))}
        <Controller
          control={control}
          name="checked"
          render={({ field: { onChange, value } }) => (
            <Checkbox.Item
              label={t("admin.sourceCheckedToday")}
              status={value ? "checked" : "unchecked"}
              onPress={() => onChange(!value)}
            />
          )}
        />
        {error ? <ErrorText message={error} /> : null}
        <View style={styles.row}>
          <PrimaryButton
            label={t("common.save")}
            loading={upsert.isPending}
            onPress={onSave}
          />
          <PrimaryButton
            label={t("common.cancel")}
            mode="outlined"
            onPress={onDone}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  form: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

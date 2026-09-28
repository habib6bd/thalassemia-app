import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAppSettings, useUpdateSetting } from "@/features/admin/api";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { mapSupabaseError } from "@/lib/errors";

export default function AdminSettingsScreen() {
  return (
    <AdminGate>
      <AdminSettings />
    </AdminGate>
  );
}

function AdminSettings() {
  const { t } = useTranslation();
  const settingsQuery = useAppSettings(true);
  const updateSetting = useUpdateSetting();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  if (settingsQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const save = (key: string) => {
    const raw = (drafts[key] ?? "").trim();
    const value = Number(raw);
    setSaved(null);
    if (!/^\d+$/.test(raw) || value < 1 || value > 10000) {
      setErrors((prev) => ({
        ...prev,
        [key]: t("errors.invalid_setting_value"),
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, [key]: "" }));
    updateSetting.mutate(
      { key, value },
      {
        onSuccess: () => {
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setSaved(key);
        },
        onError: (err) =>
          setErrors((prev) => ({ ...prev, [key]: mapSupabaseError(err) })),
      },
    );
  };

  return (
    <Screen>
      <FlatList
        data={settingsQuery.data ?? []}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <Text variant="bodyMedium" style={styles.intro}>
            {t("admin.settingsHint")}
          </Text>
        }
        renderItem={({ item }) => {
          const current = String(item.value);
          const draft = drafts[item.key];
          return (
            <Card style={styles.card}>
              <Card.Content style={styles.content}>
                <Text variant="titleSmall">{item.key}</Text>
                {item.description ? (
                  <Text variant="bodySmall">{item.description}</Text>
                ) : null}
                <View style={styles.row}>
                  <TextField
                    style={styles.input}
                    mode="outlined"
                    dense
                    keyboardType="number-pad"
                    label={t("admin.settingValue")}
                    value={draft ?? current}
                    onChangeText={(text) =>
                      setDrafts((prev) => ({ ...prev, [item.key]: text }))
                    }
                  />
                  <Button
                    mode="contained-tonal"
                    disabled={draft === undefined || draft === current}
                    loading={
                      updateSetting.isPending &&
                      updateSetting.variables?.key === item.key
                    }
                    contentStyle={styles.button}
                    onPress={() => save(item.key)}
                  >
                    {t("common.save")}
                  </Button>
                </View>
                {errors[item.key] ? (
                  <ErrorText message={errors[item.key]} />
                ) : null}
                {saved === item.key ? (
                  <Text variant="bodySmall">{t("admin.settingSaved")}</Text>
                ) : null}
              </Card.Content>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: 8,
  },
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
  },
  button: {
    minHeight: 48,
  },
});

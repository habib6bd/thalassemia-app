import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  RadioButton,
  Text,
} from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { TextField } from "@/components/TextField";
import { useReportCommunityContent } from "@/features/community/api";
import {
  reportReasons,
  reportSchema,
  type CommunityTargetType,
  type ReportInput,
} from "@/features/community/schema";
import { mapSupabaseError } from "@/lib/errors";

type ReportDialogProps = {
  target: { type: CommunityTargetType; id: string } | null;
  onDismiss: () => void;
  onReported: () => void;
};

export function ReportDialog({
  target,
  onDismiss,
  onReported,
}: ReportDialogProps) {
  const { t } = useTranslation();
  const report = useReportCommunityContent();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: "selling_blood", details: "" },
  });

  const close = () => {
    setError(null);
    reset();
    onDismiss();
  };

  const onSubmit = handleSubmit((values) => {
    if (!target) return;
    setError(null);
    report.mutate(
      { ...values, targetType: target.type, targetId: target.id },
      {
        onSuccess: () => {
          reset();
          onReported();
        },
        onError: (err) => setError(mapSupabaseError(err)),
      },
    );
  });

  return (
    <Portal>
      <Dialog visible={!!target} onDismiss={close}>
        <Dialog.Title>{t("community.reportTitle")}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.content}>
            <Text variant="bodyMedium">{t("community.reportIntro")}</Text>
            <Controller
              control={control}
              name="reason"
              render={({ field: { onChange, value } }) => (
                <RadioButton.Group onValueChange={onChange} value={value}>
                  {reportReasons.map((reason) => (
                    <RadioButton.Item
                      key={reason}
                      value={reason}
                      label={t(`community.reasons.${reason}`)}
                      labelStyle={
                        reason === "selling_blood"
                          ? styles.prominent
                          : undefined
                      }
                    />
                  ))}
                </RadioButton.Group>
              )}
            />
            <Controller
              control={control}
              name="details"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label={t("community.reportDetails")}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  maxLength={500}
                  mode="outlined"
                  error={!!errors.details}
                />
              )}
            />
            {errors.details ? (
              <HelperText type="error">{t("errors.invalid_report")}</HelperText>
            ) : null}
            {error ? <ErrorText message={error} /> : null}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={close} disabled={report.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onPress={onSubmit} loading={report.isPending}>
            {t("community.submitReport")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingVertical: 8,
  },
  prominent: {
    fontWeight: "bold",
  },
});

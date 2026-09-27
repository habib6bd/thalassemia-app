import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Card, Switch, Text, TextInput } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useMyPatients } from "@/features/patients/api";
import { useCreateAndPublishBloodRequest } from "@/features/requests/api";
import {
  bloodRequestSchema,
  type BloodRequestInput,
} from "@/features/requests/schema";
import { bloodGroupLabels } from "@/lib/bloodGroups";
import { mapSupabaseError } from "@/lib/errors";

const STEPS = ["patient", "details", "review"] as const;
type Step = (typeof STEPS)[number];

export default function NewRequestScreen() {
  const { t } = useTranslation();
  const patientsQuery = useMyPatients();
  const createAndPublish = useCreateAndPublishBloodRequest();
  const [step, setStep] = useState<Step>("patient");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<BloodRequestInput>({
    resolver: zodResolver(bloodRequestSchema),
    defaultValues: {
      patientId: "",
      requiredAt: "",
      treatingCentre: "",
      districtId: undefined as unknown as number,
      area: "",
      unitsNeeded: 1,
      component: "",
      isEmergency: false,
      notes: "",
    },
  });

  const patientId = watch("patientId");
  const selectedPatient = patientsQuery.data?.find((p) => p.id === patientId);

  const selectPatient = (id: string) => {
    const patient = patientsQuery.data?.find((p) => p.id === id);
    setValue("patientId", id, { shouldValidate: true });
    if (patient) {
      setValue("districtId", patient.district_id);
      setValue("area", patient.area ?? "");
      setValue("treatingCentre", patient.treating_centre ?? "");
    }
  };

  const goToDetails = async () => {
    const valid = await trigger("patientId");
    if (valid) setStep("details");
  };

  const goToReview = async () => {
    if (date && time) {
      setValue("requiredAt", new Date(`${date}T${time}:00`).toISOString(), {
        shouldValidate: true,
      });
    }
    const valid = await trigger([
      "requiredAt",
      "treatingCentre",
      "districtId",
      "unitsNeeded",
    ]);
    if (valid) setStep("review");
  };

  const onPublish = handleSubmit((values) => {
    setSubmitError(null);
    createAndPublish.mutate(values, {
      onSuccess: (data) => {
        router.replace({
          pathname: "/(tabs)/requests/[id]",
          params: { id: data.id },
        });
      },
      onError: (error) => setSubmitError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="labelLarge">
          {t("requests.wizard.step", {
            current: STEPS.indexOf(step) + 1,
            total: 3,
          })}
        </Text>

        {step === "patient" ? (
          <View style={styles.stepContent}>
            <Text variant="titleMedium">
              {t("requests.wizard.choosePatient")}
            </Text>
            {(patientsQuery.data ?? []).map((patient) => (
              <Card
                key={patient.id}
                style={
                  patient.id === patientId ? styles.cardSelected : styles.card
                }
                onPress={() => selectPatient(patient.id)}
              >
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium">{patient.display_name}</Text>
                  <Text variant="bodySmall">
                    {bloodGroupLabels[patient.blood_group]}
                  </Text>
                </Card.Content>
              </Card>
            ))}
            <PrimaryButton
              label={t("common.next")}
              onPress={goToDetails}
              disabled={!patientId}
            />
          </View>
        ) : null}

        {step === "details" ? (
          <View style={styles.stepContent}>
            <Text variant="titleMedium">
              {t("requests.wizard.detailsTitle")}
            </Text>
            <Text variant="bodyMedium">
              {t("requests.wizard.forPatient", {
                name: selectedPatient?.display_name,
              })}
            </Text>

            <TextInput
              label={t("requests.dateLabel")}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
            />
            <TextInput
              label={t("requests.timeLabel")}
              placeholder="HH:MM"
              value={time}
              onChangeText={setTime}
            />
            {errors.requiredAt ? (
              <ErrorText message={t("requests.errors.dateRequired")} />
            ) : null}

            <Controller
              control={control}
              name="treatingCentre"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t("requests.treatingCentre")}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.treatingCentre}
                />
              )}
            />

            <Controller
              control={control}
              name="unitsNeeded"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t("requests.unitsNeeded")}
                  value={String(value)}
                  onChangeText={(v) =>
                    onChange(Number(v.replace(/[^0-9]/g, "")) || 0)
                  }
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  error={!!errors.unitsNeeded}
                />
              )}
            />

            <Controller
              control={control}
              name="component"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t("requests.componentOptional")}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
            <Text variant="bodySmall" style={styles.hint}>
              {t("requests.componentHint")}
            </Text>

            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t("requests.notesOptional")}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                />
              )}
            />

            <View style={styles.switchRow}>
              <Text variant="bodyMedium" style={styles.switchLabel}>
                {t("requests.isEmergency")}
              </Text>
              <Controller
                control={control}
                name="isEmergency"
                render={({ field: { value, onChange } }) => (
                  <Switch value={value} onValueChange={onChange} />
                )}
              />
            </View>

            <View style={styles.buttonRow}>
              <PrimaryButton
                label={t("common.back")}
                mode="outlined"
                onPress={() => setStep("patient")}
              />
              <PrimaryButton label={t("common.next")} onPress={goToReview} />
            </View>
          </View>
        ) : null}

        {step === "review" ? (
          <View style={styles.stepContent}>
            <Text variant="titleMedium">
              {t("requests.wizard.reviewTitle")}
            </Text>
            <Card>
              <Card.Content style={styles.reviewContent}>
                <ReviewRow
                  label={t("patients.displayName")}
                  value={selectedPatient?.display_name}
                />
                <ReviewRow
                  label={t("donorProfile.bloodGroup")}
                  value={
                    selectedPatient
                      ? bloodGroupLabels[selectedPatient.blood_group]
                      : undefined
                  }
                />
                <ReviewRow label={t("requests.dateLabel")} value={date} />
                <ReviewRow label={t("requests.timeLabel")} value={time} />
                <ReviewRow
                  label={t("requests.treatingCentre")}
                  value={watch("treatingCentre")}
                />
                <ReviewRow
                  label={t("requests.unitsNeeded")}
                  value={String(watch("unitsNeeded"))}
                />
                {watch("component") ? (
                  <ReviewRow
                    label={t("requests.componentOptional")}
                    value={watch("component")}
                  />
                ) : null}
                {watch("isEmergency") ? (
                  <ReviewRow
                    label={t("requests.isEmergency")}
                    value={t("common.yes")}
                  />
                ) : null}
              </Card.Content>
            </Card>

            <Disclaimer textKey="requests.wizard.disclaimer" />

            {submitError ? <ErrorText message={submitError} /> : null}

            <View style={styles.buttonRow}>
              <PrimaryButton
                label={t("common.back")}
                mode="outlined"
                onPress={() => setStep("details")}
              />
              <PrimaryButton
                label={t("requests.publish")}
                onPress={onPublish}
                loading={createAndPublish.isPending}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <View style={styles.reviewRow}>
      <Text variant="bodyMedium" style={styles.reviewLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  stepContent: {
    gap: 12,
  },
  card: {
    marginBottom: 4,
  },
  cardSelected: {
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#B3261E",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  hint: {
    opacity: 0.7,
    marginTop: -8,
  },
  reviewContent: {
    gap: 8,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewLabel: {
    opacity: 0.7,
  },
});

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Chip, Switch, Text } from "react-native-paper";

import { DistrictPicker } from "@/components/DistrictPicker";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { patientSchema, type PatientInput } from "@/features/patients/schema";
import { bloodGroupLabels, bloodGroups } from "@/lib/bloodGroups";

type PatientFormProps = {
  defaultValues: PatientInput;
  onSubmit: (values: PatientInput) => void;
  submitting: boolean;
  submitError: string | null;
  submitLabel: string;
  showAsSelfToggle: boolean;
};

export function PatientForm({
  defaultValues,
  onSubmit,
  submitting,
  submitError,
  submitLabel,
  showAsSelfToggle,
}: PatientFormProps) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
    defaultValues,
  });

  const bloodGroup = watch("bloodGroup");

  const submit = handleSubmit(onSubmit);

  return (
    <View style={styles.form}>
      {showAsSelfToggle ? (
        <View style={styles.consentRow}>
          <Text variant="bodyMedium" style={styles.consentText}>
            {t("patients.thisIsMe")}
          </Text>
          <Controller
            control={control}
            name="asSelf"
            render={({ field: { value, onChange } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>
      ) : null}

      <Controller
        control={control}
        name="displayName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t("patients.displayName")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.displayName}
          />
        )}
      />

      <View>
        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t("patients.bloodGroup")}
        </Text>
        <View style={styles.chipRow}>
          {bloodGroups.map((group) => (
            <Chip
              key={group}
              selected={bloodGroup === group}
              onPress={() =>
                setValue("bloodGroup", group, { shouldValidate: true })
              }
              mode={bloodGroup === group ? "flat" : "outlined"}
            >
              {bloodGroupLabels[group]}
            </Chip>
          ))}
        </View>
      </View>

      <Controller
        control={control}
        name="districtId"
        render={({ field: { value, onChange } }) => (
          <DistrictPicker
            value={value ?? null}
            onChange={onChange}
            label={t("patients.district")}
            error={!!errors.districtId}
          />
        )}
      />

      <Controller
        control={control}
        name="area"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t("patients.areaOptional")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="treatingCentre"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t("patients.treatingCentreOptional")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="nextTransfusionDate"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t("patients.nextTransfusionDateOptional")}
            placeholder="YYYY-MM-DD"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="thalassemiaType"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t("patients.thalassemiaTypeOptional")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />
      <Text variant="bodySmall" style={styles.hint}>
        {t("patients.thalassemiaTypeHint")}
      </Text>

      <Text variant="titleSmall" style={styles.visibilityHeading}>
        {t("patients.visibilityHeading")}
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        {t("patients.visibilityHint")}
      </Text>

      <VisibilityToggle
        name="showArea"
        control={control}
        label={t("patients.showArea")}
      />
      <VisibilityToggle
        name="showTreatingCentre"
        control={control}
        label={t("patients.showTreatingCentre")}
      />
      <VisibilityToggle
        name="showNextTransfusion"
        control={control}
        label={t("patients.showNextTransfusion")}
      />
      <VisibilityToggle
        name="showThalassemiaType"
        control={control}
        label={t("patients.showThalassemiaType")}
      />

      {submitError ? <ErrorText message={submitError} /> : null}

      <PrimaryButton
        label={submitLabel}
        onPress={submit}
        loading={submitting}
      />
    </View>
  );
}

function VisibilityToggle({
  name,
  control,
  label,
}: {
  name:
    | "showArea"
    | "showTreatingCentre"
    | "showNextTransfusion"
    | "showThalassemiaType";
  control: ReturnType<typeof useForm<PatientInput>>["control"];
  label: string;
}) {
  return (
    <View style={styles.consentRow}>
      <Text variant="bodyMedium" style={styles.consentText}>
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <Switch value={value} onValueChange={onChange} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  consentText: {
    flex: 1,
  },
  hint: {
    opacity: 0.7,
    marginTop: -8,
  },
  visibilityHeading: {
    marginTop: 8,
  },
});

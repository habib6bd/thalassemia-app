import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Chip, SegmentedButtons, Switch, Text } from "react-native-paper";

import { DistrictPicker } from "@/components/DistrictPicker";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useCompleteOnboarding } from "@/features/onboarding/api";
import {
  onboardingSchema,
  selfServiceRoles,
  type OnboardingInput,
} from "@/features/onboarding/schema";
import { mapSupabaseError } from "@/lib/errors";
import type { SupportedLanguage } from "@/lib/i18n";
import { useAppStore } from "@/stores/useAppStore";

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const appLanguage = useAppStore((state) => state.language);
  const completeOnboarding = useCompleteOnboarding();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      roles: [],
      displayName: "",
      phone: "",
      districtId: undefined as unknown as number,
      area: "",
      language: appLanguage,
      shareContactOnAccept: false,
    },
  });

  const roles = watch("roles");

  const toggleRole = (role: (typeof selfServiceRoles)[number]) => {
    if (roles.includes(role)) {
      setValue(
        "roles",
        roles.filter((r) => r !== role),
        { shouldValidate: true },
      );
    } else {
      setValue("roles", [...roles, role], { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    completeOnboarding.mutate(values, {
      onSuccess: () => router.replace("/(tabs)"),
      onError: (error) => setSubmitError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text variant="headlineSmall">{t("onboarding.title")}</Text>

        <View>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t("onboarding.rolesLabel")}
          </Text>
          <View style={styles.chipRow}>
            {selfServiceRoles.map((role) => (
              <Chip
                key={role}
                selected={roles.includes(role)}
                onPress={() => toggleRole(role)}
                mode={roles.includes(role) ? "flat" : "outlined"}
              >
                {t(`roles.${role}`)}
              </Chip>
            ))}
          </View>
          {errors.roles ? (
            <ErrorText message={t("onboarding.errors.rolesRequired")} />
          ) : null}
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label={t("onboarding.displayName")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.displayName}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label={t("onboarding.phoneOptional")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              placeholder="+8801XXXXXXXXX"
              error={!!errors.phone}
            />
          )}
        />
        {errors.phone ? (
          <ErrorText message={t("onboarding.errors.invalidPhone")} />
        ) : null}

        <Controller
          control={control}
          name="districtId"
          render={({ field: { value, onChange } }) => (
            <DistrictPicker
              value={value ?? null}
              onChange={onChange}
              label={t("onboarding.district")}
              error={!!errors.districtId}
            />
          )}
        />

        <Controller
          control={control}
          name="area"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label={t("onboarding.areaOptional")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        <View>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t("language.label")}
          </Text>
          <Controller
            control={control}
            name="language"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={(v) => onChange(v as SupportedLanguage)}
                buttons={[
                  { value: "bn", label: t("language.bn") },
                  { value: "en", label: t("language.en") },
                ]}
              />
            )}
          />
        </View>

        <View style={styles.consentRow}>
          <View style={styles.consentText}>
            <Text variant="bodyMedium">
              {t("onboarding.shareContactLabel")}
            </Text>
            <Text variant="bodySmall" style={styles.consentHint}>
              {t("onboarding.shareContactHint")}
            </Text>
          </View>
          <Controller
            control={control}
            name="shareContactOnAccept"
            render={({ field: { value, onChange } }) => (
              <Switch value={value} onValueChange={onChange} />
            )}
          />
        </View>

        {submitError ? <ErrorText message={submitError} /> : null}

        <PrimaryButton
          label={t("common.continue")}
          onPress={onSubmit}
          loading={completeOnboarding.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
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
    gap: 12,
  },
  consentText: {
    flex: 1,
  },
  consentHint: {
    opacity: 0.7,
    marginTop: 4,
  },
});

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Chip, Switch, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useDonorProfile, useUpsertDonorProfile } from "@/features/donors/api";
import { DonorExtrasCard } from "@/features/donors/components/DonorExtrasCard";
import {
  donorAvailabilities,
  donorProfileSchema,
  type DonorProfileInput,
} from "@/features/donors/schema";
import { mapSupabaseError } from "@/lib/errors";
import { bloodGroupLabels, bloodGroups } from "@/lib/bloodGroups";
import { useAppStore } from "@/stores/useAppStore";

export default function DonorProfileScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const donorProfileQuery = useDonorProfile(session?.user.id);
  const upsertDonorProfile = useUpsertDonorProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DonorProfileInput>({
    resolver: zodResolver(donorProfileSchema),
    defaultValues: {
      bloodGroup: "O_POS",
      availability: "available",
      availableFrom: "",
      emergencyAvailable: false,
      searchable: false,
    },
  });

  useEffect(() => {
    const profile = donorProfileQuery.data;
    if (profile) {
      reset({
        bloodGroup: profile.blood_group,
        availability: profile.availability,
        availableFrom: profile.available_from ?? "",
        emergencyAvailable: profile.emergency_available,
        searchable: profile.searchable,
      });
    }
  }, [donorProfileQuery.data, reset]);

  const bloodGroup = watch("bloodGroup");
  const availability = watch("availability");

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    upsertDonorProfile.mutate(values, {
      onError: (error) => setSubmitError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text variant="headlineSmall">{t("donorProfile.title")}</Text>
        <Disclaimer textKey="donorProfile.eligibilityDisclaimer" />

        <View>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t("donorProfile.bloodGroup")}
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

        <View>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t("donorProfile.availability")}
          </Text>
          <View style={styles.chipRow}>
            {donorAvailabilities.map((option) => (
              <Chip
                key={option}
                selected={availability === option}
                onPress={() =>
                  setValue("availability", option, { shouldValidate: true })
                }
                mode={availability === option ? "flat" : "outlined"}
              >
                {t(`donorProfile.availabilityOptions.${option}`)}
              </Chip>
            ))}
          </View>
        </View>

        <View>
          <View style={styles.consentRow}>
            <Text variant="bodyMedium" style={styles.consentText}>
              {t("donorProfile.emergencyAvailable")}
            </Text>
            <Controller
              control={control}
              name="emergencyAvailable"
              render={({ field: { value, onChange } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  accessibilityLabel={t("donorProfile.emergencyAvailable")}
                />
              )}
            />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            {t("donorProfile.emergencyAvailableHint")}
          </Text>
        </View>

        <View>
          <View style={styles.consentRow}>
            <Text variant="bodyMedium" style={styles.consentText}>
              {t("donorProfile.searchable")}
            </Text>
            <Controller
              control={control}
              name="searchable"
              render={({ field: { value, onChange } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  accessibilityLabel={t("donorProfile.searchable")}
                />
              )}
            />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            {t("donorProfile.searchableHint")}
          </Text>
        </View>

        {donorProfileQuery.data?.last_donation_date ? (
          <Text variant="bodySmall" style={styles.lastDonation}>
            {t("donorProfile.lastDonation", {
              date: donorProfileQuery.data.last_donation_date,
            })}
          </Text>
        ) : null}

        {errors.bloodGroup ? (
          <ErrorText message={t("donorProfile.errors.bloodGroupRequired")} />
        ) : null}
        {submitError ? <ErrorText message={submitError} /> : null}

        <PrimaryButton
          label={t("common.save")}
          onPress={onSubmit}
          loading={upsertDonorProfile.isPending}
        />

        {session && donorProfileQuery.data ? (
          <DonorExtrasCard
            userId={session.user.id}
            remindersEnabled={donorProfileQuery.data.availability_reminders}
          />
        ) : null}
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
    justifyContent: "space-between",
  },
  consentText: {
    flex: 1,
  },
  lastDonation: {
    opacity: 0.7,
  },
  hint: {
    opacity: 0.7,
    marginTop: 4,
  },
});

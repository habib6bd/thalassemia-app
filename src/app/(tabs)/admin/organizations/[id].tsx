import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  HelperText,
  RadioButton,
  Text,
  TextInput,
} from "react-native-paper";

import { DistrictPicker } from "@/components/DistrictPicker";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AdminGate } from "@/features/admin/components/AdminGate";
import {
  useAdminOrganizations,
  useSetOrganizationVerification,
  useUpsertOrganization,
} from "@/features/organizations/api";
import {
  organizationSchema,
  organizationTypes,
  verificationMethods,
  verificationSchema,
  type OrganizationInput,
  type VerificationInput,
} from "@/features/organizations/schema";
import { mapSupabaseError } from "@/lib/errors";

type TextField = Exclude<keyof OrganizationInput, "type" | "districtId">;

const textFields: {
  name: TextField;
  max: number;
  multiline?: boolean;
  keyboard?: "phone-pad" | "url" | "decimal-pad";
}[] = [
  { name: "name", max: 200 },
  { name: "nameBn", max: 200 },
  { name: "address", max: 300, multiline: true },
  { name: "phone", max: 16, keyboard: "phone-pad" },
  { name: "website", max: 300, keyboard: "url" },
  { name: "services", max: 1000, multiline: true },
  { name: "openingHours", max: 300 },
  { name: "latitude", max: 12, keyboard: "decimal-pad" },
  { name: "longitude", max: 12, keyboard: "decimal-pad" },
];

export default function AdminOrganizationScreen() {
  return (
    <AdminGate>
      <AdminOrganization />
    </AdminGate>
  );
}

function AdminOrganization() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const organizationsQuery = useAdminOrganizations(true);
  const organization = organizationsQuery.data?.find((o) => o.id === id);

  if (!isNew && organizationsQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!isNew && !organization) {
    return (
      <Screen>
        <ErrorText message={t("errors.not_found")} />
      </Screen>
    );
  }

  const defaultValues: OrganizationInput = {
    name: organization?.name ?? "",
    nameBn: organization?.name_bn ?? "",
    type: organization?.type ?? "treatment_centre",
    districtId: organization?.district_id ?? 0,
    address: organization?.address ?? "",
    latitude:
      organization?.latitude != null ? String(organization.latitude) : "",
    longitude:
      organization?.longitude != null ? String(organization.longitude) : "",
    phone: organization?.phone ?? "",
    website: organization?.website ?? "",
    services: organization?.services ?? "",
    openingHours: organization?.opening_hours ?? "",
  };

  return (
    <Screen scroll>
      <View style={styles.content}>
        {organization ? (
          <VerificationCard
            organizationId={organization.id}
            status={organization.verification_status}
            lastVerifiedAt={organization.last_verified_at}
            method={organization.verification_method}
            note={organization.verification_note}
          />
        ) : (
          <Text variant="bodyMedium">{t("admin.newOrganizationHint")}</Text>
        )}
        <OrganizationForm
          organizationId={organization?.id ?? null}
          defaultValues={defaultValues}
        />
      </View>
    </Screen>
  );
}

function OrganizationForm({
  organizationId,
  defaultValues,
}: {
  organizationId: string | null;
  defaultValues: OrganizationInput;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertOrganization();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues,
  });

  const onSave = handleSubmit((values) => {
    setError(null);
    setSaved(false);
    upsert.mutate(
      { ...values, organizationId },
      {
        onSuccess: (row) => {
          if (!organizationId) {
            router.replace({
              pathname: "/(tabs)/admin/organizations/[id]",
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
      <Text variant="labelLarge">{t("admin.orgFields.type")}</Text>
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chipRow}>
            {organizationTypes.map((type) => (
              <Chip
                key={type}
                selected={value === type}
                showSelectedCheck
                onPress={() => onChange(type)}
              >
                {t(`directory.types.${type}`)}
              </Chip>
            ))}
          </View>
        )}
      />
      <Controller
        control={control}
        name="districtId"
        render={({ field: { onChange, value } }) => (
          <DistrictPicker
            label={t("admin.orgFields.district")}
            value={value || null}
            onChange={onChange}
            error={!!errors.districtId}
          />
        )}
      />
      {textFields.map((field) => (
        <View key={field.name}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t(`admin.orgFields.${field.name}`)}
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={field.max}
                multiline={field.multiline}
                keyboardType={field.keyboard}
                autoCapitalize={field.keyboard === "url" ? "none" : undefined}
                mode="outlined"
                error={!!errors[field.name]}
              />
            )}
          />
          {errors[field.name] ? (
            <HelperText type="error">
              {t(`admin.orgFieldErrors.${field.name}`)}
            </HelperText>
          ) : null}
        </View>
      ))}
      {error ? <ErrorText message={error} /> : null}
      {saved ? <Text variant="bodySmall">{t("admin.saved")}</Text> : null}
      <PrimaryButton
        label={t("common.save")}
        loading={upsert.isPending}
        onPress={onSave}
      />
    </View>
  );
}

function VerificationCard({
  organizationId,
  status,
  lastVerifiedAt,
  method,
  note,
}: {
  organizationId: string;
  status: string;
  lastVerifiedAt: string | null;
  method: string | null;
  note: string | null;
}) {
  const { t } = useTranslation();
  const setVerification = useSetOrganizationVerification();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VerificationInput>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { status: "verified", method: "phone_call", note: "" },
  });
  const nextStatus = useWatch({ control, name: "status" });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setVerification.mutate(
      { ...values, organizationId },
      {
        onSuccess: () =>
          reset({ status: "verified", method: "phone_call", note: "" }),
        onError: (err) => setError(mapSupabaseError(err)),
      },
    );
  });

  return (
    <Card>
      <Card.Content style={styles.form}>
        <Text variant="titleMedium">{t("admin.verificationTitle")}</Text>
        <Text variant="bodyMedium">
          {t("admin.currentStatus", {
            status: t(`admin.verificationStatus.${status}`),
          })}
        </Text>
        {lastVerifiedAt ? (
          <Text variant="bodySmall">
            {t("directory.lastVerified", {
              date: new Date(lastVerifiedAt).toLocaleDateString(),
            })}
            {method ? ` · ${t(`admin.verificationMethod.${method}`)}` : ""}
          </Text>
        ) : null}
        {note ? <Text variant="bodySmall">“{note}”</Text> : null}
        <Text variant="bodySmall">{t("admin.verificationHint")}</Text>

        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <RadioButton.Group onValueChange={onChange} value={value}>
              {(["verified", "pending", "rejected"] as const).map((item) => (
                <RadioButton.Item
                  key={item}
                  value={item}
                  label={t(`admin.setStatus.${item}`)}
                />
              ))}
            </RadioButton.Group>
          )}
        />
        {nextStatus === "verified" ? (
          <>
            <Text variant="labelLarge">{t("admin.methodLabel")}</Text>
            <Controller
              control={control}
              name="method"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {verificationMethods.map((item) => (
                    <Chip
                      key={item}
                      selected={value === item}
                      showSelectedCheck
                      onPress={() => onChange(item)}
                    >
                      {t(`admin.verificationMethod.${item}`)}
                    </Chip>
                  ))}
                </View>
              )}
            />
            {errors.method ? (
              <HelperText type="error">
                {t("errors.verification_method_required")}
              </HelperText>
            ) : null}
          </>
        ) : null}
        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={t("admin.verificationNote")}
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={500}
              multiline
              mode="outlined"
            />
          )}
        />
        {error ? <ErrorText message={error} /> : null}
        <PrimaryButton
          label={t("admin.recordVerification")}
          icon="check-decagram"
          loading={setVerification.isPending}
          onPress={onSubmit}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  form: {
    gap: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

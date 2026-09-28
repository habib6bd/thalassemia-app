import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { HelperText, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAcceptGuardianInvite } from "@/features/guardians/api";
import {
  inviteCodeSchema,
  type InviteCodeInput,
} from "@/features/network/schema";
import { mapSupabaseError } from "@/lib/errors";

// Guardian codes use the same 8-character alphabet as patient invite codes.
export default function JoinAsGuardianScreen() {
  const { t } = useTranslation();
  const acceptInvite = useAcceptGuardianInvite();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteCodeInput>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { inviteCode: "" },
  });

  const onJoin = handleSubmit((values) => {
    setError(null);
    acceptInvite.mutate(values.inviteCode, {
      onSuccess: (patientId) =>
        router.replace({
          pathname: "/(tabs)/patients/[id]",
          params: { id: patientId },
        }),
      onError: (err) => setError(mapSupabaseError(err)),
    });
  });

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="bodyMedium">{t("guardians.joinHint")}</Text>
        <Controller
          control={control}
          name="inviteCode"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label={t("guardians.codeLabel")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              mode="outlined"
              error={!!errors.inviteCode}
            />
          )}
        />
        {errors.inviteCode ? (
          <HelperText type="error">{t("guardians.joinHint")}</HelperText>
        ) : null}
        {error ? <ErrorText message={error} /> : null}
        <PrimaryButton
          label={t("guardians.joinButton")}
          loading={acceptInvite.isPending}
          onPress={onJoin}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});

import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useForgotPassword } from "@/features/auth/api";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schema";
import { mapSupabaseError } from "@/lib/errors";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const forgotPassword = useForgotPassword();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    forgotPassword.mutate(values, {
      onSuccess: () => setSent(true),
      onError: (error) => setSubmitError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen>
      <View style={styles.form}>
        <Text variant="headlineSmall">{t("auth.forgotPassword")}</Text>
        <Text variant="bodyMedium">{t("auth.forgotPasswordBody")}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label={t("auth.email")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              error={!!errors.email}
            />
          )}
        />

        {sent ? (
          <Text variant="bodyMedium">{t("auth.resetLinkSent")}</Text>
        ) : null}
        {submitError ? <ErrorText message={submitError} /> : null}

        <PrimaryButton
          label={t("auth.sendResetLink")}
          onPress={onSubmit}
          loading={forgotPassword.isPending}
        />

        <Link href="/(auth)/sign-in">
          <Text variant="bodyMedium">{t("auth.backToSignIn")}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
});

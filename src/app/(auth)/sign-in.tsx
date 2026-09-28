import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useSignIn } from "@/features/auth/api";
import { signInSchema, type SignInInput } from "@/features/auth/schema";
import { mapSupabaseError } from "@/lib/errors";

export default function SignInScreen() {
  const { t } = useTranslation();
  const signIn = useSignIn();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    signIn.mutate(values, {
      onSuccess: () => router.replace("/"),
      onError: (error) => setSubmitError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text variant="headlineSmall">{t("auth.signIn")}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label={t("auth.email")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              error={!!errors.email}
            />
          )}
        />
        {errors.email ? (
          <ErrorText message={t("auth.errors.invalidEmail")} />
        ) : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label={t("auth.password")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              textContentType="password"
              error={!!errors.password}
            />
          )}
        />

        <Link href="/(auth)/forgot-password" style={styles.link}>
          <Text variant="bodyMedium">{t("auth.forgotPassword")}</Text>
        </Link>

        {submitError ? <ErrorText message={submitError} /> : null}

        <PrimaryButton
          label={t("auth.submit")}
          onPress={onSubmit}
          loading={signIn.isPending}
        />

        <Link href="/(auth)/sign-up" style={styles.link}>
          <Text variant="bodyMedium">{t("auth.noAccount")}</Text>
        </Link>

        <Disclaimer />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  link: {
    alignSelf: "flex-start",
  },
});

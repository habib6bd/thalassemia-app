import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { HelperText, Text, TextInput } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useSignUp } from "@/features/auth/api";
import { signUpSchema, type SignUpInput } from "@/features/auth/schema";
import { mapSupabaseError } from "@/lib/errors";

export default function SignUpScreen() {
  const { t } = useTranslation();
  const signUp = useSignUp();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    signUp.mutate(values, {
      onSuccess: () => router.replace("/(auth)/verify-email"),
      onError: (error) => setSubmitError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen scroll>
      <View style={styles.form}>
        <Text variant="headlineSmall">{t("auth.signUp")}</Text>

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
            <TextInput
              label={t("auth.password")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              textContentType="newPassword"
              error={!!errors.password}
            />
          )}
        />
        <HelperText type={errors.password ? "error" : "info"}>
          {t("auth.passwordHint")}
        </HelperText>

        {submitError ? <ErrorText message={submitError} /> : null}

        <PrimaryButton
          label={t("auth.submit")}
          onPress={onSubmit}
          loading={signUp.isPending}
        />

        <Link href="/(auth)/sign-in" style={styles.link}>
          <Text variant="bodyMedium">{t("auth.haveAccount")}</Text>
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

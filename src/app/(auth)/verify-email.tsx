import { Link } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useResendVerificationEmail } from "@/features/auth/api";
import { mapSupabaseError } from "@/lib/errors";

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const resend = useResendVerificationEmail();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onResend = () => {
    setError(null);
    setSent(false);
    resend.mutate(email, {
      onSuccess: () => setSent(true),
      onError: (err) => setError(mapSupabaseError(err)),
    });
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="headlineSmall">{t("auth.verifyEmail.title")}</Text>
        <Text variant="bodyLarge">{t("auth.verifyEmail.body")}</Text>

        <TextField
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {sent ? (
          <Text variant="bodyMedium">{t("auth.verifyEmail.resent")}</Text>
        ) : null}
        {error ? <ErrorText message={error} /> : null}

        <PrimaryButton
          label={t("auth.verifyEmail.resend")}
          onPress={onResend}
          loading={resend.isPending}
          mode="outlined"
        />

        <Link href="/(auth)/sign-in">
          <Text variant="bodyMedium">{t("auth.backToSignIn")}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
});

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Screen>
      <View style={styles.form}>
        <Text variant="headlineSmall">{t("auth.signIn")}</Text>
        <TextInput
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />
        {/* Wired up to Supabase Auth in Phase 1a. */}
        <PrimaryButton label={t("auth.submit")} onPress={() => {}} disabled />
        <Disclaimer />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
});

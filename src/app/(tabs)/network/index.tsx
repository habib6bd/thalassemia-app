import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  useConnections,
  useMaxConnectedDonors,
  useRequestConnectionByCode,
} from "@/features/network/api";
import { ConnectionCard } from "@/features/network/components/ConnectionCard";
import {
  inviteCodeSchema,
  type InviteCodeInput,
} from "@/features/network/schema";
import { useMyRoles } from "@/features/profile/api";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

export default function NetworkScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const rolesQuery = useMyRoles(session?.user.id);
  const connectionsQuery = useConnections();
  const maxConnectedDonorsQuery = useMaxConnectedDonors();
  const requestConnection = useRequestConnectionByCode();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const isDonor = (rolesQuery.data ?? []).includes("donor");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteCodeInput>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { inviteCode: "" },
  });

  const onJoin = handleSubmit((values) => {
    setJoinError(null);
    setJoined(false);
    requestConnection.mutate(values.inviteCode, {
      onSuccess: () => {
        setJoined(true);
        reset();
      },
      onError: (error) => setJoinError(mapSupabaseError(error)),
    });
  });

  return (
    <Screen>
      <View style={styles.content}>
        {isDonor ? (
          <View style={styles.joinForm}>
            <Text variant="labelLarge">{t("network.enterCode")}</Text>
            <Controller
              control={control}
              name="inviteCode"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="characters"
                  maxLength={8}
                  placeholder="ABCD1234"
                  error={!!errors.inviteCode}
                />
              )}
            />
            {errors.inviteCode ? (
              <ErrorText message={t("network.invalidCode")} />
            ) : null}
            {joinError ? <ErrorText message={joinError} /> : null}
            {joined ? (
              <Text variant="bodyMedium">{t("network.requestSent")}</Text>
            ) : null}
            <PrimaryButton
              label={t("network.join")}
              onPress={onJoin}
              loading={requestConnection.isPending}
            />
          </View>
        ) : null}

        {!isDonor &&
        (rolesQuery.data ?? []).some(
          (r) => r === "guardian" || r === "patient",
        ) ? (
          <Text variant="bodySmall" style={styles.limitHint}>
            {t("network.limitHint", { max: maxConnectedDonorsQuery.data ?? 6 })}
          </Text>
        ) : null}

        {connectionsQuery.data?.length === 0 ? (
          <EmptyState
            title={t("network.emptyTitle")}
            description={t("network.emptyDescription")}
          />
        ) : (
          <FlatList
            data={connectionsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConnectionCard
                connection={item}
                currentUserId={session?.user.id ?? ""}
              />
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
  },
  joinForm: {
    gap: 8,
  },
  limitHint: {
    opacity: 0.7,
  },
});

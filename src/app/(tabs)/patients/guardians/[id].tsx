import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  List,
  Text,
} from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import {
  useCreateGuardianInvite,
  usePatientManagers,
  usePendingGuardianInvites,
  useRemovePatientManager,
  useRevokeGuardianInvite,
} from "@/features/guardians/api";
import { usePatient } from "@/features/patients/api";
import { mapSupabaseError } from "@/lib/errors";

type Pending = { userId: string; name: string; isMe: boolean };

export default function GuardiansScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientQuery = usePatient(id);
  const managersQuery = usePatientManagers(id);
  const invitesQuery = usePendingGuardianInvites(id);
  const createInvite = useCreateGuardianInvite(id);
  const revokeInvite = useRevokeGuardianInvite(id);
  const removeManager = useRemovePatientManager(id);
  const [pendingRemoval, setPendingRemoval] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (managersQuery.isPending || patientQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const managers = managersQuery.data ?? [];
  const iAmPrimary = managers.some((m) => m.is_me && m.is_primary);
  const onError = (err: Error) => setError(mapSupabaseError(err));

  const shareCode = (code: string) => {
    void Share.share({
      message: t("guardians.shareMessage", {
        code,
        name: patientQuery.data?.display_name,
      }),
    });
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    setError(null);
    removeManager.mutate(pendingRemoval.userId, {
      onSuccess: () => {
        const left = pendingRemoval.isMe;
        setPendingRemoval(null);
        if (left) router.replace("/(tabs)/patients");
      },
      onError: (err) => {
        setPendingRemoval(null);
        onError(err);
      },
    });
  };

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="bodyMedium">{t("guardians.hint")}</Text>

        <Card>
          {managers.map((manager) => {
            const canRemove =
              !manager.is_me && iAmPrimary && manager.relation !== "self";
            return (
              <List.Item
                key={manager.user_id}
                title={manager.display_name}
                description={
                  manager.relation === "self"
                    ? t("guardians.patientSelf")
                    : t("roles.guardian")
                }
                right={() => (
                  <View style={styles.row}>
                    {manager.is_primary ? (
                      <StatusChip label={t("guardians.primary")} />
                    ) : null}
                    {manager.is_me ? (
                      <StatusChip label={t("guardians.you")} tone="positive" />
                    ) : null}
                    {manager.is_me || canRemove ? (
                      <Button
                        compact
                        onPress={() =>
                          setPendingRemoval({
                            userId: manager.user_id,
                            name: manager.display_name,
                            isMe: manager.is_me,
                          })
                        }
                      >
                        {manager.is_me
                          ? t("guardians.leave")
                          : t("guardians.remove")}
                      </Button>
                    ) : null}
                  </View>
                )}
              />
            );
          })}
        </Card>

        {error ? <ErrorText message={error} /> : null}

        <PrimaryButton
          label={t("guardians.invite")}
          icon="account-plus"
          loading={createInvite.isPending}
          onPress={() => {
            setError(null);
            createInvite.mutate(undefined, { onError });
          }}
        />

        {(invitesQuery.data ?? []).length > 0 ? (
          <View style={styles.invites}>
            <Text variant="labelLarge">{t("guardians.pendingInvites")}</Text>
            {(invitesQuery.data ?? []).map((invite) => (
              <Card key={invite.id}>
                <Card.Content style={styles.inviteContent}>
                  <Text variant="headlineSmall" style={styles.code}>
                    {invite.code}
                  </Text>
                  <Text variant="bodySmall">
                    {t("guardians.inviteHint", {
                      date: new Date(invite.expires_at).toLocaleString(),
                    })}
                  </Text>
                  <View style={styles.row}>
                    <Button
                      mode="outlined"
                      icon="share-variant"
                      onPress={() => shareCode(invite.code)}
                    >
                      {t("guardians.share")}
                    </Button>
                    <Button
                      onPress={() => {
                        setError(null);
                        revokeInvite.mutate(invite.id, { onError });
                      }}
                    >
                      {t("guardians.revoke")}
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : null}
      </View>

      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={
          pendingRemoval?.isMe
            ? t("guardians.leaveConfirmTitle")
            : t("guardians.removeConfirmTitle")
        }
        description={
          pendingRemoval?.isMe
            ? t("guardians.leaveConfirmBody")
            : t("guardians.removeConfirmBody", { name: pendingRemoval?.name })
        }
        confirmLabel={
          pendingRemoval?.isMe ? t("guardians.leave") : t("guardians.remove")
        }
        loading={removeManager.isPending}
        onConfirm={confirmRemoval}
        onDismiss={() => setPendingRemoval(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  invites: {
    gap: 8,
  },
  inviteContent: {
    gap: 8,
  },
  code: {
    letterSpacing: 4,
  },
});

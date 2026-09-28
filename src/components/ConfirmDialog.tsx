import { useTranslation } from "react-i18next";
import { Button, Dialog, Portal, Text } from "react-native-paper";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  loading?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  onConfirm,
  onDismiss,
  loading,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{description}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onPress={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

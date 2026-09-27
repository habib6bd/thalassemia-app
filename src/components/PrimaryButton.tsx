import { Button } from "react-native-paper";
import type { ComponentProps } from "react";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: ComponentProps<typeof Button>["mode"];
};

// 48dp minimum touch target (ARCHITECTURE.md §12) via contentStyle padding.
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  mode = "contained",
}: PrimaryButtonProps) {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      contentStyle={{ minHeight: 48 }}
      accessibilityLabel={label}
    >
      {label}
    </Button>
  );
}

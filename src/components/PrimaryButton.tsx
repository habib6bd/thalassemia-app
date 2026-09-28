import { Button } from "react-native-paper";
import type { ComponentProps } from "react";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: ComponentProps<typeof Button>["mode"];
  icon?: ComponentProps<typeof Button>["icon"];
};

// 48dp minimum touch target (ARCHITECTURE.md §12) via contentStyle padding.
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  mode = "contained",
  icon,
}: PrimaryButtonProps) {
  return (
    <Button
      mode={mode}
      icon={icon}
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

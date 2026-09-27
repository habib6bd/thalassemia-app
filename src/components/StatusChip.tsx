import { Chip, useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

export type StatusTone = "neutral" | "positive" | "warning" | "negative";

type StatusChipProps = {
  label: string;
  tone?: StatusTone;
  icon?: string;
};

// Status is never colour-only: every chip renders a label (and usually an
// icon), so colour-blind users and screen readers get the same information.
export function StatusChip({ label, tone = "neutral", icon }: StatusChipProps) {
  const theme = useTheme();
  const { backgroundColor, textColor } = toneColors(theme, tone);

  return (
    <Chip
      icon={icon}
      style={{ backgroundColor }}
      textStyle={{ color: textColor }}
      accessibilityLabel={label}
    >
      {label}
    </Chip>
  );
}

function toneColors(theme: MD3Theme, tone: StatusTone) {
  switch (tone) {
    case "positive":
      return { backgroundColor: "#E4F5E9", textColor: "#1B5E20" };
    case "warning":
      return { backgroundColor: "#FFF3E0", textColor: "#8A5000" };
    case "negative":
      return { backgroundColor: "#FBE9E7", textColor: theme.colors.error };
    case "neutral":
    default:
      return {
        backgroundColor: theme.colors.surfaceVariant,
        textColor: theme.colors.onSurfaceVariant,
      };
  }
}

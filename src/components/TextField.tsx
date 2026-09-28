import type { ComponentProps } from "react";
import { TextInput } from "react-native-paper";

type TextFieldProps = ComponentProps<typeof TextInput>;

// react-native-paper draws `label` visually but does not expose it as the
// input's accessible name on web, so screen readers announced unnamed
// fields (Phase 4d accessibility review). Use this instead of Paper's
// TextInput everywhere.
export function TextField(props: TextFieldProps) {
  const { label, accessibilityLabel } = props;
  return (
    <TextInput
      {...props}
      accessibilityLabel={
        accessibilityLabel ?? (typeof label === "string" ? label : undefined)
      }
    />
  );
}

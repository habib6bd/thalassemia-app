import { Text, useTheme } from "react-native-paper";

type ErrorTextProps = {
  message: string;
};

export function ErrorText({ message }: ErrorTextProps) {
  const theme = useTheme();
  return (
    <Text
      variant="bodyMedium"
      style={{ color: theme.colors.error }}
      accessibilityRole="alert"
    >
      {message}
    </Text>
  );
}

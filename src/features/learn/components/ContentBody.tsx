import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

// Plain-text bodies: blank lines separate paragraphs (no markup is rendered).
export function ContentBody({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      {text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <Text key={index} variant="bodyLarge">
            {paragraph}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});

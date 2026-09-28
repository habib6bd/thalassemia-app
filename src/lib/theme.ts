import { MD3LightTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

// Accessible, high-contrast palette. Status is never conveyed by colour
// alone (ARCHITECTURE.md §12) — chips/labels always carry text too.
export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#B3261E", // blood-red, used sparingly (never implies urgency by itself)
    secondary: "#00695C",
    error: "#B3261E",
  },
  fonts: {
    ...MD3LightTheme.fonts,
  },
};

// Base font size is intentionally larger than Paper's default for readability
// on lower-end Android devices and for older users (ARCHITECTURE.md §12).
export const baseFontScale = 1.1;

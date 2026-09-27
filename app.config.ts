import type { ExpoConfig } from "expo/config";

// App identity per docs/OPEN_QUESTIONS.md Q11 (placeholder name/id — confirm
// before the first Play Store build, since the package name can't change after).
const config: ExpoConfig = {
  name: "থ্যালাসেমিয়া সহায়তা",
  slug: "thalassemia-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "thalassemia-app",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.habib6bd.thalassemiaapp",
    supportsTablet: true,
  },
  android: {
    package: "com.habib6bd.thalassemiaapp",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
    // No public directory / SEO surface yet — keep it out of search indexes.
    output: "single",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-notifications",
      {
        // No custom sound; push text stays generic (D9) so a distinctive
        // sound isn't needed to convey urgency.
        icon: "./assets/android-icon-foreground.png",
        color: "#B3261E",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
};

export default config;

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
    // Only standard HTTPS/TLS is used, so no export-compliance paperwork.
    config: { usesNonExemptEncryption: false },
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
    // SPA; public/index.html adds noindex + PWA metadata, public/robots.txt
    // disallows crawling (ARCHITECTURE §9).
    output: "single",
    name: "থ্যালাসেমিয়া সহায়তা",
    shortName: "থ্যালাসেমিয়া",
    lang: "bn",
    themeColor: "#B3261E",
    backgroundColor: "#ffffff",
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        // Foreground only, used once when a donor chooses to share an
        // approximate location for nearby search (Phase 4c).
        locationWhenInUsePermission:
          "Share your approximate location so families nearby can find you. Only a rounded area (about 1 km) is saved.",
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
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

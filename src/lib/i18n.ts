import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import bnCommon from "@/locales/bn/common.json";
import enCommon from "@/locales/en/common.json";

export const resources = {
  bn: { common: bnCommon },
  en: { common: enCommon },
} as const;

export const supportedLanguages = Object.keys(
  resources,
) as (keyof typeof resources)[];
export type SupportedLanguage = (typeof supportedLanguages)[number];

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const fallbackLanguage: SupportedLanguage = "bn";
const initialLanguage: SupportedLanguage = supportedLanguages.includes(
  deviceLanguage as SupportedLanguage,
)
  ? (deviceLanguage as SupportedLanguage)
  : fallbackLanguage;

// eslint-disable-next-line import/no-named-as-default-member -- i18n.use is the instance method, not the named export
void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common"],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;

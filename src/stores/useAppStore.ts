import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import i18n, { type SupportedLanguage } from "@/lib/i18n";
import type { Database } from "@/lib/database.types";

export type AppRole = Database["public"]["Enums"] extends { app_role: infer R }
  ? R
  : string;

type AppState = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;

  session: Session | null;
  setSession: (session: Session | null) => void;

  // False until the first auth check (native session restore, or the
  // web OAuth callback) has resolved — route guards must wait for this
  // before deciding to redirect to (auth), to avoid a signed-in user
  // flashing through the sign-in screen on cold start.
  sessionLoaded: boolean;
  setSessionLoaded: (loaded: boolean) => void;

  activeRole: AppRole | null;
  setActiveRole: (role: AppRole | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "bn",
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },

      session: null,
      setSession: (session) => set({ session }),

      sessionLoaded: false,
      setSessionLoaded: (sessionLoaded) => set({ sessionLoaded }),

      activeRole: null,
      setActiveRole: (activeRole) => set({ activeRole }),
    }),
    {
      name: "thalassemia-app-store",
      storage: createJSONStorage(() => AsyncStorage),
      // Session comes from supabase-js's own persisted storage; only persist
      // the small amount of client-only state here.
      partialize: (state) => ({
        language: state.language,
        activeRole: state.activeRole,
      }),
    },
  ),
);

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/useAppStore";

// Keeps the Zustand session mirror in sync with supabase-js's own auth
// state. Call once, near the app root.
export function useAuthListener() {
  const setSession = useAppStore((state) => state.setSession);
  const setSessionLoaded = useAppStore((state) => state.setSessionLoaded);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setSessionLoaded(true);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setSessionLoaded]);
}

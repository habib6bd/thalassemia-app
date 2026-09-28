import { useMutation } from "@tanstack/react-query";
import { Platform, Share } from "react-native";

import { supabase } from "@/lib/supabase";

export function useExportMyData() {
  return useMutation({
    mutationFn: async (shareTitle: string) => {
      const { data, error } = await supabase.rpc("export_my_data");
      if (error) throw error;
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([json], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "my-data.json";
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      await Share.share({ title: shareTitle, message: json });
    },
  });
}

// The delete-account Edge Function anonymises the data (delete_my_account)
// and then disables sign-in; the local session is cleared afterwards.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean;
        error?: string;
      }>("delete-account", { method: "POST" });
      if (error) {
        const context = (error as { context?: Response }).context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.error ?? error.message);
      }
      if (!data?.ok) throw new Error(data?.error ?? "generic");
      await supabase.auth.signOut({ scope: "local" });
    },
  });
}

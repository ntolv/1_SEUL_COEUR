"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { APP_VERSION_CODE, APP_VERSION_NAME } from "@/lib/appVersion";

export default function AppVersionTracker() {
  useEffect(() => {
    async function sendVersion() {
      try {
        // 🔥 attendre session utilisateur
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          console.log("Pas de session utilisateur, tracking ignoré");
          return;
        }

        console.log("Tracking version pour user:", session.user.id);

        const { error } = await supabase.rpc("fn_register_app_version", {
          p_version_code: APP_VERSION_CODE,
          p_version_name: APP_VERSION_NAME,
        });

        if (error) {
          console.error("Erreur tracking version:", error);
        } else {
          console.log("Version envoyée avec succès");
        }
      } catch (e) {
        console.error("Erreur globale tracking:", e);
      }
    }

    sendVersion();
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { APP_VERSION_CODE, APP_VERSION_NAME } from "@/lib/appVersion";

export default function AppVersionTracker() {
  useEffect(() => {
    async function sendVersion() {
      try {
        await supabase.rpc("fn_register_app_version", {
          p_version_code: APP_VERSION_CODE,
          p_version_name: APP_VERSION_NAME,
        });
      } catch (e) {
        console.error("Erreur version tracking:", e);
      }
    }

    sendVersion();
  }, []);

  return null;
}

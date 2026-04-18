"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CURRENT_APP_VERSION } from "@/lib/appVersion";

type AppVersionRow = {
  version_code: number;
  version_name: string | null;
  titre: string | null;
  message: string | null;
  obligatoire: boolean | null;
  active: boolean | null;
  plateforme: string | null;
};

export default function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<AppVersionRow | null>(null);

  const storageKey = useMemo(
    () => "usc_update_hidden_" + CURRENT_APP_VERSION,
    []
  );

  async function checkVersion() {
    try {
      const hidden = sessionStorage.getItem(storageKey);
      if (hidden === "1") return;

      const { data } = await supabase
        .from("app_versions")
        .select("version_code, version_name, titre, message, obligatoire, active, plateforme")
        .eq("active", true)
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && Number(data.version_code) > Number(CURRENT_APP_VERSION)) {
        setLatestVersion(data);
        setOpen(true);
      }
    } catch {}
  }

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, 30000);
    return () => clearInterval(interval);
  }, []);

  function goHomeAndReload() {
    // redirection propre vers accueil
    const url = new URL(window.location.origin);
    url.searchParams.set("v", Date.now().toString());
    window.location.replace(url.toString());
  }

  function handleClose() {
    if (latestVersion?.obligatoire) return;

    sessionStorage.setItem(storageKey, "1");
    setOpen(false);

    // redirection accueil
    goHomeAndReload();
  }

  function handleUpdate() {
    setOpen(false);

    // redirection accueil + refresh
    goHomeAndReload();
  }

  if (!open || !latestVersion) return null;

  const obligatoire = !!latestVersion.obligatoire;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "#16a34a",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {latestVersion.titre || "Mise à jour disponible"}
        </div>

        <div style={{ padding: "16px" }}>
          <p style={{ marginBottom: "16px" }}>
            {latestVersion.message || "Une nouvelle version est disponible."}
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            {!obligatoire && (
              <button
                onClick={handleClose}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                Plus tard
              </button>
            )}

            <button
              onClick={handleUpdate}
              style={{
                padding: "10px",
                borderRadius: "10px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
              }}
            >
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

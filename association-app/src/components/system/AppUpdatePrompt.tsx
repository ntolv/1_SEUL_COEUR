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
  const [loading, setLoading] = useState(true);
  const [latestVersion, setLatestVersion] = useState<AppVersionRow | null>(null);

  const storageKey = useMemo(
    () => "usc_update_hidden_for_version_" + CURRENT_APP_VERSION,
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const hidden = sessionStorage.getItem(storageKey);
        if (hidden === "1") {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("app_versions")
          .select("version_code, version_name, titre, message, obligatoire, active, plateforme")
          .eq("active", true)
          .or("plateforme.eq.web,plateforme.eq.all,plateforme.is.null")
          .order("version_code", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Erreur vérification version:", error);
          setLoading(false);
          return;
        }

        if (!cancelled && data && Number(data.version_code) > Number(CURRENT_APP_VERSION)) {
          setLatestVersion(data);
          setOpen(true);
        }
      } catch (e) {
        console.error("Erreur inattendue version:", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkVersion();

    const interval = window.setInterval(checkVersion, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [storageKey]);

  function handleClose() {
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {}
    setOpen(false);
  }

  function handleUpdateNow() {
    setOpen(false);

    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now().toString());

    window.location.replace(url.toString());
  }

  if (loading || !open || !latestVersion) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 18px 12px 18px",
            borderBottom: "1px solid #eef2f7",
            background: "linear-gradient(135deg, #0f766e 0%, #16a34a 100%)",
            color: "#ffffff",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 800 }}>
            {latestVersion.titre?.trim() || "Nouvelle mise à jour disponible"}
          </div>
          <div style={{ marginTop: "6px", fontSize: "13px", opacity: 0.95 }}>
            Version actuelle : {CURRENT_APP_VERSION} | Nouvelle version : {latestVersion.version_code}
          </div>
        </div>

        <div style={{ padding: "18px" }}>
          <p style={{ margin: 0, color: "#1f2937", lineHeight: 1.55 }}>
            {latestVersion.message?.trim() || "Une nouvelle version de l’application est disponible. Recharge maintenant pour l’utiliser."}
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "18px",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#374151",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Plus tard
            </button>

            <button
              type="button"
              onClick={handleUpdateNow}
              style={{
                border: "none",
                background: "#16a34a",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 800,
                cursor: "pointer",
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

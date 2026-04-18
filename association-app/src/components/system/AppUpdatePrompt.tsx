"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { APP_VERSION_CODE, APP_VERSION_NAME } from "@/lib/appVersion";

type AppVersionRow = {
  version_code: number;
  version_name: string | null;
  titre: string | null;
  message: string | null;
  obligatoire: boolean | null;
  active: boolean | null;
  plateforme: string | null;
};

function getDismissKey(versionCode: number) {
  return "usc_update_dismissed_version_" + String(versionCode);
}

export default function AppUpdatePrompt() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<AppVersionRow | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const mountedRef = useRef(true);
  const checkingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function checkVersion() {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        const { data, error } = await supabase
          .from("app_versions")
          .select("version_code, version_name, titre, message, obligatoire, active, plateforme")
          .eq("active", true)
          .or("plateforme.eq.web,plateforme.eq.all,plateforme.is.null")
          .order("version_code", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) return;

        const latestCode = Number(data.version_code || 0);
        const currentCode = Number(APP_VERSION_CODE || 0);

        if (latestCode <= currentCode) {
          if (mountedRef.current) {
            setOpen(false);
            setLatestVersion(null);
          }
          return;
        }

        const dismissed = sessionStorage.getItem(getDismissKey(latestCode)) === "1";
        if (dismissed) {
          if (mountedRef.current) {
            setOpen(false);
            setLatestVersion(null);
          }
          return;
        }

        if (mountedRef.current) {
          setLatestVersion(data);
          setOpen(true);
        }
      } catch (e) {
        console.error("Erreur verification version:", e);
      } finally {
        checkingRef.current = false;
      }
    }

    checkVersion();
    const interval = window.setInterval(checkVersion, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function redirectHome(forceRefresh: boolean) {
    setIsRedirecting(true);
    setOpen(false);

    const target = forceRefresh
      ? "/?refresh=" + Date.now().toString()
      : "/";

    if (pathname !== "/") {
      router.replace(target);
      window.setTimeout(() => {
        window.location.href = target;
      }, 120);
      return;
    }

    window.location.href = target;
  }

  function handleClose() {
    if (!latestVersion) return;
    if (latestVersion.obligatoire) return;

    sessionStorage.setItem(getDismissKey(Number(latestVersion.version_code)), "1");
    redirectHome(false);
  }

  function handleUpdate() {
    if (!latestVersion) return;

    sessionStorage.setItem(getDismissKey(Number(latestVersion.version_code)), "1");
    redirectHome(true);
  }

  if (!open || !latestVersion || isRedirecting) {
    return null;
  }

  const obligatoire = !!latestVersion.obligatoire;
  const title = latestVersion.titre?.trim() || "Nouvelle mise a jour disponible";
  const message =
    latestVersion.message?.trim() ||
    "Une nouvelle version de l'application est disponible. Recharge maintenant pour l'utiliser.";

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
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "#16a34a",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "18px",
          }}
        >
          {title}
        </div>

        <div style={{ padding: "18px" }}>
          <p
            style={{
              margin: 0,
              marginBottom: "8px",
              color: "#1f2937",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>

          <p
            style={{
              margin: 0,
              marginBottom: "18px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Version actuelle : {APP_VERSION_NAME} ({APP_VERSION_CODE}) | Nouvelle version : {latestVersion.version_name || latestVersion.version_code}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {!obligatoire && (
              <button
                type="button"
                onClick={handleClose}
                style={{
                  minWidth: "110px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#374151",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Plus tard
              </button>
            )}

            <button
              type="button"
              onClick={handleUpdate}
              style={{
                minWidth: "120px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "none",
                background: "#16a34a",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Mettre a jour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

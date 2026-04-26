"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Profil = {
  id: string;
  email: string;
  nom_complet: string;
  telephone: string | null;
  role: string;
  statut_actif: boolean;
  photo_url: string | null;
  photo_storage_path: string | null;
  created_at: string;
  updated_at: string;
};

type DashboardSession = {
  session_libelle: string;
  total_inscrits: number;
  nb_contributeurs: number;
  total_caisse_session: number;
};

function formatMontant(valeur: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valeur ?? 0));
}

function getInitiales(nom: string | null | undefined) {
  const propre = (nom ?? "").trim();
  if (!propre) return "US";

  return propre
    .split(" ")
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function normalizeRole(role: string | null | undefined) {
  return (role ?? "").trim().toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<Profil | null>(null);
  const [sessionData, setSessionData] = useState<DashboardSession | null>(null);
  const [chargement, setChargement] = useState<boolean>(true);
  const [erreur, setErreur] = useState<string>("");
  const [deconnexion, setDeconnexion] = useState<boolean>(false);

  useEffect(() => {
    let actif = true;

    async function load() {
      try {
        setChargement(true);
        setErreur("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!actif) return;

        if (!session) {
          router.replace("/login");
          return;
        }

        const { data: meData, error: meError } = await supabase.rpc("fn_me");

        if (!actif) return;

        if (meError) {
          setErreur(meError.message || "Impossible de charger le profil.");
          setChargement(false);
          return;
        }

        const profilCharge = Array.isArray(meData) && meData.length > 0 ? (meData[0] as Profil) : null;
        setProfil(profilCharge);

        const { data: sessionBloc, error: sessionError } = await supabase.rpc("fn_dashboard_bloc1_session");

        if (!actif) return;

        if (!sessionError && Array.isArray(sessionBloc) && sessionBloc.length > 0) {
          setSessionData(sessionBloc[0] as DashboardSession);
        } else {
          setSessionData(null);
        }

        setChargement(false);
      } catch {
        if (!actif) return;
        setErreur("Erreur lors du chargement du dashboard.");
        setChargement(false);
      }
    }

    load();

    return () => {
      actif = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      setDeconnexion(true);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setDeconnexion(false);
    }
  }

  const roleNormalise = useMemo(() => normalizeRole(profil?.role), [profil?.role]);
  const versEncaissements = ["ADMIN", "PRESIDENT", "TRESORIER"].includes(roleNormalise);

  return (
    <AppShell>
      <div className="space-y-4 p-3 sm:p-4">
        {chargement ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 shadow-2xl backdrop-blur-xl">
            Chargement...
          </div>
        ) : erreur ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200 shadow-2xl backdrop-blur-xl">
            {erreur}
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-emerald-500/10 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {profil?.photo_url ? (
                      <img
                        src={profil.photo_url}
                        alt={profil?.nom_complet || "Photo de profil"}
                        className="h-16 w-16 rounded-2xl border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950">
                        {getInitiales(profil?.nom_complet)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold text-white">
                      {profil?.nom_complet || "Utilisateur"}
                    </div>
                    <div className="truncate text-sm text-slate-300">
                      {profil?.email || "Email non renseigné"}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[11px] font-medium text-violet-200">
                        {profil?.role || "MEMBRE"}
                      </span>
                      <span
                        className={
                          "rounded-full border px-3 py-1 text-[11px] font-medium " +
                          (profil?.statut_actif
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                            : "border-red-400/30 bg-red-400/10 text-red-200")
                        }
                      >
                        {profil?.statut_actif ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Téléphone</div>
                    <div className="mt-1 truncate text-sm text-white">
                      {profil?.telephone || "Non renseigné"}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={deconnexion}
                    className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-400/20 disabled:opacity-60"
                  >
                    {deconnexion ? "Déconnexion..." : "Se déconnecter"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 text-sm font-medium text-slate-300">Session du mois</div>

              {sessionData ? (
                <>
                  <div className="text-xl font-semibold text-white">{sessionData.session_libelle}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Inscrits</div>
                      <div className="mt-1 text-lg font-semibold text-white">{sessionData.total_inscrits}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Contributeurs</div>
                      <div className="mt-1 text-lg font-semibold text-white">{sessionData.nb_contributeurs}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Total caisse</div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {formatMontant(sessionData.total_caisse_session)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400">Aucune session en cours</div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 text-sm font-medium text-slate-300">Actions rapides</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
                >
                  Accueil
                </button>

                <button
                  onClick={() => router.push("/membres")}
                  className="rounded-2xl border border-violet-400/30 bg-violet-400/10 px-4 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-400/20"
                >
                  Membres
                </button>

                <button
                  onClick={() => router.push("/prets")}
                  className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
                >
                  Prêts
                </button>

                <button
                  onClick={() => router.push(versEncaissements ? "/encaissements" : "/notifications")}
                  className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  {versEncaissements ? "Encaissements" : "Notifications"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

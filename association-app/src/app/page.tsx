"use client";

import Link from "next/link";
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

type AccesItem = {
  titre: string;
  description: string;
  lien: string;
  icone: string;
};

function normalizeRole(role: string | null | undefined) {
  return (role ?? "").trim().toUpperCase();
}

export default function HomePage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;

    async function charger() {
      try {
        setChargement(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!actif) return;

        if (!session) {
          setChargement(false);
          router.replace("/login");
          return;
        }

        const { data: profilData, error: profilError } = await supabase.rpc("fn_me");

        if (!actif) return;

        if (profilError || !profilData || profilData.length === 0) {
          setProfil(null);
          setChargement(false);
          router.replace("/login");
          return;
        }

        setProfil(profilData[0] as Profil);
        setChargement(false);
      } catch {
        if (!actif) return;
        setProfil(null);
        setChargement(false);
        router.replace("/login");
      }
    }

    charger();

    return () => {
      actif = false;
    };
  }, [router]);

  const roleNormalise = useMemo(() => normalizeRole(profil?.role), [profil?.role]);

  const estRoleAdmin = useMemo(() => {
    return ["ADMIN", "PRESIDENT", "TRESORIER"].includes(roleNormalise);
  }, [roleNormalise]);

  const accesMembre: AccesItem[] = [
    { titre: "Dashboard", description: "Voir ma synthèse", lien: "/dashboard", icone: "📊" },
    { titre: "Membres", description: "Consulter les membres", lien: "/membres", icone: "👥" },
    { titre: "Prêts", description: "Suivre les prêts", lien: "/prets", icone: "💰" },
    { titre: "Investissements", description: "Consulter les investissements", lien: "/investissements", icone: "📈" },
    { titre: "Notifications", description: "Voir les notifications", lien: "/notifications", icone: "🔔" },
  ];

  const accesAdmin: AccesItem[] = [
    { titre: "Dashboard", description: "Voir ma synthèse", lien: "/dashboard", icone: "📊" },
    { titre: "Membres", description: "Consulter les membres", lien: "/membres", icone: "👥" },
    { titre: "Synthèse caisse", description: "Voir la situation complète", lien: "/synthese-caisse", icone: "🌍" },
    { titre: "Prêts et Aides", description: "Gérer les prêts et aides", lien: "/prets-et-aides", icone: "�" },
    { titre: "Investissements", description: "Consulter les investissements", lien: "/investissements", icone: "📈" },
    { titre: "Notifications", description: "Voir les notifications", lien: "/notifications", icone: "🔔" },
  ];

  const accesRapides = estRoleAdmin ? accesAdmin : accesMembre;
  const actionsPrincipales = estRoleAdmin ? accesAdmin.slice(0, 4) : accesMembre.slice(0, 4);

  if (chargement) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-slate-300">Chargement...</div>
        </div>
      </AppShell>
    );
  }

  if (!profil) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-slate-300">Erreur de chargement</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="space-y-12 p-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600/20 via-violet-600/20 to-emerald-600/20 p-12 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <div className="relative z-10 text-center">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Bienvenue dans votre espace
              </h1>

              <p className="mt-6 text-2xl font-semibold text-cyan-200 sm:text-3xl">
                Association Un Seul Cœur
              </p>

              <div className="mt-8 flex justify-center">
                <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-violet-400/30 bg-violet-400/10 px-6 py-3">
                  <span className="text-violet-200">Rôle : {profil.role}</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      profil.statut_actif
                        ? "border-emerald-400/30 bg-emerald-400/20 text-emerald-200"
                        : "border-red-400/30 bg-red-400/20 text-red-200"
                    }`}
                  >
                    {profil.statut_actif ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>

              <p className="mt-8 text-xl text-slate-200">
                {profil.nom_complet ? (
                  <>
                    Bonjour <span className="font-bold text-white">{profil.nom_complet}</span>, nous sommes ravis de
                    vous retrouver sur votre espace personnel.
                  </>
                ) : (
                  "Nous sommes ravis de vous retrouver sur votre espace personnel."
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">
                <h2 className="mb-8 text-2xl font-bold text-white">Accès immédiat</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {actionsPrincipales.map((action) => (
                    <Link
                      key={action.titre}
                      href={action.lien}
                      className="group rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6 transition-all hover:border-cyan-400/50 hover:from-cyan-500/20 hover:to-violet-500/20 hover:shadow-xl hover:shadow-cyan-400/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl transition-transform group-hover:scale-110">{action.icone}</div>
                        <div>
                          <div className="font-bold text-white group-hover:text-cyan-200">{action.titre}</div>
                          <div className="text-sm text-slate-400">{action.description}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">
                <h2 className="mb-8 text-2xl font-bold text-white">Informations</h2>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                    <span className="text-sm text-slate-400">Rôle</span>
                    <div className="font-medium text-white">{profil.role}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                    <span className="text-sm text-slate-400">Statut</span>
                    <div className={`font-medium ${profil.statut_actif ? "text-emerald-200" : "text-red-200"}`}>
                      {profil.statut_actif ? "Actif" : "Inactif"}
                    </div>
                  </div>
                  {profil.email && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                      <span className="text-sm text-slate-400">Email</span>
                      <div className="truncate font-medium text-white">{profil.email}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">
            <h2 className="mb-8 text-2xl font-bold text-white">Toutes les fonctionnalités</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {accesRapides.map((acces) => (
                <Link
                  key={acces.titre}
                  href={acces.lien}
                  className="group rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 transition-all hover:border-cyan-400/30 hover:bg-gradient-to-br hover:from-cyan-500/10 hover:to-violet-500/10 hover:shadow-xl hover:shadow-cyan-400/20"
                >
                  <div className="text-center">
                    <div className="mx-auto mb-4 text-5xl transition-transform group-hover:scale-110">{acces.icone}</div>
                    <h3 className="mb-2 text-lg font-bold text-white group-hover:text-cyan-200">{acces.titre}</h3>
                    <p className="text-sm text-slate-400">{acces.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-400">Association Un Seul Cœur • Ensemble pour un avenir meilleur</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
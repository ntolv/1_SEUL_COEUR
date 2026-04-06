"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function getInitiales(nom: string) {
  return nom
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function HomePage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      setChargement(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profilData, error: profilError } = await supabase.rpc("fn_me");

      if (profilError || !profilData || profilData.length === 0) {
        router.push("/login");
        return;
      }

      setProfil(profilData[0]);
      setChargement(false);
    }

    charger();
  }, [router]);

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

  const accesMembre = [
    { titre: "Dashboard", lien: "/dashboard", icone: "📊" },
    { titre: "Membres", lien: "/membres", icone: "👥" },
    { titre: "Prêts", lien: "/prets", icone: "💰" },
    { titre: "Investissements", lien: "/investissements", icone: "📈" },
    { titre: "Notifications", lien: "/notifications", icone: "🔔" },
  ];

  const accesAdmin = [
    { titre: "Dashboard", lien: "/dashboard", icone: "📊" },
    { titre: "Membres", lien: "/membres", icone: "👥" },
    { titre: "Encaissements", lien: "/encaissements", icone: "💵" },
    { titre: "Situation globale", lien: "/situation-globale", icone: "🌍" },
    { titre: "Prêts", lien: "/prets", icone: "💰" },
    { titre: "Investissements", lien: "/investissements", icone: "📈" },
    { titre: "Notifications", lien: "/notifications", icone: "🔔" },
  ];

  const accesRapides = ["ADMIN", "PRESIDENT", "TRESORIER"].includes(profil.role)
    ? accesAdmin
    : accesMembre;

  return (
    <AppShell>
      <div className="min-h-screen space-y-8 p-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Bienvenue
            </h1>
            <p className="mt-4 text-xl text-cyan-200 sm:text-2xl">
              Association Un Seul Cœur
            </p>
            <p className="mt-6 text-lg text-slate-300">
              {profil.nom_complet ? (
                <>
                  Bonjour <span className="font-semibold text-white">{profil.nom_complet}</span>,
                  nous sommes ravis de vous retrouver sur votre espace personnel.
                </>
              ) : (
                "Nous sommes ravis de vous retrouver sur votre espace personnel."
              )}
            </p>
            <p className="mt-2 text-slate-400">
              Accédez rapidement à toutes les fonctionnalités de l'association.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {profil.photo_url ? (
              <img
                src={profil.photo_url}
                alt={profil.nom_complet}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950">
                {getInitiales(profil.nom_complet || "")}
              </div>
            )}
            <div className="flex-1">
              <div className="text-lg font-semibold text-white">{profil.nom_complet}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">
                  {profil.role}
                </span>
                <span
                  className={
                    "rounded-full border px-3 py-1 text-xs " +
                    (profil.statut_actif
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/30 bg-red-400/10 text-red-200")
                  }
                >
                  {profil.statut_actif ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-2xl font-semibold text-white">Accès rapides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accesRapides.map((acces) => (
              <Link
                key={acces.titre}
                href={acces.lien}
                className="group rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:shadow-lg hover:shadow-cyan-400/10"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 text-3xl transition-transform group-hover:scale-110">
                    {acces.icone}
                  </div>
                  <div className="font-medium text-white group-hover:text-cyan-200">
                    {acces.titre}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-400">
            Association Un Seul Cœur • Ensemble pour un avenir meilleur
          </p>
        </div>
      </div>
    </AppShell>
  );
}

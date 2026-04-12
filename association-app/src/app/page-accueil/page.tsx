import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  ChartColumn,
  HandCoins,
  LayoutDashboard,
  TrendingUp,
  Users,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";

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

type AccesRapide = {
  titre: string;
  lien: string;
  icone: keyof typeof iconMap;
  description: string;
};

const iconMap = {
  people: Users,
  payments: HandCoins,
  analytics: ChartColumn,
  account_balance: HandCoins,
  trending_up: TrendingUp,
  notifications: Bell,
  dashboard: LayoutDashboard,
};

export default async function PageAccueil() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: profilData, error: profilError } = await supabase.rpc("fn_me");

  if (profilError) {
    console.warn("fn_me échoué:", profilError.message);
  }

  const profil =
    Array.isArray(profilData) && profilData.length > 0 ? profilData[0] : null;

  const accesRapides: AccesRapide =
    null as unknown as AccesRapide; // placeholder to satisfy formatting context only

  const listeAccesRapides: AccesRapide[] =
    profil && ["ADMIN", "PRESIDENT", "TRESORIER"].includes(profil.role)
      ? [
          {
            titre: "Membres",
            lien: "/membres",
            icone: "people",
            description: "Gestion des membres",
          },
          {
            titre: "Encaissements",
            lien: "/encaissements",
            icone: "payments",
            description: "Suivi des encaissements",
          },
          {
            titre: "Suivi global",
            lien: "/suivi-global",
            icone: "analytics",
            description: "Vue globale des encaissements",
          },
          {
            titre: "Prêts",
            lien: "/prets",
            icone: "account_balance",
            description: "Gestion des prêts",
          },
          {
            titre: "Investissements",
            lien: "/investissements",
            icone: "trending_up",
            description: "Suivi des investissements",
          },
          {
            titre: "Notifications",
            lien: "/notifications",
            icone: "notifications",
            description: "Centre de notifications",
          },
        ]
      : [
          {
            titre: "Dashboard",
            lien: "/dashboard",
            icone: "dashboard",
            description: "Tableau de bord personnel",
          },
          {
            titre: "Membres",
            lien: "/membres",
            icone: "people",
            description: "Annuaire des membres",
          },
          {
            titre: "Prêts",
            lien: "/prets",
            icone: "account_balance",
            description: "Mes prêts",
          },
          {
            titre: "Investissements",
            lien: "/investissements",
            icone: "trending_up",
            description: "Mes investissements",
          },
          {
            titre: "Notifications",
            lien: "/notifications",
            icone: "notifications",
            description: "Mes notifications",
          },
        ];

  void accesRapides;

  return (
    <AppShell>
      <div className="min-h-screen space-y-8 p-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Bienvenue
            </h1>
            <p className="mt-4 text-xl text-cyan-200 sm:text-2xl">
              Association Un Seul Coeur
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-2xl font-semibold text-white">
                {profil?.nom_complet || "Membre"}
              </p>
              <div className="flex justify-center gap-3">
                <span className="inline-flex rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-200">
                  {profil?.role || "Membre"}
                </span>
                <span
                  className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium ${
                    profil?.statut_actif
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/30 bg-red-400/10 text-red-200"
                  }`}
                >
                  {profil?.statut_actif ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-2xl font-semibold text-white">
            Accès rapide
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listeAccesRapides.map((acces) => {
              const Icone = iconMap[acces.icone];

              return (
                <Link
                  key={acces.titre}
                  href={acces.lien}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 transition-all duration-300 hover:border-cyan-400/30 hover:bg-gradient-to-br hover:from-cyan-500/10 hover:to-violet-500/10 hover:shadow-xl hover:shadow-cyan-400/20"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white transition-transform duration-300 group-hover:scale-110">
                      <Icone className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-cyan-200">
                        {acces.titre}
                      </h3>
                      <p className="text-sm text-slate-400 transition-colors group-hover:text-slate-300">
                        {acces.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-400">
            Association Un Seul Coeur &bull; Ensemble pour un avenir meilleur
          </p>
        </div>
      </div>
    </AppShell>
  );
}

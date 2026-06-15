import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  ChartColumn,
  FileText,
  HandCoins,
  HeartHandshake,
  History,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
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

const iconMap = {
  dashboard: LayoutDashboard,
  members: Users,
  addMember: UserPlus,
  encaissement: HandCoins,
  decaissement: Banknote,
  caisse: Landmark,
  suivi: ChartColumn,
  history: History,
  reports: FileText,
  alerts: AlertTriangle,
  solidarity: HeartHandshake,
  loans: WalletCards,
  notifications: Bell,
  admin: Shield,
  investment: TrendingUp,
  receipt: ReceiptText,
};

type IconKey = keyof typeof iconMap;

type OperationCard = {
  titre: string;
  description: string;
  lien: string;
  icone: IconKey;
};

type OperationSection = {
  titre: string;
  description: string;
  icone: IconKey;
  cartes: OperationCard[];
};

type DashboardGlobal = {
  solde_global_caisses: number | string | null;
  solde_caisse_association?: number | string | null;
  nb_prets_en_cours: number | string | null;
  reste_global: number | string | null;
};

type EncaissementMois = {
  mois: string | null;
  statut: string | null;
  solde_corrige: number | string | null;
};

type RetardRow = {
  personne_id: string | null;
  reste: number | string | null;
};

type NotificationCount = {
  total_non_lues: number | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function KpiCard({
  titre,
  valeur,
  description,
  icone,
  href,
  danger = false,
}: {
  titre: string;
  valeur: string;
  description: string;
  icone: IconKey;
  href?: string;
  danger?: boolean;
}) {
  const Icone = iconMap[icone];

  const inner = (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            danger ? "bg-orange-400/10 text-orange-200" : "bg-cyan-400/10 text-cyan-200"
          }`}
        >
          <Icone className="h-5 w-5" />
        </div>
      </div>

      <p className="text-sm text-slate-400">{titre}</p>
      <p className="mt-2 text-2xl font-bold text-white">{valeur}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`rounded-3xl border p-5 transition ${
          danger
            ? "border-orange-400/20 bg-orange-400/5 hover:border-orange-300/40 hover:bg-orange-400/10"
            : "border-white/10 bg-white/[0.04] hover:border-cyan-400/40 hover:bg-cyan-400/10"
        }`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      {inner}
    </div>
  );
}
function OperationLink({ card }: { card: OperationCard }) {
  const Icone = iconMap[card.icone];

  return (
    <Link
      href={card.lien}
      className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5 transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:shadow-xl hover:shadow-cyan-500/10"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200 transition-transform duration-300 group-hover:scale-105">
        <Icone className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-white group-hover:text-cyan-100">
          {card.titre}
        </h3>
        <p className="mt-1 text-sm leading-5 text-slate-400 group-hover:text-slate-300">
          {card.description}
        </p>
      </div>

      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cyan-200" />
    </Link>
  );
}

function OperationSectionCard({ section }: { section: OperationSection }) {
  const Icone = iconMap[section.icone];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
          <Icone className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">{section.titre}</h2>
          <p className="mt-1 text-sm text-slate-400">{section.description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {section.cartes.map((card) => (
          <OperationLink key={`${section.titre}-${card.titre}`} card={card} />
        ))}
      </div>
    </section>
  );
}

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

  const profil: Profil | null =
    Array.isArray(profilData) && profilData.length > 0 ? profilData[0] : null;

  const role = profil?.role || "MEMBRE";
  const canManage = ["ADMIN", "PRESIDENT", "TRESORIER"].includes(role);

  const [
    dashboardGlobalResult,
    encaissementMoisResult,
    membresCountResult,
    retardsResult,
    notificationsResult,
  ] = await Promise.all([
    canManage
      ? supabase
          .from("v_kpi_solde_caisse_association")
          .select("solde_caisse_association")
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    canManage
      ? supabase
          .from("v_encaissement_mois_synthese_corrigee")
          .select("mois, statut, solde_corrige")
          .order("mois", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("v_personnes_uniques")
      .select("id", { count: "exact", head: true }),
    canManage
      ? supabase
          .from("v_encaissements_suivi_global")
          .select("personne_id, reste")
          .gt("reste", 0)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("v_notifications_non_lues_count")
      .select("total_non_lues")
      .maybeSingle(),
  ]);

  const dashboardGlobal = dashboardGlobalResult.data as DashboardGlobal | null;
  const encaissementMois = encaissementMoisResult.data as EncaissementMois | null;
  const retards = (retardsResult.data || []) as RetardRow[];
  const notifications = notificationsResult.data as NotificationCount | null;

  const soldeGlobal = Number(dashboardGlobal?.solde_caisse_association || 0);
  const encaissementsMois = Number(encaissementMois?.solde_corrige || 0);
  const nbMembres = membresCountResult.count || 0;
  const nbRetards = new Set(
    retards
      .map((retard) => retard.personne_id)
      .filter(Boolean)
  ).size;

  const montantRetards = retards.reduce(
    (total, retard) => total + Number(retard.reste || 0),
    0
  );
  const nbNotifications = Number(notifications?.total_non_lues || 0);
  const nbPretsEnCours = Number(dashboardGlobal?.nb_prets_en_cours || 0);
  const restePrets = Number(dashboardGlobal?.reste_global || 0);

  const quickActions: OperationCard[] = canManage
    ? [
        {
          titre: "Encaisser",
          description: "Saisir rapidement une cotisation ou une entrée.",
          lien: "/encaissements",
          icone: "encaissement",
        },
        {
          titre: "Décaisser",
          description: "Enregistrer une sortie, une aide ou un prêt.",
          lien: "/decaissements",
          icone: "decaissement",
        },
        {
          titre: "Ajouter un membre",
          description: "Créer ou compléter une fiche membre.",
          lien: "/membres",
          icone: "addMember",
        },
        {
          titre: "Voir les retards",
          description: "Contrôler les anomalies et les soldes à régulariser.",
          lien: "/suivi-global",
          icone: "alerts",
        },
      ]
    : [
        {
          titre: "Mon dashboard",
          description: "Consulter ma situation personnelle.",
          lien: "/dashboard",
          icone: "dashboard",
        },
        {
          titre: "Mes notifications",
          description: "Voir les messages et alertes me concernant.",
          lien: "/notifications",
          icone: "notifications",
        },
        {
          titre: "Annuaire membres",
          description: "Consulter la liste des membres.",
          lien: "/membres",
          icone: "members",
        },
        {
          titre: "Mes prêts",
          description: "Suivre mes prêts et remboursements.",
          lien: "/prets",
          icone: "loans",
        },
      ];

  const sections: OperationSection[] = canManage
    ? [
        {
          titre: "Finances",
          description: "Entrées, sorties, historiques et corrections.",
          icone: "encaissement",
          cartes: [
            {
              titre: "Encaissements",
              description: "Saisie des cotisations et entrées.",
              lien: "/encaissements",
              icone: "encaissement",
            },
            {
              titre: "Historique encaissements",
              description: "Rechercher et contrôler les opérations encaissées.",
              lien: "/encaissements/historique",
              icone: "history",
            },
            {
              titre: "Décaissements",
              description: "Gérer les sorties, aides, prêts et dépenses.",
              lien: "/decaissements",
              icone: "decaissement",
            },
            {
              titre: "Prêts",
              description: "Suivre les prêts accordés et remboursements.",
              lien: "/prets",
              icone: "loans",
            },
          ],
        },
        {
          titre: "Caisses",
          description: "Lecture globale de la situation financière.",
          icone: "caisse",
          cartes: [
            {
              titre: "Suivi global",
              description: "Vue consolidée des encaissements et soldes.",
              lien: "/suivi-global",
              icone: "suivi",
            },
            {
              titre: "Suivi caisse session",
              description: "Contrôle détaillé par période ou session.",
              lien: "/suivi-caisse-session",
              icone: "caisse",
            },
            {
              titre: "Synthèse caisse",
              description: "Synthèse exploitable pour contrôle et édition.",
              lien: "/synthese-caisse",
              icone: "reports",
            },
            {
              titre: "Investissements",
              description: "Suivi des fonds et mouvements investissement.",
              lien: "/investissements",
              icone: "investment",
            },
          ],
        },
        {
          titre: "Membres",
          description: "Gestion des membres et suivi associatif.",
          icone: "members",
          cartes: [
            {
              titre: "Liste des membres",
              description: "Consulter, vérifier et gérer les fiches membres.",
              lien: "/membres",
              icone: "members",
            },
            {
              titre: "Retards membres",
              description: "Identifier les membres à régulariser.",
              lien: "/suivi-global",
              icone: "alerts",
            },
            {
              titre: "Notifications",
              description: "Centre de notifications de l'association.",
              lien: "/notifications",
              icone: "notifications",
            },
            {
              titre: "Dashboard",
              description: "Vue personnelle et synthèse utilisateur.",
              lien: "/dashboard",
              icone: "dashboard",
            },
          ],
        },
        {
          titre: "Solidarité",
          description: "Secours, aides, prêts et accompagnement des membres.",
          icone: "solidarity",
          cartes: [
            {
              titre: "Secours et aides",
              description: "Suivre les aides accordées aux membres.",
              lien: "/decaissements",
              icone: "solidarity",
            },
            {
              titre: "Prêts investissement",
              description: "Consulter les prêts et remboursements associés.",
              lien: "/prets",
              icone: "loans",
            },
            {
              titre: "Remboursements",
              description: "Contrôler les retours attendus ou reçus.",
              lien: "/encaissements",
              icone: "receipt",
            },
            {
              titre: "Historique aides",
              description: "Revenir sur les sorties liées à la solidarité.",
              lien: "/decaissements",
              icone: "history",
            },
          ],
        },
        {
          titre: "Rapports et documents",
          description: "Exports, synthèses, documents et contrôle.",
          icone: "reports",
          cartes: [
            {
              titre: "Synthèse caisse",
              description: "Préparer une lecture claire des caisses.",
              lien: "/synthese-caisse",
              icone: "reports",
            },
            {
              titre: "Suivi global",
              description: "Analyser les mouvements consolidés.",
              lien: "/suivi-global",
              icone: "suivi",
            },
            {
              titre: "Documentation",
              description: "Documents du bureau, de l'association et dossiers privés.",
              lien: "/documentation",
              icone: "admin",
            },
            {
              titre: "Notifications système",
              description: "Suivre les messages et informations importantes.",
              lien: "/notifications",
              icone: "notifications",
            },
          ],
        },
      ]
    : [
        {
          titre: "Mon espace",
          description: "Accès simplifié aux informations utiles au membre.",
          icone: "dashboard",
          cartes: [
            {
              titre: "Dashboard",
              description: "Ma situation personnelle.",
              lien: "/dashboard",
              icone: "dashboard",
            },
            {
              titre: "Mes prêts",
              description: "Suivi de mes prêts et remboursements.",
              lien: "/prets",
              icone: "loans",
            },
            {
              titre: "Investissements",
              description: "Informations liées aux investissements.",
              lien: "/investissements",
              icone: "investment",
            },
            {
              titre: "Notifications",
              description: "Mes messages et alertes.",
              lien: "/notifications",
              icone: "notifications",
            },
          ],
        },
        {
          titre: "Association",
          description: "Informations générales accessibles aux membres.",
          icone: "members",
          cartes: [
            {
              titre: "Membres",
              description: "Annuaire des membres.",
              lien: "/membres",
              icone: "members",
            },
            {
              titre: "Documents",
              description: "Documents disponibles selon mes droits.",
              lien: "/documentation",
              icone: "reports",
            },
          ],
        },
      ];

  return (
    <AppShell>
      <div className="min-h-screen space-y-8 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100">
                <Sparkles className="h-4 w-4" />
                Centre d'opérations USC
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Bonjour {profil?.nom_complet || "Membre"}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                UN SEUL COEUR : PLUS HAUT, PLUS LOIN, PLUS FRÈRES !
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-400">Profil connecté</p>
              <p className="mt-2 text-xl font-semibold text-white">{role}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
                    profil?.statut_actif
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/30 bg-red-400/10 text-red-200"
                  }`}
                >
                  {profil?.statut_actif ? "Compte actif" : "Compte inactif"}
                </span>
                <span className="inline-flex rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-sm font-medium text-violet-200">
                  {canManage ? "Bureau" : "Membre"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {canManage && (
            <KpiCard
              titre="Solde caisse association"
              valeur={formatCurrency(soldeGlobal)}
              description="Solde réel des caisses de l'association."
              icone="caisse"
              href="/suivi-global"
            />
          )}

          {canManage && (
            <KpiCard
              titre="Encaissements du mois"
              valeur={formatCurrency(encaissementsMois)}
              description={`Mois en cours : ${encaissementMois?.statut || "non défini"}.`}
              icone="encaissement"
              href="/suivi-caisse-session"
            />
          )}

          <KpiCard
            titre="Membres"
            valeur={formatNumber(nbMembres)}
            description="Nombre de personnes référencées dans USC."
            icone="members"
            href="/membres"
          />

          {canManage && (
            <KpiCard
              titre="Retards"
              valeur={formatNumber(nbRetards)}
              description={`${formatCurrency(montantRetards)} à régulariser.`}
              icone="alerts"
              href="/suivi-global"
              danger={nbRetards > 0}
            />
          )}

          <KpiCard
            titre="Notifications"
            valeur={formatNumber(nbNotifications)}
            description="Notifications non lues."
            icone="notifications"
            href="/notifications"
            danger={nbNotifications > 0}
          />

          {canManage && (
            <KpiCard
              titre="Prêts en cours"
              valeur={formatNumber(nbPretsEnCours)}
              description={`${formatCurrency(restePrets)} restant à rembourser.`}
              icone="loans"
              href="/prets"
            />
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Actions rapides</h2>
              <p className="mt-1 text-sm text-slate-400">
                Les opérations les plus fréquentes sont accessibles immédiatement.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((card) => (
              <OperationLink key={`quick-${card.titre}`} card={card} />
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          {sections.map((section) => (
            <OperationSectionCard key={section.titre} section={section} />
          ))}
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
              <Bell className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white">Activité récente</h2>
              <p className="mt-1 text-sm text-slate-400">
                Cette zone est prête pour afficher ensuite les dernières opérations :
                encaissements, décaissements, corrections, ajouts de membres et notifications.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Link
                  href="/suivi-caisse-session"
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                >
                  Historique encaissements
                </Link>
                <Link
                  href="/decaissements"
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                >
                  Décaissements récents
                </Link>
                <Link
                  href="/notifications"
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                >
                  Notifications
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center">
          <p className="text-sm text-slate-400">
            Association Un Seul Coeur &bull; Centre d'opérations
          </p>
        </div>
      </div>
    </AppShell>
  );
}
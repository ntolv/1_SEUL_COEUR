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

type DashboardRubrique = {
  session_libelle: string;
  rubrique_nom: string;
  total_session: number;
};

type DashboardMembreSession = {
  session_libelle: string;
  rubrique_nom: string;
  montant_session: number;
};

type DashboardMembreSituation = {
  membre_id: string;
  cumul_tontine_grand_cahier: number;
  cumul_tontine_petit_cahier: number;
  cumul_anniversaire: number;
  cumul_repas: number;
  cumul_investissement: number;
  nb_prets: number;
  nb_prets_en_cours: number;
  nb_prets_soldes: number;
  total_pret: number;
  total_rembourse: number;
  reste_a_payer: number;
  retard_secours: number;
  retard_projet: number;
  retard_fond_roulement: number;
  montant_aides_secours: number;
};

type DashboardGlobal = {
  solde_caisse_investissements: number;
  solde_caisse_epargne_investisseurs: number;
  total_entrees_caisses: number;
  total_sorties_caisses: number;
  solde_global_caisses: number;
  nb_demandes: number;
  nb_demandes_en_attente: number;
  nb_demandes_acceptees: number;
  nb_demandes_refusees: number;
  nb_prets: number;
  nb_prets_en_cours: number;
  nb_prets_soldes: number;
  total_pret: number;
  total_rembourse: number;
  reste_global: number;
  nb_investisseurs: number;
  capital_total_investi: number;
  nb_bilans_annuels: number;
  capital_bilans: number;
  interets_generes: number;
  total_disponible: number;
  nb_decisions_en_attente: number;
  nb_decisions_reinvesti: number;
  nb_decisions_retire: number;
  nb_decisions_partiel: number;
  montant_total_reinvesti: number;
  montant_total_retire: number;
  nb_decisions_tracees: number;
  nb_decisions_tracees_reinvesti: number;
  nb_decisions_tracees_retire: number;
  nb_decisions_tracees_partiel: number;
};

function formatMontant(valeur: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valeur ?? 0));
}

function getInitiales(nom: string) {
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

type StatCardProps = {
  titre: string;
  valeur: string | number;
  sousValeur?: string;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "red" | "slate";
};

function StatCard({ titre, valeur, sousValeur, accent = "slate" }: StatCardProps) {
  const accentClasses =
    accent === "cyan"
      ? "border-cyan-400/20 bg-cyan-500/10"
      : accent === "violet"
      ? "border-violet-400/20 bg-violet-500/10"
      : accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10"
      : accent === "amber"
      ? "border-amber-400/20 bg-amber-500/10"
      : accent === "red"
      ? "border-red-400/20 bg-red-500/10"
      : "border-white/10 bg-slate-950/60";

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${accentClasses}`}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{titre}</div>
      <div className="mt-2 text-base font-semibold text-white sm:text-lg">{valeur}</div>
      {sousValeur ? <div className="mt-1 text-xs text-slate-400">{sousValeur}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<Profil | null>(null);
  const [sessionData, setSessionData] = useState<DashboardSession | null>(null);
  const [rubriques, setRubriques] = useState<DashboardRubrique[]>([]);
  const [contributions, setContributions] = useState<DashboardMembreSession[]>([]);
  const [situation, setSituation] = useState<DashboardMembreSituation | null>(null);
  const [globalAdmin, setGlobalAdmin] = useState<DashboardGlobal | null>(null);
  const [chargement, setChargement] = useState(true);
  const [deconnexion, setDeconnexion] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;

    async function charger() {
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

        const { data: profilData, error: profilError } = await supabase.rpc("fn_me");

        if (!actif) return;

        if (profilError) {
          setErreur(profilError.message);
          setChargement(false);
          return;
        }

        const profilCharge = profilData && profilData.length > 0 ? profilData[0] : null;
        setProfil(profilCharge);

        if (!profilCharge) {
          setErreur("Profil introuvable");
          setChargement(false);
          return;
        }

        const roleNormalise = normalizeRole(profilCharge.role);

        const { data: sessionBloc, error: sessionError } = await supabase.rpc("fn_dashboard_bloc1_session");
        if (!sessionError && sessionBloc && sessionBloc.length > 0) {
          setSessionData(sessionBloc[0]);
        }

        const { data: rubriquesData, error: rubriquesError } = await supabase.rpc("fn_dashboard_bloc1_rubriques");
        if (!rubriquesError && rubriquesData) {
          setRubriques(rubriquesData);
        }

        const { data: contributionsData, error: contributionsError } = await supabase.rpc("fn_dashboard_bloc2_membre_session");
        if (!contributionsError && contributionsData) {
          setContributions(contributionsData);
        }

        const { data: situationData, error: situationError } = await supabase.rpc("fn_dashboard_bloc3_membre_situation");
        if (!situationError && situationData && situationData.length > 0) {
          setSituation(situationData[0]);
        }

        if (["ADMIN", "PRESIDENT", "TRESORIER"].includes(roleNormalise)) {
          const { data: adminData, error: adminError } = await supabase.rpc("fn_dashboard_global_admin");
          if (!adminError && adminData && adminData.length > 0) {
            setGlobalAdmin(adminData[0]);
          }
        }

        setChargement(false);
      } catch {
        if (!actif) return;
        setErreur("Erreur lors du chargement des données");
        setChargement(false);
      }
    }

    charger();

    return () => {
      actif = false;
    };
  }, [router]);

  async function handleLogout() {
    setDeconnexion(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const roleNormalise = useMemo(() => normalizeRole(profil?.role), [profil?.role]);
  const estAdmin = ["ADMIN", "PRESIDENT", "TRESORIER"].includes(roleNormalise);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">
        {chargement ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-300 shadow-2xl backdrop-blur-xl sm:p-8">
            Chargement...
          </div>
        ) : erreur ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-5 text-red-200 shadow-2xl backdrop-blur-xl sm:p-6">
            {erreur}
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-emerald-500/10 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="relative shrink-0">
                    {profil?.photo_url ? (
                      <img
                        src={profil.photo_url}
                        alt={profil.nom_complet}
                        className="h-16 w-16 rounded-2xl border border-white/10 object-cover sm:h-20 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950 sm:h-20 sm:w-20 sm:text-xl">
                        {getInitiales(profil?.nom_complet || "")}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={() => {}}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-white sm:text-2xl">{profil?.nom_complet}</div>
                    <div className="mt-1 text-sm text-slate-300">
                      Tableau de synthèse personnel de l’association
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[11px] font-medium text-violet-200">
                        {profil?.role}
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

                <button
                  onClick={handleLogout}
                  disabled={deconnexion}
                  className="w-full rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-400/20 disabled:opacity-60 sm:w-auto"
                >
                  {deconnexion ? "Déconnexion..." : "Se déconnecter"}
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Téléphone</div>
                  <div className="mt-1 truncate">{profil?.telephone || "Non renseigné"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Email</div>
                  <div className="mt-1 truncate">{profil?.email || "Non renseigné"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => scrollToSection("session")}
                  className="shrink-0 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20"
                >
                  Session
                </button>
                <button
                  onClick={() => scrollToSection("contributions")}
                  className="shrink-0 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  Contributions
                </button>
                <button
                  onClick={() => scrollToSection("situation")}
                  className="shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-400/20"
                >
                  Situation
                </button>
                {estAdmin ? (
                  <button
                    onClick={() => scrollToSection("pilotage")}
                    className="shrink-0 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200 transition hover:bg-red-400/20"
                  >
                    Pilotage
                  </button>
                ) : null}
              </div>
            </div>

            <div id="session" className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-white sm:mb-6 sm:text-xl">Session du mois</h2>

              {sessionData ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard titre="Session" valeur={sessionData.session_libelle} accent="cyan" />
                  <StatCard titre="Inscrits" valeur={sessionData.total_inscrits} accent="violet" />
                  <StatCard titre="Contributeurs" valeur={sessionData.nb_contributeurs} accent="emerald" />
                  <StatCard titre="Total caisse" valeur={formatMontant(sessionData.total_caisse_session)} accent="amber" />
                </div>
              ) : (
                <div className="text-sm text-slate-400">Aucune session en cours</div>
              )}

              {rubriques.length > 0 ? (
                <div className="mt-5 sm:mt-6">
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.16em] text-slate-300">
                    Répartition par rubrique
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rubriques.map((rubrique, index) => (
                      <StatCard
                        key={`${rubrique.rubrique_nom}-${index}`}
                        titre={rubrique.rubrique_nom}
                        valeur={formatMontant(rubrique.total_session)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              id="contributions"
              className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6"
            >
              <h2 className="mb-4 text-lg font-semibold text-white sm:mb-6 sm:text-xl">Mes contributions</h2>

              {contributions.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {contributions.map((contribution, index) => (
                    <StatCard
                      key={`${contribution.rubrique_nom}-${index}`}
                      titre={contribution.rubrique_nom}
                      valeur={formatMontant(contribution.montant_session)}
                      sousValeur={contribution.session_libelle}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">Aucune contribution enregistrée pour cette session</div>
              )}
            </div>

            <div id="situation" className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-white sm:mb-6 sm:text-xl">Ma situation</h2>

              {situation ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard titre="Tontine grand cahier" valeur={formatMontant(situation.cumul_tontine_grand_cahier)} />
                  <StatCard titre="Tontine petit cahier" valeur={formatMontant(situation.cumul_tontine_petit_cahier)} />
                  <StatCard titre="Anniversaire" valeur={formatMontant(situation.cumul_anniversaire)} />
                  <StatCard titre="Repas" valeur={formatMontant(situation.cumul_repas)} />
                  <StatCard titre="Investissement" valeur={formatMontant(situation.cumul_investissement)} />
                  <StatCard
                    titre="Aides secours"
                    valeur={formatMontant(situation.montant_aides_secours)}
                    sousValeur={
                      Number(situation.montant_aides_secours) === 0 ? "Aides secours non encore alimentées" : undefined
                    }
                    accent={Number(situation.montant_aides_secours) === 0 ? "amber" : "slate"}
                  />
                  <StatCard titre="Total prêt" valeur={formatMontant(situation.total_pret)} accent="violet" />
                  <StatCard titre="Remboursé" valeur={formatMontant(situation.total_rembourse)} accent="emerald" />
                  <StatCard titre="Reste à payer" valeur={formatMontant(situation.reste_a_payer)} accent="red" />
                  <StatCard titre="Prêts en cours" valeur={situation.nb_prets_en_cours} accent="amber" />
                  <StatCard titre="Prêts soldés" valeur={situation.nb_prets_soldes} accent="emerald" />
                  <StatCard titre="Retard secours" valeur={formatMontant(situation.retard_secours)} accent="red" />
                  <StatCard titre="Retard projet" valeur={formatMontant(situation.retard_projet)} accent="red" />
                  <StatCard titre="Retard fond roulement" valeur={formatMontant(situation.retard_fond_roulement)} accent="red" />
                </div>
              ) : (
                <div className="text-sm text-slate-400">Aucune information disponible</div>
              )}
            </div>

            {estAdmin && globalAdmin ? (
              <div id="pilotage" className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
                <h2 className="mb-4 text-lg font-semibold text-white sm:mb-6 sm:text-xl">Pilotage</h2>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard
                    titre="Caisse investissements"
                    valeur={formatMontant(globalAdmin.solde_caisse_investissements)}
                    accent="cyan"
                  />
                  <StatCard
                    titre="Épargne investisseurs"
                    valeur={formatMontant(globalAdmin.solde_caisse_epargne_investisseurs)}
                    accent="violet"
                  />
                  <StatCard
                    titre="Prêts en cours"
                    valeur={globalAdmin.nb_prets_en_cours}
                    sousValeur={`Reste global ${formatMontant(globalAdmin.reste_global)}`}
                    accent="amber"
                  />
                  <StatCard
                    titre="Capital investi"
                    valeur={formatMontant(globalAdmin.capital_total_investi)}
                    sousValeur={`${globalAdmin.nb_investisseurs} investisseurs`}
                    accent="emerald"
                  />
                  <StatCard
                    titre="Intérêts générés"
                    valeur={formatMontant(globalAdmin.interets_generes)}
                    sousValeur={`Total disponible ${formatMontant(globalAdmin.total_disponible)}`}
                    accent="cyan"
                  />
                  <StatCard
                    titre="Décisions en attente"
                    valeur={globalAdmin.nb_decisions_en_attente}
                    sousValeur={`${globalAdmin.nb_bilans_annuels} bilans annuels`}
                    accent="red"
                  />
                  <StatCard titre="Entrées caisses" valeur={formatMontant(globalAdmin.total_entrees_caisses)} />
                  <StatCard titre="Sorties caisses" valeur={formatMontant(globalAdmin.total_sorties_caisses)} />
                  <StatCard titre="Solde global" valeur={formatMontant(globalAdmin.solde_global_caisses)} accent="emerald" />
                  <StatCard
                    titre="Demandes"
                    valeur={globalAdmin.nb_demandes}
                    sousValeur={`${globalAdmin.nb_demandes_en_attente} en attente`}
                  />
                  <StatCard titre="Prêts soldés" valeur={globalAdmin.nb_prets_soldes} accent="emerald" />
                  <StatCard titre="Total prêt" valeur={formatMontant(globalAdmin.total_pret)} accent="violet" />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
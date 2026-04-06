"use client";

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
  return nom
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
    async function charger() {
      setChargement(true);
      setErreur("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profilData, error: profilError } = await supabase.rpc("fn_me");

      if (profilError) {
        setErreur(profilError.message);
        setChargement(false);
        return;
      }

      const profilCharge = profilData && profilData.length > 0 ? profilData[0] : null;
      setProfil(profilCharge);

      if (!profilCharge) {
        setChargement(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.rpc("fn_dashboard_bloc1_session");
        if (!sessionError && sessionData && sessionData.length > 0) {
          setSessionData(sessionData[0]);
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

        if (["ADMIN", "PRESIDENT", "TRESORIER"].includes(profilCharge.role)) {
          const { data: adminData, error: adminError } = await supabase.rpc("fn_dashboard_global_admin");
          if (!adminError && adminData && adminData.length > 0) {
            setGlobalAdmin(adminData[0]);
          }
        }
      } catch (err) {
        setErreur("Erreur lors du chargement des données");
      }

      setChargement(false);
    }

    charger();
  }, [router]);

  async function handleLogout() {
    setDeconnexion(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {chargement ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            Chargement...
          </div>
        ) : erreur ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-red-200">
            {erreur}
          </div>
        ) : (
          <>
            <div id="profil" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="relative">
                  {profil?.photo_url ? (
                    <img
                      src={profil.photo_url}
                      alt={profil.nom_complet}
                      className="h-16 w-16 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950">
                      {getInitiales(profil?.nom_complet || "")}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={() => {}}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold">{profil?.nom_complet}</div>
                  <div className="mt-1 break-all text-sm text-slate-400">
                    {profil?.email || "Email non renseigné"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-200">
                      {profil?.role}
                    </span>

                    <span
                      className={
                        "rounded-full border px-2 py-0.5 text-[10px] " +
                        (profil?.statut_actif
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : "border-red-400/30 bg-red-400/10 text-red-200")
                      }
                    >
                      {profil?.statut_actif ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={deconnexion}
                  className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-400/20 disabled:opacity-60"
                >
                  {deconnexion ? "Déconnexion..." : "Se déconnecter"}
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <span className="text-slate-400">📞</span>
                  <span className="truncate">{profil?.telephone || "Non renseigné"}</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <span className="text-slate-400">✉️</span>
                  <span className="truncate">{profil?.email || "Non renseigné"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:justify-center">
                <button
                  onClick={() => scrollToSection("profil")}
                  className="flex-shrink-0 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20"
                >
                  Profil
                </button>
                <button
                  onClick={() => scrollToSection("session")}
                  className="flex-shrink-0 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-400/20"
                >
                  Session
                </button>
                <button
                  onClick={() => scrollToSection("contributions")}
                  className="flex-shrink-0 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  Mes contributions
                </button>
                <button
                  onClick={() => scrollToSection("situation")}
                  className="flex-shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-400/20"
                >
                  Ma situation
                </button>
                {["ADMIN", "PRESIDENT", "TRESORIER"].includes(profil?.role || "") && (
                  <button
                    onClick={() => scrollToSection("pilotage")}
                    className="flex-shrink-0 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200 transition hover:bg-red-400/20"
                  >
                    Pilotage
                  </button>
                )}
              </div>
            </div>

            <div id="session" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-6 text-xl font-semibold">Session du mois</h2>
              
              {sessionData ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Session</div>
                    <div className="mt-2 text-lg font-semibold">{sessionData.session_libelle}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Inscrits</div>
                    <div className="mt-2 text-lg font-semibold">{sessionData.total_inscrits}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Contributeurs</div>
                    <div className="mt-2 text-lg font-semibold">{sessionData.nb_contributeurs}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Total caisse</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(sessionData.total_caisse_session)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">Aucune session en cours</div>
              )}

              {rubriques.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Répartition par rubrique</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rubriques.map((rubrique, index) => (
                      <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                        <div className="text-sm text-slate-400">{rubrique.rubrique_nom}</div>
                        <div className="mt-2 text-lg font-semibold">{formatMontant(rubrique.total_session)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div id="contributions" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-6 text-xl font-semibold">Mes contributions</h2>
              
              {contributions.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {contributions.map((contribution, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="text-sm text-slate-400">{contribution.rubrique_nom}</div>
                      <div className="mt-2 text-lg font-semibold">{formatMontant(contribution.montant_session)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400">Aucune contribution enregistrée pour cette session</div>
              )}
            </div>

            <div id="situation" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-6 text-xl font-semibold">Ma situation</h2>
              
              {situation ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Tontine grand cahier</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.cumul_tontine_grand_cahier)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Tontine petit cahier</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.cumul_tontine_petit_cahier)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Anniversaire</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.cumul_anniversaire)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Repas</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.cumul_repas)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Investissement</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.cumul_investissement)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Aides secours</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.montant_aides_secours)}</div>
                    {Number(situation.montant_aides_secours) === 0 && (
                      <div className="mt-1 text-xs text-amber-400">Aides secours non encore alimentées</div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Total prêt</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.total_pret)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Remboursé</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.total_rembourse)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Reste à payer</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.reste_a_payer)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Prêts en cours</div>
                    <div className="mt-2 text-lg font-semibold">{situation.nb_prets_en_cours}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Prêts soldés</div>
                    <div className="mt-2 text-lg font-semibold">{situation.nb_prets_soldes}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Retard secours</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.retard_secours)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Retard projet</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.retard_projet)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Retard fond roulement</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(situation.retard_fond_roulement)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">Aucune information disponible</div>
              )}
            </div>

            {["ADMIN", "PRESIDENT", "TRESORIER"].includes(profil?.role || "") && globalAdmin && (
              <div id="pilotage" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <h2 className="mb-6 text-xl font-semibold">Pilotage</h2>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Caisse Investissements</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.solde_caisse_investissements)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Épargne investisseurs</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.solde_caisse_epargne_investisseurs)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Prêts en cours</div>
                    <div className="mt-2 text-lg font-semibold">{globalAdmin.nb_prets_en_cours}</div>
                    <div className="mt-1 text-xs text-slate-400">Reste global {formatMontant(globalAdmin.reste_global)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Capital investi</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.capital_total_investi)}</div>
                    <div className="mt-1 text-xs text-slate-400">{globalAdmin.nb_investisseurs} investisseurs</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Intérêts générés</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.interets_generes)}</div>
                    <div className="mt-1 text-xs text-slate-400">Total disponible {formatMontant(globalAdmin.total_disponible)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Décisions en attente</div>
                    <div className="mt-2 text-lg font-semibold">{globalAdmin.nb_decisions_en_attente}</div>
                    <div className="mt-1 text-xs text-slate-400">{globalAdmin.nb_bilans_annuels} bilans annuels</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Entrées caisses</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.total_entrees_caisses)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Sorties caisses</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.total_sorties_caisses)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Solde global</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.solde_global_caisses)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Demandes</div>
                    <div className="mt-2 text-lg font-semibold">{globalAdmin.nb_demandes}</div>
                    <div className="mt-1 text-xs text-slate-400">{globalAdmin.nb_demandes_en_attente} en attente</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Prêts soldés</div>
                    <div className="mt-2 text-lg font-semibold">{globalAdmin.nb_prets_soldes}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Total prêt</div>
                    <div className="mt-2 text-lg font-semibold">{formatMontant(globalAdmin.total_pret)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

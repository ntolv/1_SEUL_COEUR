"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

type Bloc1Session = {
  session_libelle: string;
  total_inscrits: number;
  nb_contributeurs: number;
  total_caisse_session: number;
};

type Bloc1Rubrique = {
  session_libelle: string;
  rubrique_nom: string;
  total_session: number;
};

type Bloc2Row = {
  session_libelle: string;
  rubrique_nom: string;
  montant_session: number;
};

type Bloc3Situation = {
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

function nettoyerTelephoneWhatsApp(telephone: string | null) {
  if (!telephone) return "";
  return telephone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

export default function DashboardPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<Profil | null>(null);
  const [dashboardGlobal, setDashboardGlobal] = useState<DashboardGlobal | null>(null);
  const [bloc1Session, setBloc1Session] = useState<Bloc1Session | null>(null);
  const [bloc1Rubriques, setBloc1Rubriques] = useState<Bloc1Rubrique[]>([]);
  const [bloc2Rows, setBloc2Rows] = useState<Bloc2Row[]>([]);
  const [bloc3, setBloc3] = useState<Bloc3Situation | null>(null);
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

      const [
        bloc1SessionRes,
        bloc1RubriquesRes,
        globalRes,
        bloc2Res,
        bloc3Res,
      ] = await Promise.all([
        supabase.rpc("fn_dashboard_bloc1_session"),
        supabase.rpc("fn_dashboard_bloc1_rubriques"),
        ["ADMIN", "PRESIDENT", "TRESORIER"].includes(profilCharge.role)
          ? supabase.rpc("fn_dashboard_global_admin")
          : Promise.resolve({ data: null, error: null } as any),
        profilCharge.role === "MEMBRE"
          ? supabase.rpc("fn_dashboard_bloc2_membre_session")
          : Promise.resolve({ data: null, error: null } as any),
        profilCharge.role === "MEMBRE"
          ? supabase.rpc("fn_dashboard_bloc3_membre_situation")
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      if (bloc1SessionRes.error) {
        setErreur(bloc1SessionRes.error.message);
        setChargement(false);
        return;
      }

      if (bloc1RubriquesRes.error) {
        setErreur(bloc1RubriquesRes.error.message);
        setChargement(false);
        return;
      }

      if (globalRes?.error) {
        setErreur(globalRes.error.message);
        setChargement(false);
        return;
      }

      if (bloc2Res?.error) {
        setErreur(bloc2Res.error.message);
        setChargement(false);
        return;
      }

      if (bloc3Res?.error) {
        setErreur(bloc3Res.error.message);
        setChargement(false);
        return;
      }

      setBloc1Session(
        bloc1SessionRes.data && bloc1SessionRes.data.length > 0
          ? bloc1SessionRes.data[0]
          : null
      );

      setBloc1Rubriques((bloc1RubriquesRes.data ?? []) as Bloc1Rubrique[]);

      if (["ADMIN", "PRESIDENT", "TRESORIER"].includes(profilCharge.role)) {
        setDashboardGlobal(globalRes.data && globalRes.data.length > 0 ? globalRes.data[0] : null);
      }

      if (profilCharge.role === "MEMBRE") {
        setBloc2Rows((bloc2Res.data ?? []) as Bloc2Row[]);
        setBloc3(bloc3Res.data && bloc3Res.data.length > 0 ? bloc3Res.data[0] : null);
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

  const whatsapp = nettoyerTelephoneWhatsApp(profil?.telephone || null);
  const isAdminLike = ["ADMIN", "PRESIDENT", "TRESORIER"].includes(profil?.role ?? "");
  const isMembre = (profil?.role ?? "") === "MEMBRE";

  const totalBloc2 = useMemo(() => {
    return bloc2Rows.reduce((sum, item) => sum + Number(item.montant_session ?? 0), 0);
  }, [bloc2Rows]);

  const totalRetardsMembre = useMemo(() => {
    return (
      Number(bloc3?.retard_secours ?? 0) +
      Number(bloc3?.retard_projet ?? 0) +
      Number(bloc3?.retard_fond_roulement ?? 0)
    );
  }, [bloc3]);

  const cartesGlobales = dashboardGlobal
    ? [
        {
          titre: "Caisse Investissements",
          valeur: formatMontant(dashboardGlobal.solde_caisse_investissements),
          sousTexte: "Solde actuel",
        },
        {
          titre: "Épargne investisseurs",
          valeur: formatMontant(dashboardGlobal.solde_caisse_epargne_investisseurs),
          sousTexte: "Solde actuel",
        },
        {
          titre: "Prêts en cours",
          valeur: String(dashboardGlobal.nb_prets_en_cours ?? 0),
          sousTexte: "Reste global " + formatMontant(dashboardGlobal.reste_global),
        },
        {
          titre: "Capital investi",
          valeur: formatMontant(dashboardGlobal.capital_total_investi),
          sousTexte: "Investisseurs " + String(dashboardGlobal.nb_investisseurs ?? 0),
        },
        {
          titre: "Intérêts générés",
          valeur: formatMontant(dashboardGlobal.interets_generes),
          sousTexte: "Total disponible " + formatMontant(dashboardGlobal.total_disponible),
        },
        {
          titre: "Décisions en attente",
          valeur: String(dashboardGlobal.nb_decisions_en_attente ?? 0),
          sousTexte: "Bilans annuels " + String(dashboardGlobal.nb_bilans_annuels ?? 0),
        },
      ]
    : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                Espace sécurisé
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Tableau de bord
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Vue personnalisée selon le rôle connecté.
              </p>
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
            {profil ? (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-start gap-4">
                    {profil.photo_url ? (
                      <img
                        src={profil.photo_url}
                        alt={profil.nom_complet}
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950">
                        {getInitiales(profil.nom_complet)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold">{profil.nom_complet}</div>
                      <div className="mt-1 break-all text-sm text-slate-400">
                        {profil.email || "Email non renseigné"}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-200">
                          {profil.role}
                        </span>

                        <span
                          className={
                            "rounded-full border px-2 py-0.5 text-[10px] " +
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

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      <span className="text-slate-400">📞</span>
                      <span className="truncate">{profil.telephone || "Non renseigné"}</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      <span className="text-slate-400">✉️</span>
                      <span className="truncate">{profil.email || "Non renseigné"}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {profil.telephone ? (
                      <a
                        href={`tel:${profil.telephone}`}
                        className="flex-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-center text-sm text-cyan-200 transition hover:bg-cyan-400/20"
                      >
                        Appeler
                      </a>
                    ) : null}

                    {profil.email ? (
                      <a
                        href={`mailto:${profil.email}`}
                        className="rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-sm text-violet-200 transition hover:bg-violet-400/20"
                        title="Envoyer un email"
                      >
                        ✉️
                      </a>
                    ) : null}

                    {whatsapp ? (
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
                        title="Ouvrir WhatsApp"
                      >
                        🟢
                      </a>
                    ) : null}
                  </div>
                </div>

                {isAdminLike ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    <h2 className="text-xl font-semibold">Accès rapides</h2>

                    <div className="mt-4 grid gap-3">
                      <Link
                        href="/notifications"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                      >
                        Ouvrir mes notifications
                      </Link>

                      <Link
                        href="/prets"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-400/10"
                      >
                        Accéder au module prêts
                      </Link>

                      <Link
                        href="/investissements"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
                      >
                        Accéder aux investissements
                      </Link>

                      <Link
                        href="/membres"
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-amber-400/30 hover:bg-amber-400/10"
                      >
                        Voir les membres
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    <h2 className="text-xl font-semibold">Mon espace membre</h2>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                        Votre tableau de bord affiche uniquement les informations utiles à votre suivi personnel.
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                        Utilisez le menu latéral pour accéder à vos modules autorisés : Membres, Prêts, Investissements et Notifications.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {bloc1Session ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">Bloc 1 · Session du mois</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Vision globale de la session {bloc1Session.session_libelle}
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                    {bloc1Session.session_libelle}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Total inscrits</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{bloc1Session.total_inscrits}</div>
                    <div className="mt-2 text-sm text-slate-300">Membres + préinscrits sans doublon</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Contributeurs du mois</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{bloc1Session.nb_contributeurs}</div>
                    <div className="mt-2 text-sm text-slate-300">Ayant contribué à la session</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 md:col-span-2">
                    <div className="text-sm text-slate-400">Total caisse session</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc1Session.total_caisse_session)}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">Montant total encaissé sur la session</div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {bloc1Rubriques.length > 0 ? (
                    bloc1Rubriques.map((item) => (
                      <div
                        key={item.rubrique_nom}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                      >
                        <div className="text-sm text-slate-400">{item.rubrique_nom}</div>
                        <div className="mt-3 text-2xl font-semibold text-white">
                          {formatMontant(item.total_session)}
                        </div>
                        <div className="mt-2 text-sm text-slate-300">Total session par rubrique</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300 md:col-span-2 xl:col-span-4">
                      Aucune donnée par rubrique disponible pour la session en cours.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {isMembre ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">Bloc 2 · Ma contribution de la session</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Détail de vos contributions sur la session en cours.
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                    Total {formatMontant(totalBloc2)}
                  </span>
                </div>

                {bloc2Rows.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {bloc2Rows.map((item) => (
                      <div
                        key={item.rubrique_nom}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                      >
                        <div className="text-sm text-slate-400">{item.rubrique_nom}</div>
                        <div className="mt-3 text-2xl font-semibold text-white">
                          {formatMontant(item.montant_session)}
                        </div>
                        <div className="mt-2 text-sm text-slate-300">Ma contribution du mois</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
                    Aucune contribution enregistrée pour vous sur la session en cours.
                  </div>
                )}
              </div>
            ) : null}

            {isMembre && bloc3 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <h2 className="mb-6 text-2xl font-semibold">Bloc 3 · Ma situation associative</h2>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Cumul Tontine Grand Cahier</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc3.cumul_tontine_grand_cahier)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Cumul Tontine Petit Cahier</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc3.cumul_tontine_petit_cahier)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Cumul Anniversaire</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc3.cumul_anniversaire)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Cumul Repas</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc3.cumul_repas)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Cumul Investissement</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc3.cumul_investissement)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Situation prêts</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {bloc3.nb_prets_en_cours}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      En cours · Reste à payer {formatMontant(bloc3.reste_a_payer)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Historique / demandes de prêt</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {bloc3.nb_prets}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      Total prêt {formatMontant(bloc3.total_pret)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Situation retards</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(totalRetardsMembre)}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      Secours {formatMontant(bloc3.retard_secours)} · Projet {formatMontant(bloc3.retard_projet)} · Fond de roulement {formatMontant(bloc3.retard_fond_roulement)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="text-sm text-slate-400">Aides caisse secours</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatMontant(bloc3.montant_aides_secours)}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      Total des aides secours déjà rattachées à votre situation.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isAdminLike && dashboardGlobal ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <h2 className="mb-6 text-2xl font-semibold">Indicateurs globaux validateurs</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {cartesGlobales.map((carte) => (
                    <div
                      key={carte.titre}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                    >
                      <div className="text-sm text-slate-400">{carte.titre}</div>
                      <div className="mt-3 text-2xl font-semibold">{carte.valeur}</div>
                      <div className="mt-2 text-sm text-slate-300">{carte.sousTexte}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

"use client";



import { useEffect, useState } from "react";

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



type DashboardMembre = {

  membre_id: string;

  nb_prets: number;

  nb_prets_en_cours: number;

  nb_prets_soldes: number;

  total_pret: number;

  total_rembourse: number;

  reste_a_payer: number;

  nb_remboursements: number;

  total_remboursements_effectues: number;

  nb_investissements: number;

  capital_investi: number;

  interets_generes: number;

  total_disponible: number;

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

  const [dashboardMembre, setDashboardMembre] = useState<DashboardMembre | null>(null);

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



      if (["ADMIN", "PRESIDENT", "TRESORIER"].includes(profilCharge.role)) {

        const { data, error } = await supabase.rpc("fn_dashboard_global_admin");



        if (error) {

          setErreur(error.message);

          setChargement(false);

          return;

        }



        setDashboardGlobal(data && data.length > 0 ? data[0] : null);

      } else {

        const { data, error } = await supabase.rpc("fn_dashboard_membre_connecte");



        if (error) {

          setErreur(error.message);

          setChargement(false);

          return;

        }



        setDashboardMembre(data && data.length > 0 ? data[0] : null);

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



  const cartesMembre = dashboardMembre

    ? [

        {

          titre: "Mes prêts",

          valeur: String(dashboardMembre.nb_prets ?? 0),

          sousTexte: "En cours " + String(dashboardMembre.nb_prets_en_cours ?? 0),

        },

        {

          titre: "Reste à payer",

          valeur: formatMontant(dashboardMembre.reste_a_payer),

          sousTexte: "Remboursé " + formatMontant(dashboardMembre.total_rembourse),

        },

        {

          titre: "Mes investissements",

          valeur: String(dashboardMembre.nb_investissements ?? 0),

          sousTexte: "Capital " + formatMontant(dashboardMembre.capital_investi),

        },

        {

          titre: "Mes gains",

          valeur: formatMontant(dashboardMembre.interets_generes),

          sousTexte: "Disponible " + formatMontant(dashboardMembre.total_disponible),

        },

      ]

    : [];



  const whatsapp = nettoyerTelephoneWhatsApp(profil?.telephone || null);



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

              </div>

            ) : null}



            {dashboardGlobal ? (

              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">

                <h2 className="mb-6 text-2xl font-semibold">Indicateurs globaux</h2>

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



            {dashboardMembre ? (

              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">

                <h2 className="mb-6 text-2xl font-semibold">Mon espace membre</h2>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                  {cartesMembre.map((carte) => (

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


"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type SessionGlobaleRow = {
  session_id: string;
  annee: number;
  mois: number;
  statut: string | null;
  session_libelle: string | null;
  total_encaisse_session: number | null;
  nb_membres_uniques: number | null;
  nb_preinscrits_uniques: number | null;
  nb_personnes_uniques: number | null;
};

type RubriqueGlobaleRow = {
  session_id: string;
  annee: number;
  mois: number;
  statut: string | null;
  session_libelle: string | null;
  rubrique_id: string | number | null;
  rubrique_code: string | null;
  rubrique_nom: string | null;
  total_encaisse_rubrique: number | null;
  nb_personnes_concernees: number | null;
};

type MembreSessionRow = {
  membre_id: string;
  session_id: string;
  annee: number;
  mois: number;
  statut: string | null;
  session_libelle: string | null;
  total_encaisse_session: number | null;
};

type MembreRubriqueRow = {
  membre_id: string;
  session_id: string;
  annee: number;
  mois: number;
  statut: string | null;
  session_libelle: string | null;
  rubrique_id: string | number | null;
  rubrique_code: string | null;
  rubrique_nom: string | null;
  montant_verse: number | null;
};

function euro(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function statutClasse(statut: string | null | undefined) {
  const s = (statut ?? "").trim().toUpperCase();
  if (s.includes("FERM") || s.includes("CLOT") || s.includes("CLOS")) {
    return "border border-red-700/40 bg-red-500/10 text-red-200";
  }
  if (!s || s === "INCONNU") {
    return "border border-slate-700/40 bg-slate-500/10 text-slate-200";
  }
  return "border border-emerald-700/40 bg-emerald-500/10 text-emerald-200";
}

export default function SyntheseCaissePage() {
  const [savingPdf, setSavingPdf] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionGlobale, setSessionGlobale] = useState<SessionGlobaleRow | null>(null);
  const [rubriquesGlobales, setRubriquesGlobales] = useState<RubriqueGlobaleRow[]>([]);
  const [membreSession, setMembreSession] = useState<MembreSessionRow | null>(null);
  const [membreRubriques, setMembreRubriques] = useState<MembreRubriqueRow[]>([]);

  async function charger() {
    try {
      setLoading(true);
      setError(null);

      const [
        sessionGlobaleRes,
        rubriquesGlobalesRes,
        membreSessionRes,
        membreRubriquesRes,
      ] = await Promise.all([
        supabase
          .from("v_synthese_caisse_session_globale")
          .select("*")
          .limit(1)
          .maybeSingle(),

        supabase
          .from("v_synthese_caisse_session_rubriques")
          .select("*")
          .order("rubrique_nom", { ascending: true }),

        supabase
          .from("v_synthese_caisse_membre_session")
          .select("*")
          .limit(1)
          .maybeSingle(),

        supabase
          .from("v_synthese_caisse_membre_rubriques")
          .select("*")
          .order("rubrique_nom", { ascending: true }),
      ]);

      if (sessionGlobaleRes.error) throw new Error(sessionGlobaleRes.error.message);
      if (rubriquesGlobalesRes.error) throw new Error(rubriquesGlobalesRes.error.message);
      if (membreSessionRes.error) throw new Error(membreSessionRes.error.message);
      if (membreRubriquesRes.error) throw new Error(membreRubriquesRes.error.message);

      setSessionGlobale(sessionGlobaleRes.data ? {
        session_id: sessionGlobaleRes.data.session_id,
        annee: toNumber(sessionGlobaleRes.data.annee),
        mois: toNumber(sessionGlobaleRes.data.mois),
        statut: sessionGlobaleRes.data.statut ?? null,
        session_libelle: sessionGlobaleRes.data.session_libelle ?? null,
        total_encaisse_session: toNumber(sessionGlobaleRes.data.total_encaisse_session),
        nb_membres_uniques: toNumber(sessionGlobaleRes.data.nb_membres_uniques),
        nb_preinscrits_uniques: toNumber(sessionGlobaleRes.data.nb_preinscrits_uniques),
        nb_personnes_uniques: toNumber(sessionGlobaleRes.data.nb_personnes_uniques),
      } : null);

      setRubriquesGlobales(((rubriquesGlobalesRes.data ?? []) as any[]).map((row) => ({
        session_id: row.session_id,
        annee: toNumber(row.annee),
        mois: toNumber(row.mois),
        statut: row.statut ?? null,
        session_libelle: row.session_libelle ?? null,
        rubrique_id: row.rubrique_id ?? null,
        rubrique_code: row.rubrique_code ?? null,
        rubrique_nom: row.rubrique_nom ?? null,
        total_encaisse_rubrique: toNumber(row.total_encaisse_rubrique),
        nb_personnes_concernees: toNumber(row.nb_personnes_concernees),
      })));

      setMembreSession(membreSessionRes.data ? {
        membre_id: membreSessionRes.data.membre_id,
        session_id: membreSessionRes.data.session_id,
        annee: toNumber(membreSessionRes.data.annee),
        mois: toNumber(membreSessionRes.data.mois),
        statut: membreSessionRes.data.statut ?? null,
        session_libelle: membreSessionRes.data.session_libelle ?? null,
        total_encaisse_session: toNumber(membreSessionRes.data.total_encaisse_session),
      } : null);

      setMembreRubriques(((membreRubriquesRes.data ?? []) as any[]).map((row) => ({
        membre_id: row.membre_id,
        session_id: row.session_id,
        annee: toNumber(row.annee),
        mois: toNumber(row.mois),
        statut: row.statut ?? null,
        session_libelle: row.session_libelle ?? null,
        rubrique_id: row.rubrique_id ?? null,
        rubrique_code: row.rubrique_code ?? null,
        rubrique_nom: row.rubrique_nom ?? null,
        montant_verse: toNumber(row.montant_verse),
      })));
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement de la synthèse caisse.");
      setSessionGlobale(null);
      setRubriquesGlobales([]);
      setMembreSession(null);
      setMembreRubriques([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  const sessionLabel =
    sessionGlobale?.session_libelle ??
    (sessionGlobale ? `${String(sessionGlobale.mois).padStart(2, "0")}/${sessionGlobale.annee}` : "-");

  const statut = sessionGlobale?.statut ?? "INCONNU";
  const totalCaisse = sessionGlobale?.total_encaisse_session ?? 0;
  const totalMembre = membreSession?.total_encaisse_session ?? 0;

  function imprimerPdf() {
    const ancienTitre = document.title;
    const titre = `Synthese-caisse-${sessionLabel.replace("/", "-")}`;
    document.title = titre;
    window.print();
    setTimeout(() => {
      document.title = ancienTitre;
    }, 300);
  }

  async function handleSavePdfDocumentation() {
    try {
      setSavingPdf(true);

      const jspdfModule = await import("jspdf/dist/jspdf.umd.min.js");
      const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF;

      if (!jsPDF) {
        throw new Error("jsPDF introuvable.");
      }

      const pdf = new jsPDF("p", "mm", "a4");

      let y = 12;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Synthèse caisse", 10, y);

      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Session : ${sessionLabel}`, 10, y);
      y += 6;
      pdf.text(`Statut : ${statut}`, 10, y);
      y += 8;

      pdf.setFont("helvetica", "bold");
      pdf.text("Bloc membre connecté", 10, y);
      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.text(`Total de ma contribution : ${euro(totalMembre)}`, 10, y);
      y += 8;

      const lignes = membreRubriques.filter((row) => toNumber(row.montant_verse) > 0);

      if (lignes.length === 0) {
        pdf.text("Aucune contribution trouvée pour le membre connecté.", 10, y);
        y += 6;
      } else {
        lignes.forEach((row) => {
          if (y > 280) {
            pdf.addPage();
            y = 12;
          }

          pdf.text(`- ${row.rubrique_nom ?? row.rubrique_code ?? "Rubrique"} : ${euro(row.montant_verse)}`, 12, y);
          y += 6;
        });
      }

      y += 6;

      if (y > 270) {
        pdf.addPage();
        y = 12;
      }

      pdf.setFont("helvetica", "bold");
      pdf.text("Résumé global de la session", 10, y);
      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.text(`Montant total encaissé du mois : ${euro(totalCaisse)}`, 10, y);
      y += 6;

      const blob = pdf.output("blob");

      const cleanDate = new Date().toISOString().slice(0, 10);
      const fileName = `synthese-caisse-${cleanDate}.pdf`;
      const storagePath = `documents/${Date.now()}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documentation")
        .upload(storagePath, blob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        throw new Error("Upload échoué : " + uploadError.message);
      }

      const { data: folderId, error: folderError } = await supabase.rpc(
        "fn_get_print_target_folder_id",
        { p_target: "MEMBRE" }
      );

      if (folderError || !folderId) {
        throw new Error("Erreur dossier : " + (folderError?.message ?? "Dossier introuvable"));
      }

      const { error: insertError } = await supabase
        .from("documentation_documents")
        .insert({
          folder_id: folderId,
          nom_original: fileName,
          nom_stockage: fileName,
          chemin_storage: storagePath,
          mime_type: "application/pdf",
          taille_bytes: blob.size,
          source_type: "IMPRESSION_APP",
        });

      if (insertError) {
        throw new Error("Erreur enregistrement : " + insertError.message);
      }

      alert("✅ PDF simple enregistré dans votre dossier membre.");
    } catch (error: any) {
      console.error(error);
      alert("Erreur enregistrement PDF : " + (error?.message ?? "Erreur inconnue"));
    } finally {
      setSavingPdf(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6 print:bg-white print:p-0">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)] print-card print-text-dark">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">Synthèse caisse</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Caisse du mois</h1>
              <p className="mt-2 text-sm text-slate-300">
                Vue globale des encaissements du mois et contribution du membre connecté.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  onClick={imprimerPdf}
                  className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25"
                >
                  Imprimer / PDF
                </button>

                <button
                  type="button"
                  onClick={handleSavePdfDocumentation}
                  disabled={savingPdf}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPdf ? "Enregistrement..." : "📄 Enregistrer en PDF"}
                </button>
              </div>

              <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] px-4 py-3 text-sm text-slate-200 print-card">
                <div className="font-medium text-white">Session {sessionLabel}</div>
                <div className="mt-1">
                  Statut :
                  <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${statutClasse(statut)}`}>
                    {statut}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 text-slate-300">
            Chargement...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-900/40 bg-red-950/30 p-6 text-red-200">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Montant global</p>
                <h2 className="mt-3 text-xl font-semibold text-white">Montant total encaissé du mois</h2>
                <div className="mt-6 text-4xl font-bold text-white">{euro(totalCaisse)}</div>
              </div>

              <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Ma session</p>
                <h2 className="mt-3 text-xl font-semibold text-white">Total de ma contribution</h2>
                <div className="mt-6 text-4xl font-bold text-white">{euro(totalMembre)}</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Répartition globale</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Encaissements du mois par rubrique</h2>
              </div>

              {rubriquesGlobales.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
                  Aucune donnée globale disponible pour la session du mois.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rubriquesGlobales.map((row) => {
                    const nbPersonnes = toNumber(row.nb_personnes_concernees);

                    return (
                      <div
                        key={`${row.rubrique_code ?? row.rubrique_nom ?? "rubrique"}-${row.session_id}`}
                        className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4"
                      >
                        <div className="text-sm text-cyan-200">{row.rubrique_nom ?? row.rubrique_code ?? "-"}</div>
                        <div className="mt-3 text-2xl font-semibold text-white">{euro(row.total_encaisse_rubrique)}</div>
                        <div className="mt-3 text-sm text-slate-300">
                          {nbPersonnes} personne{nbPersonnes > 1 ? "s" : ""} concernée{nbPersonnes > 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Membre connecté</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Contribution de la session du membre connecté par rubrique
                </h2>
              </div>

              {membreRubriques.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
                  Aucune contribution trouvée pour le membre connecté sur la session du mois.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {membreRubriques.map((row) => (
                    <div
                      key={`${row.session_id}-${row.rubrique_code ?? row.rubrique_nom ?? "rubrique"}`}
                      className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4"
                    >
                      <div className="text-sm text-cyan-200">{row.rubrique_nom ?? row.rubrique_code ?? "-"}</div>
                      <div className="mt-3 text-2xl font-semibold text-white">{euro(row.montant_verse)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

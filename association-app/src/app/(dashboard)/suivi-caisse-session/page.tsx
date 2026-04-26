"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  type_personne: "MEMBRE" | "PREINSCRIT";
  personne_id: string;
  nom_complet: string;
  rubrique_id: number;
  rubrique_nom: string;
  montant_attendu: number | null;
  montant_encaisse: number | null;
  montant_retard: number | null;
};

type Groupe = {
  personne_id: string;
  nom_complet: string;
  type_personne: "MEMBRE" | "PREINSCRIT";
  rows: Row[];
  total_attendu: number;
  total_encaisse: number;
  total_retard: number;
  statut: "À jour" | "Partiel" | "En retard";
};

function formatMontant(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getStatut(attendu: number, encaisse: number, retard: number): "À jour" | "Partiel" | "En retard" {
  if (retard <= 0) return "À jour";
  if (encaisse > 0 && encaisse < attendu) return "Partiel";
  return "En retard";
}

function getStatutClasses(statut: Groupe["statut"]) {
  if (statut === "À jour") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (statut === "Partiel") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-200";
}

export default function SuiviCaisseSessionPage() {
  const [savingPdf, setSavingPdf] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("v_caisse_session_suivi")
        .select("*")
        .order("nom_complet", { ascending: true })
        .order("rubrique_nom", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error(error);
        setErrorMsg(error.message || "Erreur de chargement");
        setRows([]);
        setLoading(false);
        return;
      }

      setRows((data || []) as Row[]);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo<Groupe[]>(() => {
    const map = new Map<string, Groupe>();

    for (const row of rows) {
      const key = row.personne_id;

      if (!map.has(key)) {
        map.set(key, {
          personne_id: row.personne_id,
          nom_complet: row.nom_complet,
          type_personne: row.type_personne,
          rows: [],
          total_attendu: 0,
          total_encaisse: 0,
          total_retard: 0,
          statut: "À jour",
        });
      }

      const current = map.get(key)!;
      current.rows.push(row);
      current.total_attendu += Number(row.montant_attendu ?? 0);
      current.total_encaisse += Number(row.montant_encaisse ?? 0);
      current.total_retard += Number(row.montant_retard ?? 0);
    }

    const result = Array.from(map.values()).map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) =>
        a.rubrique_nom.localeCompare(b.rubrique_nom, "fr", { sensitivity: "base" })
      ),
      statut: getStatut(group.total_attendu, group.total_encaisse, group.total_retard),
    }));

    result.sort((a, b) => {
      if (b.total_retard !== a.total_retard) {
        return b.total_retard - a.total_retard;
      }

      return a.nom_complet.localeCompare(b.nom_complet, "fr", { sensitivity: "base" });
    });

    return result;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = normalize(search);

    if (!q) return grouped;

    return grouped.filter((g) => {
      const cible = normalize(`${g.nom_complet} ${g.type_personne} ${g.statut}`);
      return cible.includes(q);
    });
  }, [grouped, search]);

  const totalGlobalAttendu = filtered.reduce((sum, g) => sum + g.total_attendu, 0);
  const totalGlobalEncaisse = filtered.reduce((sum, g) => sum + g.total_encaisse, 0);
  const totalGlobalRetard = filtered.reduce((sum, g) => sum + g.total_retard, 0);
  const nbPersonnes = filtered.length;
  const nbEnRetard = filtered.filter((g) => g.statut !== "À jour").length;

  async function handleSavePdfDocumentation() {
    try {
      setSavingPdf(true);

      const jspdfModule = await import("jspdf");
      const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF;

      if (!jsPDF) {
        throw new Error("jsPDF introuvable.");
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const date = new Date().toISOString().slice(0, 10);

      let y = 12;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Suivi caisse session", 10, y);

      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Date : ${date}`, 10, y);
      y += 6;
      pdf.text(`Personnes : ${nbPersonnes}`, 10, y);
      y += 6;
      pdf.text(`Total encaissé : ${formatMontant(totalGlobalEncaisse)} EUR`, 10, y);
      y += 6;
      pdf.text(`Total retard : ${formatMontant(totalGlobalRetard)} EUR`, 10, y);
      y += 10;

      const groupesAvecParticipation = filtered
        .map((groupe) => ({
          ...groupe,
          rows: groupe.rows.filter((row) => Number(row.montant_encaisse ?? 0) > 0),
        }))
        .filter((groupe) => groupe.rows.length > 0);

      if (groupesAvecParticipation.length === 0) {
        pdf.text("Aucune participation encaissée sur cette session.", 10, y);
        y += 6;
      }

      for (const groupe of groupesAvecParticipation) {
        if (y > 260) {
          pdf.addPage();
          y = 12;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${groupe.nom_complet} (${groupe.type_personne})`, 10, y);
        y += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        for (const row of groupe.rows) {
          if (y > 280) {
            pdf.addPage();
            y = 12;
          }

          pdf.text(
            `- ${row.rubrique_nom} : ${formatMontant(Number(row.montant_encaisse ?? 0))} EUR`,
            12,
            y
          );
          y += 5;
        }

        y += 4;
      }

      const blob = pdf.output("blob");
      const fileName = `suivi-caisse-session-${date}.pdf`;
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
        { p_target: "BUREAU" }
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

      alert("✅ PDF léger enregistré dans Documentation Bureau.");
    } catch (error: any) {
      console.error(error);
      alert("Erreur PDF : " + (error?.message ?? "Erreur inconnue"));
    } finally {
      setSavingPdf(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 print:space-y-4">
        <div className="no-print rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Suivi caisse session</h1>
              <p className="mt-1 text-sm text-slate-300">
                Contrôle de la caisse de la session active, trié en priorité par retard décroissant.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSavePdfDocumentation}
                disabled={savingPdf}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPdf ? "Enregistrement..." : "📄 PDF léger"}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
              >
                Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Personnes</div>
              <div className="mt-2 text-xl font-bold text-white">{nbPersonnes}</div>
            </div>

            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
              <div className="text-xs uppercase tracking-wide text-rose-200">En retard / partiel</div>
              <div className="mt-2 text-xl font-bold text-rose-100">{nbEnRetard}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Total attendu</div>
              <div className="mt-2 text-xl font-bold text-white">{formatMontant(totalGlobalAttendu)} €</div>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <div className="text-xs uppercase tracking-wide text-cyan-200">Total encaissé</div>
              <div className="mt-2 text-xl font-bold text-cyan-100">{formatMontant(totalGlobalEncaisse)} €</div>
            </div>

            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
              <div className="text-xs uppercase tracking-wide text-rose-200">Total retard</div>
              <div className="mt-2 text-xl font-bold text-rose-100">{formatMontant(totalGlobalRetard)} €</div>
            </div>
          </div>

          <div className="mt-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre, un préinscrit ou un statut..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
          </div>
        </div>

        <div className="print-only hidden print:block">
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Suivi caisse session</h1>
                <p className="mt-1 text-sm">État d'impression de la session active.</p>
              </div>

              <div className="text-right text-sm">
                <div>Personnes : {nbPersonnes}</div>
                <div>Total encaissé : {formatMontant(totalGlobalEncaisse)} €</div>
                <div>Total retard : {formatMontant(totalGlobalRetard)} €</div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
            Chargement en cours...
          </div>
        )}

        {!loading && errorMsg && (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6 text-rose-100">
            Erreur : {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && filtered.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
            Aucun résultat trouvé.
          </div>
        )}

        {!loading &&
          !errorMsg &&
          filtered.map((groupe) => (
            <section
              key={groupe.personne_id}
              className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-[0_0_24px_rgba(15,23,42,0.35)] print:break-inside-avoid print:rounded-2xl print:border-slate-300 print:bg-white print:p-4 print:text-slate-900 print:shadow-none"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xl font-bold text-white print:text-slate-900">{groupe.nom_complet}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 print:border-slate-300 print:bg-slate-100 print:text-slate-700">
                      {groupe.type_personne}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${getStatutClasses(groupe.statut)} print:border-slate-300 print:bg-slate-100 print:text-slate-700`}
                    >
                      {groupe.statut}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 print:border-slate-300 print:bg-slate-50">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Attendu</div>
                    <div className="mt-2 text-lg font-bold text-white print:text-slate-900">
                      {formatMontant(groupe.total_attendu)} €
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 print:border-slate-300 print:bg-slate-50">
                    <div className="text-xs uppercase tracking-wide text-cyan-200 print:text-slate-500">Encaissé</div>
                    <div className="mt-2 text-lg font-bold text-cyan-100 print:text-slate-900">
                      {formatMontant(groupe.total_encaisse)} €
                    </div>
                  </div>

                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 print:border-slate-300 print:bg-slate-50">
                    <div className="text-xs uppercase tracking-wide text-rose-200 print:text-slate-500">Retard</div>
                    <div className="mt-2 text-lg font-bold text-rose-100 print:text-slate-900">
                      {formatMontant(groupe.total_retard)} €
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {groupe.rows.map((row) => {
                  const attendu = Number(row.montant_attendu ?? 0);
                  const encaisse = Number(row.montant_encaisse ?? 0);
                  const retard = Number(row.montant_retard ?? 0);
                  const statutRubrique = getStatut(attendu, encaisse, retard);

                  return (
                    <div
                      key={`${groupe.personne_id}-${row.rubrique_id}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 print:rounded-xl print:border-slate-300 print:bg-slate-50"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="font-semibold text-white print:text-slate-900">{row.rubrique_nom}</div>
                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatutClasses(statutRubrique as Groupe["statut"])} print:border-slate-300 print:bg-white print:text-slate-700`}
                            >
                              {statutRubrique}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3 print:border-slate-300 print:bg-white">
                            <div className="text-[11px] uppercase tracking-wide text-slate-400">Attendu</div>
                            <div className="mt-1 text-sm font-semibold text-white print:text-slate-900">
                              {formatMontant(attendu)} €
                            </div>
                          </div>

                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 print:border-slate-300 print:bg-white">
                            <div className="text-[11px] uppercase tracking-wide text-cyan-200 print:text-slate-500">Encaissé</div>
                            <div className="mt-1 text-sm font-semibold text-cyan-100 print:text-slate-900">
                              {formatMontant(encaisse)} €
                            </div>
                          </div>

                          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 print:border-slate-300 print:bg-white">
                            <div className="text-[11px] uppercase tracking-wide text-rose-200 print:text-slate-500">Retard</div>
                            <div className="mt-1 text-sm font-semibold text-rose-100 print:text-slate-900">
                              {formatMontant(retard)} €
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

        <style jsx global>{`
          @media print {
            html,
            body {
              background: #ffffff !important;
            }

            .no-print,
            aside,
            header {
              display: none !important;
            }

            .print-only {
              display: block !important;
            }

            main {
              padding: 0 !important;
            }
          }
        `}</style>
      </div>
    </AppShell>
  );
}



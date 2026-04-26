"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type GlobalRow = {
  session_id: string;
  annee: number;
  mois: number;
  session_libelle: string;
  nb_personnes: number;
  nb_en_retard_partiel: number;
  total_attendu: number | null;
  total_encaisse: number | null;
  total_retard: number | null;
};

type PersonRow = {
  session_id: string;
  annee: number;
  mois: number;
  session_libelle: string;
  type_personne: "MEMBRE" | "PREINSCRIT";
  personne_id: string;
  nom_complet: string;
  total_attendu: number | null;
  total_encaisse: number | null;
  total_retard: number | null;
  statut: "À jour" | "Partiel" | "En retard";
};

type DetailRow = {
  session_id: string;
  annee: number;
  mois: number;
  session_libelle: string;
  type_personne: "MEMBRE" | "PREINSCRIT";
  personne_id: string;
  nom_complet: string;
  rubrique_id: number | null;
  rubrique_nom: string;
  montant_attendu: number | null;
  montant_encaisse: number | null;
  montant_retard: number | null;
};

function formatMontant(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getStatutClasses(statut: "À jour" | "Partiel" | "En retard") {
  if (statut === "À jour") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (statut === "Partiel") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-200";
}

function getDetailStatut(
  row: DetailRow
): "À jour" | "Partiel" | "En retard" {
  const attendu = Number(row.montant_attendu ?? 0);
  const encaisse = Number(row.montant_encaisse ?? 0);
  const retard = Number(row.montant_retard ?? 0);

  if (retard <= 0) return "À jour";
  if (encaisse > 0 && encaisse < attendu) return "Partiel";
  return "En retard";
}

export default function SuiviCaisseSessionPage() {
  const [globalRow, setGlobalRow] = useState<GlobalRow | null>(null);
  const [personRows, setPersonRows] = useState<PersonRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedPersonKey, setSelectedPersonKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorMsg("");

      const [globalRes, personsRes, detailsRes] = await Promise.all([
        supabase
          .from("v_caisse_session_blocs_global")
          .select("*")
          .limit(1),
        supabase
          .from("v_caisse_session_blocs_personnes")
          .select("*")
          .order("total_retard", { ascending: false })
          .order("nom_complet", { ascending: true }),
        supabase
          .from("v_caisse_session_suivi")
          .select("*")
          .order("nom_complet", { ascending: true })
          .order("rubrique_nom", { ascending: true }),
      ]);

      if (!mounted) return;

      const globalError = globalRes.error;
      const personsError = personsRes.error;
      const detailsError = detailsRes.error;

      if (globalError || personsError || detailsError) {
        const message =
          globalError?.message ||
          personsError?.message ||
          detailsError?.message ||
          "Erreur de chargement";
        setErrorMsg(message);
        setGlobalRow(null);
        setPersonRows([]);
        setDetailRows([]);
        setLoading(false);
        return;
      }

      const loadedGlobal = (globalRes.data ?? [])[0] ?? null;
      const loadedPersons = (personsRes.data ?? []) as PersonRow[];
      const loadedDetails = (detailsRes.data ?? []) as DetailRow[];

      setGlobalRow(loadedGlobal as GlobalRow | null);
      setPersonRows(loadedPersons);
      setDetailRows(loadedDetails);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const personOptions = useMemo(() => {
    return personRows.map((person) => ({
      key: `${person.type_personne}::${person.personne_id}`,
      label: `${person.nom_complet} - ${person.type_personne}`,
      personne_id: person.personne_id,
      type_personne: person.type_personne,
      nom_complet: person.nom_complet,
    }));
  }, [personRows]);

  const selectedPerson = useMemo(() => {
    if (!selectedPersonKey) return null;
    return (
      personOptions.find((person) => person.key === selectedPersonKey) ?? null
    );
  }, [personOptions, selectedPersonKey]);

  const filteredPersons = useMemo(() => {
    const q = normalize(searchText);

    return personRows.filter((person) => {
      const personKey = `${person.type_personne}::${person.personne_id}`;

      if (selectedPersonKey && personKey !== selectedPersonKey) {
        return false;
      }

      if (!q) return true;

      const cible = normalize(
        `${person.nom_complet} ${person.type_personne} ${person.statut} ${person.session_libelle}`
      );

      return cible.includes(q);
    });
  }, [personRows, searchText, selectedPersonKey]);

  const detailsByPerson = useMemo(() => {
    const map = new Map<string, DetailRow[]>();

    for (const row of detailRows) {
      const key = `${row.type_personne}::${row.personne_id}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(row);
    }

    for (const [key, rows] of map.entries()) {
      map.set(
        key,
        [...rows].sort((a, b) =>
          a.rubrique_nom.localeCompare(b.rubrique_nom, "fr", {
            sensitivity: "base",
          })
        )
      );
    }

    return map;
  }, [detailRows]);

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
              <div className="mt-2 text-xl font-bold text-white">
                {globalRow?.nb_personnes ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
              <div className="text-xs uppercase tracking-wide text-rose-200">
                En retard / partiel
              </div>
              <div className="mt-2 text-xl font-bold text-rose-100">
                {globalRow?.nb_en_retard_partiel ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Total attendu
              </div>
              <div className="mt-2 text-xl font-bold text-white">
                {formatMontant(globalRow?.total_attendu)} €
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <div className="text-xs uppercase tracking-wide text-cyan-200">
                Total encaissé
              </div>
              <div className="mt-2 text-xl font-bold text-cyan-100">
                {formatMontant(globalRow?.total_encaisse)} €
              </div>
            </div>

            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
              <div className="text-xs uppercase tracking-wide text-rose-200">
                Total retard
              </div>
              <div className="mt-2 text-xl font-bold text-rose-100">
                {formatMontant(globalRow?.total_retard)} €
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[320px_1fr]">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Recherche en liste par membre / préinscrit
              </label>
              <select
                value={selectedPersonKey}
                onChange={(e) => setSelectedPersonKey(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              >
                <option value="">Tous</option>
                {personOptions.map((person) => (
                  <option key={person.key} value={person.key}>
                    {person.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Recherche texte
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Rechercher un membre, un préinscrit ou un statut..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </div>
          </div>
        </div>

        <div className="print-only hidden print:block">
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Suivi caisse session</h1>
                <p className="mt-1 text-sm">
                  {globalRow?.session_libelle
                    ? `Session imprimée : ${globalRow.session_libelle}`
                    : "État d'impression de la session active."}
                </p>
              </div>

              <div className="text-right text-sm">
                <div>Personnes : {globalRow?.nb_personnes ?? 0}</div>
                <div>Total encaissé : {formatMontant(globalRow?.total_encaisse)} €</div>
                <div>Total retard : {formatMontant(globalRow?.total_retard)} €</div>
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

        {!loading && !errorMsg && filteredPersons.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
            Aucun résultat trouvé.
          </div>
        )}

        {!loading &&
          !errorMsg &&
          filteredPersons.map((person) => {
            const personKey = `${person.type_personne}::${person.personne_id}`;
            const personDetails = detailsByPerson.get(personKey) ?? [];

            return (
              <section
                key={personKey}
                className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-[0_0_24px_rgba(15,23,42,0.35)] print:break-inside-avoid print:rounded-2xl print:border-slate-300 print:bg-white print:p-4 print:text-slate-900 print:shadow-none"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xl font-bold text-white print:text-slate-900">
                      {person.nom_complet}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 print:border-slate-300 print:bg-slate-100 print:text-slate-700">
                        {person.type_personne}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${getStatutClasses(
                          person.statut
                        )} print:border-slate-300 print:bg-slate-100 print:text-slate-700`}
                      >
                        {person.statut}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 print:border-slate-300 print:bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Attendu
                      </div>
                      <div className="mt-2 text-lg font-bold text-white print:text-slate-900">
                        {formatMontant(person.total_attendu)} €
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 print:border-slate-300 print:bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-cyan-200 print:text-slate-500">
                        Encaissé
                      </div>
                      <div className="mt-2 text-lg font-bold text-cyan-100 print:text-slate-900">
                        {formatMontant(person.total_encaisse)} €
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 print:border-slate-300 print:bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-rose-200 print:text-slate-500">
                        Retard
                      </div>
                      <div className="mt-2 text-lg font-bold text-rose-100 print:text-slate-900">
                        {formatMontant(person.total_retard)} €
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {personDetails.map((detail, idx) => {
                    const detailStatut = getDetailStatut(detail);

                    return (
                      <div
                        key={`${personKey}-${detail.rubrique_id ?? "rubrique"}-${idx}`}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 print:rounded-xl print:border-slate-300 print:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="font-semibold text-white print:text-slate-900">
                              {detail.rubrique_nom}
                            </div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatutClasses(
                                  detailStatut
                                )} print:border-slate-300 print:bg-white print:text-slate-700`}
                              >
                                {detailStatut}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 print:border-slate-300 print:bg-white">
                              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                Attendu
                              </div>
                              <div className="mt-1 text-sm font-semibold text-white print:text-slate-900">
                                {formatMontant(detail.montant_attendu)} €
                              </div>
                            </div>

                            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 print:border-slate-300 print:bg-white">
                              <div className="text-[11px] uppercase tracking-wide text-cyan-200 print:text-slate-500">
                                Encaissé
                              </div>
                              <div className="mt-1 text-sm font-semibold text-cyan-100 print:text-slate-900">
                                {formatMontant(detail.montant_encaisse)} €
                              </div>
                            </div>

                            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 print:border-slate-300 print:bg-white">
                              <div className="text-[11px] uppercase tracking-wide text-rose-200 print:text-slate-500">
                                Retard
                              </div>
                              <div className="mt-1 text-sm font-semibold text-rose-100 print:text-slate-900">
                                {formatMontant(detail.montant_retard)} €
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

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

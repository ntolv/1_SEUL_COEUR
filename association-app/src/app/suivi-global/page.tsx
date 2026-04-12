"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type EncaissementRow = {
  personne_id: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
  mois_reference: string;
  rubrique_id: number | null;
  rubrique_code: string | null;
  rubrique_nom: string;
  montant_attendu: number;
  montant_encaisse: number;
  reste: number;
  statut: "A jour" | "En retard";
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getMonthTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function SuiviGlobalPage() {
  const [rows, setRows] = useState<EncaissementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchPersonne, setSearchPersonne] = useState("");
  const [filterType, setFilterType] = useState<"TOUS" | "MEMBRE" | "PREINSCRIT">("TOUS");
  const [filterRubrique, setFilterRubrique] = useState("TOUS");

  async function charger() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("v_encaissements_suivi_global")
        .select("*")
        .order("mois_reference", { ascending: false })
        .order("nom_complet", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setRows((data as EncaissementRow[]) || []);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  const rubriques = useMemo(() => {
    const uniqueRubriques = Array.from(
      new Set(rows.map((r) => r.rubrique_nom).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return ["TOUS", ...uniqueRubriques];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (searchPersonne) {
        const search = normalize(searchPersonne);
        const nom = normalize(row.nom_complet);
        const telephone = normalize(row.telephone);
        const email = normalize(row.email);

        if (
          !nom.includes(search) &&
          !telephone.includes(search) &&
          !email.includes(search)
        ) {
          return false;
        }
      }

      if (filterType !== "TOUS" && row.type_personne !== filterType) {
        return false;
      }

      if (filterRubrique !== "TOUS" && row.rubrique_nom !== filterRubrique) {
        return false;
      }

      return true;
    });
  }, [rows, searchPersonne, filterType, filterRubrique]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, EncaissementRow[]>();

    filteredRows.forEach((row) => {
      if (!groups.has(row.personne_id)) {
        groups.set(row.personne_id, []);
      }
      groups.get(row.personne_id)!.push(row);
    });

    return Array.from(groups.entries()).map(([personneId, personRows]) => ({
      personneId,
      nomComplet: personRows[0].nom_complet,
      telephone: personRows[0].telephone,
      email: personRows[0].email,
      typePersonne: personRows[0].type_personne,
      rows: [...personRows].sort((a, b) => {
        const aTime = getMonthTime(a.mois_reference);
        const bTime = getMonthTime(b.mois_reference);

        if (aTime !== bTime) {
          return bTime - aTime;
        }

        return a.rubrique_nom.localeCompare(b.rubrique_nom);
      }),
    }));
  }, [filteredRows]);

  const stats = useMemo(() => {
    const totalAttendu = filteredRows.reduce((sum, row) => sum + Number(row.montant_attendu || 0), 0);
    const totalEncaisse = filteredRows.reduce((sum, row) => sum + Number(row.montant_encaisse || 0), 0);
    const totalReste = filteredRows.reduce((sum, row) => sum + Number(row.reste || 0), 0);
    const nombreAjour = filteredRows.filter((row) => row.statut === "A jour").length;
    const nombreEnRetard = filteredRows.filter((row) => row.statut === "En retard").length;

    return {
      totalAttendu,
      totalEncaisse,
      totalReste,
      nombreAjour,
      nombreEnRetard,
      nombreTotal: filteredRows.length,
    };
  }, [filteredRows]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                Vision globale
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Suivi global des encaissements
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Vue d&apos;ensemble de tous les encaissements par rubrique
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Rechercher une personne
              </label>
              <input
                type="text"
                value={searchPersonne}
                onChange={(e) => setSearchPersonne(e.target.value)}
                placeholder="Nom, téléphone ou email..."
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Type de personne
              </label>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as "TOUS" | "MEMBRE" | "PREINSCRIT")
                }
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="TOUS">Tous</option>
                <option value="MEMBRE">Membres</option>
                <option value="PREINSCRIT">Préinscrits</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Rubrique
              </label>
              <select
                value={filterRubrique}
                onChange={(e) => setFilterRubrique(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {rubriques.map((rubrique) => (
                  <option key={rubrique} value={rubrique}>
                    {rubrique}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchPersonne("");
                  setFilterType("TOUS");
                  setFilterRubrique("TOUS");
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-400">Total attendu</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {stats.totalAttendu.toLocaleString()} FCFA
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-400">Total encaissé</div>
            <div className="mt-2 text-2xl font-bold text-green-400">
              {stats.totalEncaisse.toLocaleString()} FCFA
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-400">Reste à payer</div>
            <div className="mt-2 text-2xl font-bold text-orange-400">
              {stats.totalReste.toLocaleString()} FCFA
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-400">À jour</div>
            <div className="mt-2 text-2xl font-bold text-cyan-400">
              {stats.nombreAjour}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-400">En retard</div>
            <div className="mt-2 text-2xl font-bold text-red-400">
              {stats.nombreEnRetard}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-300">Chargement...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">Erreur: {error}</div>
          ) : groupedRows.length === 0 ? (
            <div className="p-8 text-center text-slate-300">
              Aucun résultat trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">
                      Personne
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">
                      Type
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">
                      Rubrique
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                      Attendu
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                      Encaissé
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">
                      Reste
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-300">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedRows.map((groupe) => (
                    <React.Fragment key={groupe.personneId}>
                      {groupe.rows.map((row, index) => (
                        <tr
                          key={`${row.personne_id}-${row.mois_reference}-${row.rubrique_id ?? row.rubrique_nom}-${index}`}
                          className="hover:bg-white/5"
                        >
                          <td className="px-6 py-4">
                            {index === 0 && (
                              <div>
                                <div className="font-medium text-white">
                                  {groupe.nomComplet}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {groupe.telephone}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {index === 0 && (
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                  groupe.typePersonne === "MEMBRE"
                                    ? "bg-cyan-400/20 text-cyan-300"
                                    : "bg-purple-400/20 text-purple-300"
                                }`}
                              >
                                {groupe.typePersonne}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-white">
                            {row.rubrique_nom}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-white">
                            {Number(row.montant_attendu).toLocaleString()} FCFA
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-green-400">
                            {Number(row.montant_encaisse).toLocaleString()} FCFA
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-orange-400">
                            {Number(row.reste).toLocaleString()} FCFA
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                row.statut === "A jour"
                                  ? "bg-green-400/20 text-green-300"
                                  : "bg-red-400/20 text-red-300"
                              }`}
                            >
                              {row.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

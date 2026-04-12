"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type EncaissementRow = {
  personne_id: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
  mois_reference: Date;
  rubrique_id: string | null;
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

export default function SuiviGlobalPage() {
  const [rows, setRows] = useState<EncaissementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les filtres
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

      setRows(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  // Récupérer la liste des rubriques uniques pour le filtre
  const rubriques = useMemo(() => {
    const uniqueRubriques = Array.from(new Set(rows.map(r => r.rubrique_nom))).sort();
    return ["TOUS", ...uniqueRubriques];
  }, [rows]);

  // Filtrer les données selon les critères
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Filtre par personne
      if (searchPersonne) {
        const search = normalize(searchPersonne);
        const nom = normalize(row.nom_complet);
        const telephone = normalize(row.telephone);
        const email = normalize(row.email);
        
        if (!nom.includes(search) && !telephone?.includes(search) && !email?.includes(search)) {
          return false;
        }
      }

      // Filtre par type de personne
      if (filterType !== "TOUS" && row.type_personne !== filterType) {
        return false;
      }

      // Filtre par rubrique
      if (filterRubrique !== "TOUS" && row.rubrique_nom !== filterRubrique) {
        return false;
      }

      return true;
    });
  }, [rows, searchPersonne, filterType, filterRubrique]);

  // Regrouper par personne pour l'affichage
  const groupedRows = useMemo(() => {
    const groups = new Map<string, EncaissementRow[]>();
    
    filteredRows.forEach(row => {
      if (!groups.has(row.personne_id)) {
        groups.set(row.personne_id, []);
      }
      groups.get(row.personne_id)!.push(row);
    });

    return Array.from(groups.entries()).map(([personneId, rows]) => ({
      personneId,
      nomComplet: rows[0].nom_complet,
      telephone: rows[0].telephone,
      email: rows[0].email,
      typePersonne: rows[0].type_personne,
      rows: rows.sort((a, b) => {
        // Trier par mois décroissant puis par rubrique
        if (a.mois_reference.getTime() !== b.mois_reference.getTime()) {
          return b.mois_reference.getTime() - a.mois_reference.getTime();
        }
        return a.rubrique_nom.localeCompare(b.rubrique_nom);
      })
    }));
  }, [filteredRows]);

  // Calculs globaux
  const stats = useMemo(() => {
    const totalAttendu = filteredRows.reduce((sum, row) => sum + row.montant_attendu, 0);
    const totalEncaisse = filteredRows.reduce((sum, row) => sum + row.montant_encaisse, 0);
    const totalReste = totalAttendu - totalEncaisse;
    const nombreAjour = filteredRows.filter(row => row.statut === "A jour").length;
    const nombreEnRetard = filteredRows.filter(row => row.statut === "En retard").length;

    return {
      totalAttendu,
      totalEncaisse,
      totalReste,
      nombreAjour,
      nombreEnRetard,
      nombreTotal: filteredRows.length
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
                Vue d'ensemble de tous les encaissements par rubrique
              </p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rechercher une personne
              </label>
              <input
                type="text"
                value={searchPersonne}
                onChange={(e) => setSearchPersonne(e.target.value)}
                placeholder="Nom, téléphone ou email..."
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type de personne
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="TOUS">Tous</option>
                <option value="MEMBRE">Membres</option>
                <option value="PREINSCRIT">Préinscrits</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rubrique
              </label>
              <select
                value={filterRubrique}
                onChange={(e) => setFilterRubrique(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {rubriques.map(rubrique => (
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
                className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded-lg text-white hover:bg-slate-600 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

        {/* Tableau des résultats */}
        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-300">
              Chargement...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">
              Erreur: {error}
            </div>
          ) : groupedRows.length === 0 ? (
            <div className="p-8 text-center text-slate-300">
              Aucun résultat trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Personne</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Type</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Rubrique</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300 text-right">Attendu</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300 text-right">Encaissé</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300 text-right">Reste</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedRows.map((groupe) => (
                    <React.Fragment key={groupe.personneId}>
                      {groupe.rows.map((row, index) => (
                        <tr key={`${row.personne_id}-${row.rubrique_id}`} className="hover:bg-white/5">
                          <td className="px-6 py-4">
                            {index === 0 && (
                              <div>
                                <div className="font-medium text-white">{groupe.nomComplet}</div>
                                <div className="text-sm text-slate-400">{groupe.telephone}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {index === 0 && (
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                groupe.typePersonne === "MEMBRE" 
                                  ? "bg-cyan-400/20 text-cyan-300" 
                                  : "bg-purple-400/20 text-purple-300"
                              }`}>
                                {groupe.typePersonne}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-white">{row.rubrique_nom}</td>
                          <td className="px-6 py-4 text-sm text-right text-white">
                            {row.montant_attendu.toLocaleString()} FCFA
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-green-400">
                            {row.montant_encaisse.toLocaleString()} FCFA
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-orange-400">
                            {row.reste.toLocaleString()} FCFA
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              row.statut === "A jour"
                                ? "bg-green-400/20 text-green-300"
                                : "bg-red-400/20 text-red-300"
                            }`}>
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

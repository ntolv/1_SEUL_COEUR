"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  membre_nom: string | null;
  rubrique_nom: string | null;
  montant_attendu: number | null;
  montant_encaisse: number | null;
  reste: number | null;
  statut_paiement: string | null;
};

function euro(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function getStatutClasses(statut: string | null | undefined) {
  switch ((statut ?? "").toUpperCase()) {
    case "A_JOUR":
      return "border-emerald-700/40 bg-emerald-500/10 text-emerald-200";
    case "PARTIEL":
      return "border-amber-700/40 bg-amber-500/10 text-amber-200";
    case "NON_PAYE":
      return "border-red-700/40 bg-red-500/10 text-red-200";
    case "ENCAISSE":
      return "border-cyan-700/40 bg-cyan-500/10 text-cyan-200";
    default:
      return "border-slate-700/40 bg-slate-500/10 text-slate-300";
  }
}

export default function SuiviContributionsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Row[]>([]);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc(
          "fn_suivi_contributions_membres"
        );

        if (error) {
          throw new Error(error.message);
        }

        setData((data ?? []) as Row[]);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "Erreur de chargement."
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    void chargerDonnees();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">
                Situation globale
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Suivi de la situation de tous les membres
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Tous les membres, toutes les rubriques, attendus et encaissements.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] px-4 py-3 text-sm text-slate-200">
              {data.length} ligne{data.length > 1 ? "s" : ""} trouvée
              {data.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Chargement...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
            <div className="rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-red-200">
              {error}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-center text-slate-300">
              Aucune donnée trouvée.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[28px] border border-cyan-900/40 bg-[#04112b] shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#081735] text-slate-200">
                <tr className="border-b border-cyan-900/40">
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                    Membre
                  </th>
                  <th className="px-4 py-4 text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                    Rubrique
                  </th>
                  <th className="px-4 py-4 text-right text-xs uppercase tracking-[0.14em] text-slate-400">
                    Attendu
                  </th>
                  <th className="px-4 py-4 text-right text-xs uppercase tracking-[0.14em] text-slate-400">
                    Encaissé
                  </th>
                  <th className="px-4 py-4 text-right text-xs uppercase tracking-[0.14em] text-slate-400">
                    Reste
                  </th>
                  <th className="px-4 py-4 text-center text-xs uppercase tracking-[0.14em] text-slate-400">
                    Statut
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={`${row.membre_nom ?? "membre"}-${row.rubrique_nom ?? "rubrique"}-${index}`}
                    className="border-b border-cyan-900/20 bg-[#04112b] hover:bg-[#0a1838]"
                  >
                    <td className="px-4 py-4 text-white font-medium">
                      {row.membre_nom ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-200">
                      {row.rubrique_nom ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-right text-white font-semibold">
                      {euro(row.montant_attendu)}
                    </td>
                    <td className="px-4 py-4 text-right text-emerald-300 font-semibold">
                      {euro(row.montant_encaisse)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-300 font-semibold">
                      {euro(row.reste)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatutClasses(
                          row.statut_paiement
                        )}`}
                      >
                        {row.statut_paiement ?? "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
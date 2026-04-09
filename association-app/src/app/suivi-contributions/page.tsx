"use client";

import { useEffect, useMemo, useState } from "react";
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

function getStatutPriority(statut: string | null | undefined) {
  switch ((statut ?? "").toUpperCase()) {
    case "NON_PAYE":
      return 1;
    case "PARTIEL":
      return 2;
    case "SANS_ATTENDU":
      return 3;
    case "ENCAISSE":
      return 4;
    case "A_JOUR":
      return 5;
    default:
      return 6;
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
        setError(e instanceof Error ? e.message : "Erreur de chargement.");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    void chargerDonnees();
  }, []);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const statutCompare =
        getStatutPriority(a.statut_paiement) -
        getStatutPriority(b.statut_paiement);

      if (statutCompare !== 0) return statutCompare;

      const resteA = Number(a.reste ?? 0);
      const resteB = Number(b.reste ?? 0);
      if (resteB !== resteA) return resteB - resteA;

      const membreA = a.membre_nom ?? "";
      const membreB = b.membre_nom ?? "";
      const membreCompare = membreA.localeCompare(membreB, "fr");
      if (membreCompare !== 0) return membreCompare;

      const rubriqueA = a.rubrique_nom ?? "";
      const rubriqueB = b.rubrique_nom ?? "";
      return rubriqueA.localeCompare(rubriqueB, "fr");
    });
  }, [data]);

  const totalEncaisse = useMemo(() => {
    return data.reduce((sum, row) => sum + Number(row.montant_encaisse ?? 0), 0);
  }, [data]);

  const totalAttendu = useMemo(() => {
    return data.reduce((sum, row) => sum + Number(row.montant_attendu ?? 0), 0);
  }, [data]);

  const totalReste = useMemo(() => {
    return data.reduce((sum, row) => sum + Number(row.reste ?? 0), 0);
  }, [data]);

  const nbMembres = useMemo(() => {
    const uniques = new Set(
      data
        .map((row) => (row.membre_nom ?? "").trim())
        .filter((value) => value.length > 0)
    );
    return uniques.size;
  }, [data]);

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
                Suivi global de la situation de tous les membres
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

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Total encaissé
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-300">
                {euro(totalEncaisse)}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Total attendu
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {euro(totalAttendu)}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Reste global
              </div>
              <div className="mt-2 text-2xl font-bold text-red-300">
                {euro(totalReste)}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Membres concernés
              </div>
              <div className="mt-2 text-2xl font-bold text-cyan-300">
                {nbMembres}
              </div>
            </div>
          </div>
        )}

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
        ) : sortedData.length === 0 ? (
          <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-center text-slate-300">
              Aucune donnée trouvée.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedData.map((row, index) => (
              <div
                key={`${row.membre_nom ?? "membre"}-${row.rubrique_nom ?? "rubrique"}-${index}`}
                className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.16)]"
              >
                <div className="grid gap-4 md:grid-cols-6">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Membre
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {row.membre_nom ?? "-"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Rubrique
                    </div>
                    <div className="text-sm font-medium text-white">
                      {row.rubrique_nom ?? "-"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Attendu
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {euro(row.montant_attendu)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Encaissé
                    </div>
                    <div className="text-sm font-semibold text-emerald-300">
                      {euro(row.montant_encaisse)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Reste
                    </div>
                    <div className="text-sm font-semibold text-red-300">
                      {euro(row.reste)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Statut
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatutClasses(
                        row.statut_paiement
                      )}`}
                    >
                      {row.statut_paiement ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
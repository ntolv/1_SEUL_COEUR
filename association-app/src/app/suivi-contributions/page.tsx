"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type ContributionRow = {
  membre_nom: string;
  rubrique_nom: string;
  montant_attendu: number;
  montant_encaisse: number;
  reste: number;
  statut_paiement: string;
};

type MembreGroup = {
  membre_nom: string;
  contributions: ContributionRow[];
};

function euro(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function SuiviContributionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContributionRow[]>([]);

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc("fn_suivi_contributions_membres");

      if (error) throw new Error(error.message);

      setData((data ?? []) as ContributionRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  // Grouper les contributions par membre
  const groupedData: MembreGroup[] = data.reduce((acc: MembreGroup[], contribution) => {
    const existingGroup = acc.find(g => g.membre_nom === contribution.membre_nom);
    
    if (existingGroup) {
      existingGroup.contributions.push(contribution);
    } else {
      acc.push({
        membre_nom: contribution.membre_nom,
        contributions: [contribution]
      });
    }
    
    return acc;
  }, []);

  function getStatutColor(statut: string) {
    switch (statut?.toLowerCase()) {
      case 'payÃ©':
      case 'paye':
        return 'text-emerald-200';
      case 'partiel':
        return 'text-amber-200';
      case 'impayÃ©':
      case 'impaye':
        return 'text-red-200';
      default:
        return 'text-slate-300';
    }
  }

  function getStatutBg(statut: string) {
    switch (statut?.toLowerCase()) {
      case 'payÃ©':
      case 'paye':
        return 'bg-emerald-500/10 border-emerald-700/40';
      case 'partiel':
        return 'bg-amber-500/10 border-amber-700/40';
      case 'impayÃ©':
      case 'impaye':
        return 'bg-red-500/10 border-red-700/40';
      default:
        return 'bg-slate-500/10 border-slate-700/40';
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">
                Suivi des contributions
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Suivi global des membres
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Vue dÃ©taillÃ©e des contributions par membre et par rubrique.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] px-4 py-3 text-sm text-slate-200">
              {data.length} contribution{data.length > 1 ? "s" : ""} trouvÃ©e{data.length > 1 ? "s" : ""}
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
        ) : (
          <div className="space-y-6">
            {groupedData.length === 0 ? (
              <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
                <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300 text-center">
                  Aucune contribution trouvÃ©e.
                </div>
              </div>
            ) : (
              groupedData.map((membre) => (
                <div key={membre.membre_nom} className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {membre.membre_nom}
                    </h2>
                    <div className="text-sm text-slate-300">
                      {membre.contributions.length} contribution{membre.contributions.length > 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {membre.contributions.map((contribution, idx) => (
                      <div
                        key={`${membre.membre_nom}-${contribution.rubrique_nom}-${idx}`}
                        className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-5">
                          <div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-1">
                              Rubrique
                            </div>
                            <div className="text-sm font-medium text-white">
                              {contribution.rubrique_nom}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-1">
                              Attendu
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {euro(contribution.montant_attendu)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-1">
                              EncaissÃ©
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {euro(contribution.montant_encaisse)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-1">
                              Reste
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {euro(contribution.reste)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 mb-1">
                              Statut
                            </div>
                            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatutBg(contribution.statut_paiement)} ${getStatutColor(contribution.statut_paiement)}`}>
                              {contribution.statut_paiement}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}


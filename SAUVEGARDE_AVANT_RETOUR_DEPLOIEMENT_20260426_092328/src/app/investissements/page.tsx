"use client";

import AppShell from "@/components/layout/AppShell";

export default function InvestissementsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            Module
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Investissements
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Gestion des investissements des membres. Étape suivante : affichage des capitaux et intérêts.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

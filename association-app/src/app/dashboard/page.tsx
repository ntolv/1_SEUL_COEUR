"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

function formatMontant(valeur: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valeur ?? 0));
}

export default function DashboardPage() {
  const router = useRouter();

  const [profil, setProfil] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase.rpc("fn_me");
      const p = data?.[0];
      setProfil(p);

      const { data: s } = await supabase.rpc("fn_dashboard_bloc1_session");
      setSessionData(s?.[0]);

      setChargement(false);
    }

    load();
  }, [router]);

  if (chargement) {
    return (
      <AppShell>
        <div className="p-4 text-slate-300">Chargement...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4 p-4">

        {/* PROFIL COMPACT */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="text-base font-semibold">{profil?.nom_complet}</div>
          <div className="text-xs text-slate-400">{profil?.email}</div>

          <div className="mt-2 flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-violet-500/20 text-violet-200">
              {profil?.role}
            </span>
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200">
              Actif
            </span>
          </div>
        </div>

        {/* SESSION COMPACTE 🔥 */}
        {sessionData && (
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <div className="text-sm text-slate-400">Session en cours</div>

            <div className="mt-2 text-lg font-semibold">
              {sessionData.session_libelle}
            </div>

            <div className="mt-3 flex justify-between text-sm">
              <span>👥 {sessionData.total_inscrits}</span>
              <span>💰 {sessionData.nb_contributeurs}</span>
              <span>💵 {formatMontant(sessionData.total_caisse_session)}</span>
            </div>
          </div>
        )}

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push("/membres")} className="p-3 rounded-xl bg-cyan-500/20">
            👥 Membres
          </button>
          <button onClick={() => router.push("/encaissements")} className="p-3 rounded-xl bg-emerald-500/20">
            💵 Encaisser
          </button>
          <button onClick={() => router.push("/prets")} className="p-3 rounded-xl bg-violet-500/20">
            💰 Prêts
          </button>
          <button onClick={() => router.push("/notifications")} className="p-3 rounded-xl bg-amber-500/20">
            🔔 Notifications
          </button>
        </div>

      </div>
    </AppShell>
  );
}


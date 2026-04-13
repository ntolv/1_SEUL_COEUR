"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Version = {
  version_code: number;
  version_name: string;
  titre: string;
  message: string;
  url_update: string;
  obligatoire: boolean;
};

export default function MiseAJourPage() {
  const [version, setVersion] = useState<Version | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("fn_app_version_active");

      if (data && data.length > 0) {
        setVersion(data[0]);
      }
    }

    load();
  }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-4xl mb-4">🚀</div>

          <h1 className="text-2xl font-semibold">
            {version?.titre || "Mise à jour disponible"}
          </h1>

          <div className="mt-2 text-sm text-slate-400">
            Version {version?.version_name}
          </div>

          <div className="mt-6 text-slate-300 whitespace-pre-line">
            {version?.message}
          </div>

          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = "/page-accueil"}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white"
            >
              Plus tard
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white"
            >
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
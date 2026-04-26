"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

function euro(v) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(v ?? 0));
}

export default function Page() {

  return (
    <AppShell>
      <div className="p-6 space-y-6">

        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Imprimer
          </button>
        </div>

        <div className="bg-white text-black p-6 rounded-xl">
          <h1 className="text-2xl font-bold">Synthèse caisse</h1>
          <p>Contenu de la page pour impression</p>
        </div>

      </div>
    </AppShell>
  );
}


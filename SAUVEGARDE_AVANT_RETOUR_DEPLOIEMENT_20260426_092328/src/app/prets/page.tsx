"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

function formatMontant(valeur: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valeur ?? 0));
}

export default function PretsPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    const { data } = await supabase.rpc("fn_dashboard_membre_connecte");
    setDashboard(data?.[0] || null);
    setChargement(false);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setErreur("");
    setSuccess("");

    const { error } = await supabase.from("pret_demandes").insert({
      montant: Number(montant),
      motif: motif,
      statut: "EN_ATTENTE"
    });

    if (error) {
      setErreur(error.message);
      return;
    }

    setSuccess("Demande envoyée avec succès ✅");
    setMontant("");
    setMotif("");
    setShowForm(false);
  }

  return (
    <AppShell>
      <div className="space-y-6">

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-semibold">Mes prêts</h1>

          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-4 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-black"
          >
            Demander un prêt
          </button>
        </div>

        {showForm && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              <input
                type="number"
                placeholder="Montant"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900/60"
                required
              />

              <textarea
                placeholder="Motif de la demande"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900/60"
                required
              />

              <button className="w-full bg-green-500 p-3 rounded-xl">
                Envoyer la demande
              </button>

            </form>
          </div>
        )}

        {erreur && <div className="text-red-400">{erreur}</div>}
        {success && <div className="text-green-400">{success}</div>}

      </div>
    </AppShell>
  );
}

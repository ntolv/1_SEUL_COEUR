"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type MembreRow = {
  id: string;
  nom_complet: string;
  email: string | null;
  role: string;
  statut_actif: boolean;
  auth_user_id: string | null;
};

type ApiResult = {
  ok: boolean;
  message?: string;
  motDePasseProvisoire?: string;
  membre?: {
    id: string;
    nom_complet: string;
    email: string | null;
  };
};

export default function AdminMotDePasseProvisoirePage() {
  const [membres, setMembres] = useState<MembreRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [motDePasseProvisoire, setMotDePasseProvisoire] = useState("");

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("membres")
        .select("id, nom_complet, email, role, statut_actif, auth_user_id")
        .eq("statut_actif", true)
        .order("nom_complet", { ascending: true });

      if (!error) {
        setMembres((data ?? []) as MembreRow[]);
      }
    }

    charger();
  }, []);

  const selectedMembre = useMemo(
    () => membres.find((m) => m.id === selectedId) ?? null,
    [membres, selectedId]
  );

  async function genererMotDePasse() {
    setBusy(true);
    setMessage("");
    setMotDePasseProvisoire("");

    try {
      if (!selectedId) {
        setMessage("Sélectionne un membre.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setMessage("Session admin introuvable.");
        return;
      }

      const response = await fetch("/api/admin/mot-de-passe-provisoire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ memberId: selectedId }),
      });

      const result: ApiResult = await response.json();

      if (!response.ok || !result.ok) {
        setMessage(result.message || "Impossible de générer le mot de passe provisoire.");
        return;
      }

      setMotDePasseProvisoire(result.motDePasseProvisoire || "");
      setMessage("Mot de passe provisoire généré avec succès.");
    } catch (e: any) {
      setMessage(e?.message || "Erreur serveur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Mot de passe provisoire
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Génère un mot de passe provisoire pour un membre. À sa prochaine connexion,
            il sera obligé de le changer.
          </p>
        </div>

        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Membre</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-2xl border border-cyan-800/40 bg-[#081735] px-4 py-3 text-white outline-none"
              >
                <option value="">Sélectionner</option>
                {membres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom_complet} {m.auth_user_id ? "" : "(pas encore de compte)"}
                  </option>
                ))}
              </select>
            </div>

            {selectedMembre ? (
              <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4 text-sm text-slate-300">
                <div className="font-medium text-white">{selectedMembre.nom_complet}</div>
                <div>Email : {selectedMembre.email || "Non renseigné"}</div>
                <div>Rôle : {selectedMembre.role}</div>
                <div>
                  Compte auth : {selectedMembre.auth_user_id ? "Oui" : "Non"}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={genererMotDePasse}
              disabled={busy}
              className="rounded-2xl bg-amber-500 px-5 py-3 font-medium text-slate-950 disabled:opacity-60"
            >
              {busy ? "Génération..." : "Générer mot de passe provisoire"}
            </button>

            {message ? (
              <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] px-4 py-3 text-slate-200">
                {message}
              </div>
            ) : null}

            {motDePasseProvisoire ? (
              <div className="rounded-2xl border border-amber-700/40 bg-amber-500/10 p-4">
                <div className="text-sm text-amber-200">Mot de passe provisoire</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {motDePasseProvisoire}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

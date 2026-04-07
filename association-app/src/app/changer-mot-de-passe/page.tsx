"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ChangeResult = {
  code: string;
  message: string;
  membre_id: string | null;
};

export default function ChangerMotDePassePage() {
  const router = useRouter();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      if (motDePasse.length < 8) {
        setMessage("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }

      if (motDePasse !== confirmation) {
        setMessage("La confirmation du mot de passe ne correspond pas.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: motDePasse,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { data, error } = await supabase.rpc("fn_membre_marquer_mot_de_passe_change");

      if (error) {
        throw new Error(error.message);
      }

      const res: ChangeResult | undefined = Array.isArray(data) ? data[0] : data;

      if (!res || res.code !== "OK") {
        setMessage(res?.message || "Changement du mot de passe refusé.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (e: any) {
      setMessage(e?.message || "Erreur lors du changement du mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-semibold">Changer mon mot de passe</h1>
        <p className="mt-2 text-sm text-slate-300">
          Ton mot de passe provisoire doit être remplacé avant d’accéder à l’application.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none"
            placeholder="Nouveau mot de passe"
            required
          />

          <input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none"
            placeholder="Confirmer le mot de passe"
            required
          />

          {message ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
          >
            {busy ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}


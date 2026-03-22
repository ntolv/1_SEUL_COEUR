"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Preinscription = {
  id: string;
  nom_complet: string;
  telephone: string;
  email: string | null;
  role: string;
  statut_actif: boolean;
  statut_preinscription: string;
};

export default function InscriptionPage() {
  const router = useRouter();

  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [success, setSuccess] = useState("");
  const [resultat, setResultat] = useState<Preinscription | null>(null);

  async function handleRecherche(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSuccess("");
    setResultat(null);

    const { data, error } = await supabase.rpc("fn_preinscription_par_telephone", {
      p_telephone: telephone,
    });

    if (error) {
      setErreur(error.message);
      setChargement(false);
      return;
    }

    if (!data || data.length === 0) {
      setErreur("Aucune préinscription trouvée.");
      setChargement(false);
      return;
    }

    setResultat(data[0]);
    setChargement(false);
  }

  async function handleInscription(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSuccess("");

    if (!resultat) {
      setErreur("Préinscription introuvable.");
      setChargement(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setErreur(signUpError.message);
      setChargement(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setErreur(
        "Compte créé, mais connexion automatique impossible. Connecte-toi puis recommence l’activation."
      );
      setChargement(false);
      return;
    }

    const { error: activationError } = await supabase.rpc("fn_activer_preinscription", {
      p_preinscription_id: resultat.id,
      p_email: email,
    });

    if (activationError) {
      setErreur(activationError.message);
      setChargement(false);
      return;
    }

    setSuccess("Compte créé et activé avec succès. Redirection vers la connexion...");
    setChargement(false);

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
            Première inscription
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Retrouver mon profil
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Saisis ton numéro de téléphone au format international pour vérifier ta préinscription.
          </p>
        </div>

        {!resultat ? (
          <form onSubmit={handleRecherche} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Téléphone</label>
              <input
                type="text"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+33611223344"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none placeholder:text-slate-500"
                required
              />
            </div>

            {erreur ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {erreur}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={chargement}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
            >
              {chargement ? "Recherche..." : "Vérifier mon numéro"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
              <div className="text-sm text-emerald-200">Préinscription trouvée</div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-sm text-slate-400">Nom</div>
                  <div className="mt-2 text-lg font-medium">{resultat.nom_complet}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-sm text-slate-400">Téléphone</div>
                  <div className="mt-2 text-base">{resultat.telephone}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-sm text-slate-400">Rôle</div>
                  <div className="mt-2 text-base">{resultat.role}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="text-sm text-slate-400">Statut</div>
                  <div className="mt-2 text-base">
                    {resultat.statut_actif ? "Actif" : "Non actif"} · {resultat.statut_preinscription}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleInscription} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none placeholder:text-slate-500"
                  required
                />
              </div>

              {erreur ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {erreur}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={chargement}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
              >
                {chargement ? "Création..." : "Créer mon compte"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

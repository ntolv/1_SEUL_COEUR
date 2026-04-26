"use client";



import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";



type SyncResult = {

  code: string;

  message: string;

  membre_id: string | null;

  nom_complet: string | null;

  email: string | null;

  telephone: string | null;

  role: string | null;

  statut_actif: boolean | null;

  premiere_connexion_effectuee: boolean | null;

  mot_de_passe_provisoire_actif: boolean | null;

  doit_changer_mot_de_passe: boolean | null;

};



export default function LoginPage() {

  const router = useRouter();



  const [email, setEmail] = useState("");

  const [motDePasse, setMotDePasse] = useState("");

  const [chargement, setChargement] = useState(false);

  const [erreur, setErreur] = useState("");



  async function handleLogin(e: FormEvent<HTMLFormElement>) {

    e.preventDefault();

    setErreur("");

    setChargement(true);



    const { error } = await supabase.auth.signInWithPassword({

      email,

      password: motDePasse,

    });



    if (error) {

      setChargement(false);

      setErreur(error.message);

      return;

    }



    const { data: syncData, error: syncError } = await supabase.rpc(

      "fn_membre_sync_connexion_courante"

    );



    setChargement(false);



    if (syncError) {

      setErreur(syncError.message);

      return;

    }



    const res: SyncResult | undefined = Array.isArray(syncData) ? syncData[0] : syncData;



    if (!res || res.code !== "OK") {

      setErreur(res?.message || "Connexion incomplète.");

      return;

    }



    if (res.doit_changer_mot_de_passe || res.mot_de_passe_provisoire_actif) {

      router.push("/changer-mot-de-passe");

      router.refresh();

      return;

    }



    router.push("/");

    router.refresh();

  }



  return (

    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">

        <div className="mb-6">

          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">

            Association · Connexion

          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">

            Connexion

          </h1>

          <p className="mt-2 text-sm text-slate-300">

            Accède à ton espace sécurisé de gestion.

          </p>

        </div>



        <form onSubmit={handleLogin} className="space-y-4">

          <div>

            <label className="mb-2 block text-sm text-slate-300">Email</label>

            <input

              type="email"

              value={email}

              onChange={(e) => setEmail(e.target.value)}

              className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none placeholder:text-slate-500"

              placeholder="vous@association.fr"

              required

            />

          </div>



          <div>

            <label className="mb-2 block text-sm text-slate-300">

              Mot de passe

            </label>

            <input

              type="password"

              value={motDePasse}

              onChange={(e) => setMotDePasse(e.target.value)}

              className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none placeholder:text-slate-500"

              placeholder="••••••••"

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

            {chargement ? "Connexion..." : "Se connecter"}

          </button>

        </form>



        <div className="mt-4 text-center">

          <a href="/premiere-connexion" className="text-blue-600 underline">

            Première connexion

          </a>

        </div>

      </div>

    </main>

  );

}




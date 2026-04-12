"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const router = useRouter();

  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [membreId, setMembreId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleCreateAccount() {
    try {
      setMessage("Création du compte...");

      const finalEmail = email;
      const finalPassword = password;

      // SIGNUP
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: finalEmail,
          password: finalPassword,
        });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // CAS déjà existant → login auto
      if (signUpData.user === null) {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: finalEmail,
            password: finalPassword,
          });

        if (signInError) {
          throw new Error(signInError.message);
        }
      }

      // Vérifier session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Session invalide après authentification");
      }

      // FINALISATION
      const { data: finalizeData, error: finalizeError } =
        await supabase.rpc(
          "fn_membre_finaliser_premiere_connexion",
          { p_membre_id: membreId }
        );

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      const result = Array.isArray(finalizeData)
        ? finalizeData[0]
        : finalizeData;

      if (!result) {
        throw new Error("Réponse serveur invalide");
      }

      if (result.code === "OK" || result.code === "ALREADY_DONE") {
        setMessage("Activation réussie");
        router.push("/");
        router.refresh();
        return;
      }

      throw new Error(result.message || "Erreur inconnue");

    } catch (err: any) {
      setMessage(err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Première connexion</h1>

      <input
        placeholder="Téléphone"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleCreateAccount}>
        Activer mon compte
      </button>

      <p>{message}</p>
    </div>
  );
}

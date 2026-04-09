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
      setMessage("Recherche du membre préinscrit...");

      // ÉTAPE 1: Retrouver le membre préinscrit par téléphone
      if (!telephone.trim()) {
        throw new Error("Veuillez saisir votre numéro de téléphone");
      }

      const { data: membreData, error: membreError } = await supabase
        .from("membres_preinscriptions")
        .select("id, nom_complet, email")
        .eq("telephone", telephone.trim())
        .single();

      if (membreError || !membreData) {
        throw new Error("Aucun membre préinscrit trouvé avec ce numéro de téléphone");
      }

      const foundMembreId = membreData.id;
      setMembreId(foundMembreId);
      setMessage("Création du compte...");

      const finalEmail = email;
      const finalPassword = password;

      // ÉTAPE 2: SIGNUP
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

      // GARANTIR SESSION : si signUp() n'a pas créé de session immédiate, forcer login
      let session;
      let sessionError;

      const { data: sessionData, error: initialSessionError } = await supabase.auth.getSession();
      
      if (initialSessionError || !sessionData.session) {
        // Pas de session immédiate → forcer login
        const { data: signInData, error: forcedSignInError } =
          await supabase.auth.signInWithPassword({
            email: finalEmail,
            password: finalPassword,
          });

        if (forcedSignInError) {
          throw new Error("Échec de connexion après création du compte: " + forcedSignInError.message);
        }

        session = signInData.session;
        sessionError = null;
      } else {
        session = sessionData.session;
        sessionError = initialSessionError;
      }

      if (sessionError || !session) {
        throw new Error("Session invalide après authentification");
      }

      // FINALISATION
      const { data: finalizeData, error: finalizeError } =
        await supabase.rpc(
          "fn_membre_finaliser_premiere_connexion",
          { p_membre_id: foundMembreId }
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

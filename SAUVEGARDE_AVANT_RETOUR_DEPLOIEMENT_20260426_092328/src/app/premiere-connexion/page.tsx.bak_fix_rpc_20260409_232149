"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const router = useRouter();

  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [membreReconnu, setMembreReconnu] = useState<any>(null);
  const [etape, setEtape] = useState<1 | 2>(1);
  const [message, setMessage] = useState("");

  async function handleVerifierTelephone() {
    try {
      setMessage("Recherche du membre préinscrit...");

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

      setMembreReconnu(membreData);
      setEtape(2);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function handleCreateAccount() {
    try {
      setMessage("Création du compte...");

      if (!membreReconnu?.id) {
        throw new Error("Membre préinscrit non reconnu");
      }

      const finalEmail = email;
      const finalPassword = password;

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: finalEmail,
          password: finalPassword,
        });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

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

      let session = null;

      const { data: sessionData, error: initialSessionError } =
        await supabase.auth.getSession();

      if (initialSessionError || !sessionData.session) {
        const { data: signInData, error: forcedSignInError } =
          await supabase.auth.signInWithPassword({
            email: finalEmail,
            password: finalPassword,
          });

        if (forcedSignInError) {
          throw new Error(
            "Échec de connexion après création du compte: " +
              forcedSignInError.message
          );
        }

        session = signInData.session;
      } else {
        session = sessionData.session;
      }

      if (!session) {
        throw new Error("Session invalide après authentification");
      }

      const { data: finalizeData, error: finalizeError } = await supabase.rpc(
        "fn_membre_finaliser_premiere_connexion",
        { p_membre_id: membreReconnu.id }
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

      {etape === 1 && (
        <div>
          <p style={{ marginBottom: 20, color: "#666" }}>
            Veuillez saisir votre numéro de téléphone pour vérifier votre préinscription.
          </p>

          <input
            placeholder="Téléphone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />

          <button
            onClick={handleVerifierTelephone}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Vérifier mon numéro
          </button>
        </div>
      )}

      {etape === 2 && membreReconnu && (
        <div>
          <div
            style={{
              padding: "15px",
              backgroundColor: "#d4edda",
              border: "1px solid #c3e6cb",
              borderRadius: "5px",
              marginBottom: "20px",
            }}
          >
            <strong>Membre reconnu :</strong> {membreReconnu.nom_complet}
          </div>

          <p style={{ marginBottom: 20, color: "#666" }}>
            Veuillez maintenant créer votre compte avec votre email et mot de passe.
          </p>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />

          <input
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />

          <button
            onClick={handleCreateAccount}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Activer mon compte
          </button>
        </div>
      )}

      {message && (
        <p
          style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor:
              message.includes("Erreur") || message.includes("Aucun")
                ? "#f8d7da"
                : "#d1ecf1",
            color:
              message.includes("Erreur") || message.includes("Aucun")
                ? "#721c24"
                : "#0c5460",
            border:
              message.includes("Erreur") || message.includes("Aucun")
                ? "1px solid #f5c6cb"
                : "1px solid #bee5eb",
            borderRadius: "5px",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const router = useRouter();

  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [preinscriptionId, setPreinscriptionId] = useState<string | null>(null);
  const [membreNom, setMembreNom] = useState("");
  const [isRecognized, setIsRecognized] = useState(false);
  const [hasTriedLookup, setHasTriedLookup] = useState(false);
  const [message, setMessage] = useState("");

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  async function handleLookup() {
    try {
      setLoadingLookup(true);
      setMessage("");
      setIsRecognized(false);
      setPreinscriptionId(null);
      setMembreNom("");
      setEmail("");
      setPassword("");
      setHasTriedLookup(true);

      const tel = telephone.trim();

      if (!tel) {
        setMessage("Veuillez saisir votre numéro de téléphone.");
        return;
      }

      const { data, error } = await supabase.rpc(
        "fn_membre_premiere_connexion_verifier",
        { p_telephone: tel }
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        setMessage("Réponse serveur invalide.");
        return;
      }

      if (result.code !== "OK") {
        setMessage(
          "Préinscription non trouvée. Si vous avez déjà terminé votre première connexion, saisissez votre email et votre mot de passe pour accéder directement à l’accueil."
        );
        return;
      }

      setPreinscriptionId(result.id);
      setMembreNom(result.nom_complet || "");
      setIsRecognized(true);
      setMessage(
        "Préinscrit reconnu. Veuillez maintenant saisir votre email et créer votre mot de passe."
      );
    } catch (err: any) {
      setMessage(err?.message || "Erreur lors de la vérification.");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleCreateAccount() {
    try {
      setLoadingCreate(true);
      setMessage("");

      if (!email.trim()) {
        throw new Error("Veuillez saisir votre email.");
      }

      if (!password.trim()) {
        throw new Error("Veuillez créer votre mot de passe.");
      }

      const finalEmail = email.trim().toLowerCase();

      // 1. Tentative de connexion directe d'abord
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: finalEmail,
          password,
        });

      if (!signInError && signInData.session) {
        // Cas utilisateur déjà créé auparavant : accès direct accueil
        if (!preinscriptionId) {
          router.replace("/");
          router.refresh();
          return;
        }

        // Cas reconnu + compte déjà existant : on tente la finalisation,
        // mais si elle a déjà été faite, on laisse passer vers l'accueil
        const { data: finalizeData, error: finalizeError } = await supabase.rpc(
          "fn_membre_finaliser_premiere_connexion",
          { p_membre_id: preinscriptionId }
        );

        if (finalizeError) {
          const msg = (finalizeError.message || "").toLowerCase();

          if (
            msg.includes("préinscription introuvable") ||
            msg.includes("preinscription introuvable")
          ) {
            router.replace("/");
            router.refresh();
            return;
          }

          throw new Error(finalizeError.message);
        }

        const result = Array.isArray(finalizeData)
          ? finalizeData[0]
          : finalizeData;

        if (!result) {
          router.replace("/");
          router.refresh();
          return;
        }

        if (
          result.code === "OK" ||
          result.code === "ALREADY_DONE"
        ) {
          router.replace("/");
          router.refresh();
          return;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      // 2. Si la connexion échoue et qu'on n'a pas de préinscription reconnue,
      // on ne crée pas de compte à l'aveugle
      if (!isRecognized || !preinscriptionId) {
        throw new Error(
          "Compte non reconnu avec ces identifiants. Vérifiez votre email et votre mot de passe, ou recommencez la vérification du téléphone."
        );
      }

      // 3. Préinscription reconnue : création du compte Auth
      const { error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password,
      });

      if (signUpError) {
        const signUpMsg = (signUpError.message || "").toLowerCase();

        if (
          signUpMsg.includes("already registered") ||
          signUpMsg.includes("already exists") ||
          signUpMsg.includes("user already registered")
        ) {
          throw new Error(
            "Cet email est déjà utilisé avec un autre mot de passe. Saisissez le bon mot de passe pour accéder directement à l’accueil."
          );
        }

        throw new Error(signUpError.message);
      }

      // 4. Après création, connexion immédiate obligatoire
      const { data: signInAfterSignUpData, error: signInAfterSignUpError } =
        await supabase.auth.signInWithPassword({
          email: finalEmail,
          password,
        });

      if (signInAfterSignUpError || !signInAfterSignUpData.session) {
        throw new Error(
          "Compte créé mais connexion impossible immédiatement."
        );
      }

      // 5. Finalisation métier
      const { data: finalizeData, error: finalizeError } = await supabase.rpc(
        "fn_membre_finaliser_premiere_connexion",
        { p_membre_id: preinscriptionId }
      );

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      const result = Array.isArray(finalizeData)
        ? finalizeData[0]
        : finalizeData;

      if (!result) {
        throw new Error("Réponse serveur invalide.");
      }

      if (result.code === "OK" || result.code === "ALREADY_DONE") {
        router.replace("/");
        router.refresh();
        return;
      }

      throw new Error(result.message || "Erreur inconnue.");
    } catch (err: any) {
      setMessage(err?.message || "Erreur lors de l'activation.");
    } finally {
      setLoadingCreate(false);
    }
  }

  function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLookup();
    }
  }

  const isError =
    message.toLowerCase().includes("non reconnu") ||
    message.toLowerCase().includes("erreur") ||
    message.toLowerCase().includes("invalide") ||
    message.toLowerCase().includes("impossible") ||
    message.toLowerCase().includes("utilisé") ||
    message.toLowerCase().includes("vérifiez");

  const showCredentialsForm = isRecognized || hasTriedLookup;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 30px rgba(37,99,235,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            USC
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: "#1e3a8a",
            }}
          >
            Première connexion
          </h1>

          <p
            style={{
              marginTop: 8,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Saisissez votre numéro pour vérifier votre préinscription.
          </p>
        </div>

        <div
          style={{
            background: isRecognized ? "#eff6ff" : "#f1f5f9",
            border: `1px solid ${isRecognized ? "#bfdbfe" : "#e5e7eb"}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 18,
            fontWeight: 600,
            color: "#0f172a",
          }}
        >
          {isRecognized
            ? `Membre reconnu : ${membreNom}`
            : "Aucun membre reconnu"}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Numéro de téléphone
          </label>

          <input
            placeholder="+33661714050"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            onKeyDown={handlePhoneKeyDown}
            style={{
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleLookup}
          disabled={loadingLookup}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 10,
            padding: "13px",
            fontSize: 15,
            fontWeight: 600,
            color: "#ffffff",
            background: "#2563eb",
            cursor: "pointer",
          }}
        >
          {loadingLookup ? "Recherche..." : "Vérifier mon numéro"}
        </button>

        {showCredentialsForm && (
          <>
            <div
              style={{
                marginTop: 16,
                marginBottom: 10,
                padding: 12,
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: 13,
                color: "#1e40af",
                lineHeight: 1.5,
              }}
            >
              {isRecognized
                ? "Veuillez saisir votre email et créer votre mot de passe."
                : "Si vous avez déjà terminé votre première connexion, saisissez votre email et votre mot de passe existants pour accéder directement à l’accueil."}
            </div>

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 15,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />

            <input
              placeholder={isRecognized ? "Mot de passe" : "Mot de passe existant"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 15,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={loadingCreate}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 16,
                fontWeight: 700,
                color: "#ffffff",
                background: "#1e40af",
                cursor: "pointer",
              }}
            >
              {loadingCreate
                ? "Connexion..."
                : isRecognized
                ? "Activer mon compte"
                : "Accéder à l’accueil"}
            </button>
          </>
        )}

        {message && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              fontSize: 13,
              lineHeight: 1.5,
              background: isError ? "#fef2f2" : "#eff6ff",
              border: isError ? "1px solid #fecaca" : "1px solid #bfdbfe",
              color: isError ? "#991b1b" : "#1e40af",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
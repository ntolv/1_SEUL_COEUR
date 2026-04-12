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

      const tel = telephone.trim();

      if (!tel) {
        setMessage("Veuillez saisir votre numéro de téléphone.");
        return;
      }

      const { data, error } = await supabase.rpc(
        "fn_membre_premiere_connexion_verifier",
        { p_telephone: tel }
      );

      console.log("LOOKUP RPC ERROR =", error);
      console.log("LOOKUP RPC DATA =", data);

      if (error) {
        throw new Error(error.message);
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        setMessage("Réponse serveur invalide.");
        return;
      }

      if (result.code !== "OK") {
        setMessage(result.message || "Membre préinscrit non reconnu.");
        return;
      }

      setPreinscriptionId(result.id);
      setMembreNom(result.nom_complet || "");
      setIsRecognized(true);
      setMessage("Préinscrit reconnu. Veuillez maintenant saisir votre email et créer votre mot de passe.");
    } catch (err: any) {
      console.log("LOOKUP EXCEPTION =", err);
      setMessage(err?.message || "Erreur lors de la vérification.");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleCreateAccount() {
    try {
      setLoadingCreate(true);
      setMessage("");

      if (!isRecognized || !preinscriptionId) {
        throw new Error("Veuillez d'abord vérifier le téléphone.");
      }

      if (!email.trim()) {
        throw new Error("Veuillez saisir votre email.");
      }

      if (!password.trim()) {
        throw new Error("Veuillez créer votre mot de passe.");
      }

      const finalEmail = email.trim().toLowerCase();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (signUpData.user === null) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password,
        });

        if (signInError) {
          throw new Error(signInError.message);
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session invalide.");
      }

      const { data: finalizeData, error: finalizeError } = await supabase.rpc(
        "fn_membre_finaliser_premiere_connexion",
        { p_membre_id: preinscriptionId }
      );

      console.log("FINALIZE RPC ERROR =", finalizeError);
      console.log("FINALIZE RPC DATA =", finalizeData);

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      const result = Array.isArray(finalizeData) ? finalizeData[0] : finalizeData;

      if (!result) {
        throw new Error("Réponse serveur invalide.");
      }

      if (result.code === "OK" || result.code === "ALREADY_DONE") {
        router.push("/");
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
    message.toLowerCase().includes("invalide");

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

        {isRecognized && (
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
              Veuillez saisir votre email et créer votre mot de passe.
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
              placeholder="Mot de passe"
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
              {loadingCreate ? "Activation..." : "Activer mon compte"}
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
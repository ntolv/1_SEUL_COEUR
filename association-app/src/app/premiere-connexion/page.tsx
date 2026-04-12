"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Preinscription = {
  id: string;
  nom_complet: string | null;
  telephone: string | null;
  statut_actif: boolean | null;
};

function normalizePhone(v: string | null) {
  const digits = (v || "").replace(/\D/g, "");
  if (digits.startsWith("33")) {
    return "0" + digits.slice(2);
  }
  return digits;
}

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

  // 🔍 RECHERCHE PRÉINSCRIT (tolérant format)
  async function handleLookup() {
    try {
      setLoadingLookup(true);
      setMessage("");
      setIsRecognized(false);
      setPreinscriptionId(null);
      setMembreNom("");

      if (!telephone) {
        setMessage("Veuillez saisir un téléphone.");
        return;
      }

      const { data, error } = await supabase
        .from("membres_preinscriptions")
        .select("id, nom_complet, telephone, statut_actif");

      if (error) throw new Error(error.message);

      const inputTel = normalizePhone(telephone);

      const row = (data || []).find(
        (r: Preinscription) =>
          normalizePhone(r.telephone) === inputTel
      );

      if (!row) {
        setMessage("Préinscrit non reconnu.");
        return;
      }

      if (!row.statut_actif) {
        setMessage("Préinscription inactive.");
        return;
      }

      // ✅ reconnu
      setPreinscriptionId(row.id);
      setMembreNom(row.nom_complet || "");
      setIsRecognized(true);

      // champs vides obligatoires
      setEmail("");
      setPassword("");

      setMessage("Préinscrit reconnu");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoadingLookup(false);
    }
  }

  // 🚀 ACTIVATION
  async function handleCreateAccount() {
    try {
      setLoadingCreate(true);
      setMessage("");

      if (!isRecognized || !preinscriptionId) {
        throw new Error("Veuillez d'abord vérifier le téléphone.");
      }

      if (!email || !password) {
        throw new Error("Veuillez saisir email et mot de passe.");
      }

      const finalEmail = email.trim().toLowerCase();

      // SIGNUP
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: finalEmail,
          password,
        });

      if (signUpError) throw new Error(signUpError.message);

      // déjà existant → login
      if (signUpData.user === null) {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: finalEmail,
            password,
          });

        if (signInError) throw new Error(signInError.message);
      }

      // session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session invalide.");
      }

      // 🔥 BACKEND (cohérent avec fonction existante)
      const { data: finalizeData, error: finalizeError } =
        await supabase.rpc(
          "fn_membre_finaliser_premiere_connexion",
          { p_membre_id: preinscriptionId }
        );

      if (finalizeError) throw new Error(finalizeError.message);

      const result = Array.isArray(finalizeData)
        ? finalizeData[0]
        : finalizeData;

      if (!result) {
        throw new Error("Réponse serveur invalide.");
      }

      if (result.code === "OK" || result.code === "ALREADY_DONE") {
        router.push("/");
        router.refresh();
        return;
      }

      throw new Error(result.message || "Erreur inconnue");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoadingCreate(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h1>Première connexion</h1>

      {/* TELEPHONE */}
      <input
        placeholder="Téléphone"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        onBlur={handleLookup}
        style={{ display: "block", marginBottom: 10 }}
      />

      <button onClick={handleLookup}>
        {loadingLookup ? "Recherche..." : "Vérifier"}
      </button>

      {/* RESULTAT */}
      <p>
        <strong>
          {isRecognized
            ? `Membre reconnu : ${membreNom}`
            : "Aucun membre reconnu"}
        </strong>
      </p>

      {/* FORMULAIRE UNIQUEMENT SI RECONNU */}
      {isRecognized && (
        <>
          <input
            placeholder="Saisir votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", marginBottom: 10 }}
          />

          <input
            placeholder="Créer un mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", marginBottom: 10 }}
          />

          <button onClick={handleCreateAccount}>
            {loadingCreate ? "Activation..." : "Activer mon compte"}
          </button>
        </>
      )}

      <p>{message}</p>
    </div>
  );
}
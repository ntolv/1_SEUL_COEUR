"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type InitResult = {
  code: string;
  message: string;
  membre_id: string | null;
  nom_complet: string | null;
  email_masque: string | null;
  role: string | null;
  statut_actif: boolean | null;
  premiere_connexion_effectuee: boolean | null;
  type_personne: "MEMBRE" | "PREINSCRIT" | null;
};

type VerifyResult = {
  code: string;
  message: string;
  membre_id: string | null;
  nom_complet: string | null;
  email: string | null;
  role: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT" | null;
};

type FinalizeResult = {
  code: string;
  message: string;
  membre_id: string | null;
  auth_user_id: string | null;
  nom_complet: string | null;
  email: string | null;
  role: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT" | null;
};

type PersonneTrouvee = {
  id: string;
  nom_complet: string;
  email_masque: string | null;
  email_verifie: string | null;
  role: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
};

function normalizePhone(value: string) {
  return (value || "").trim();
}

export default function PremiereConnexionPage() {
  const router = useRouter();

  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [personne, setPersonne] = useState<PersonneTrouvee | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verifierTelephone = async () => {
    setMessage("");
    setBusy(true);

    try {
      const tel = normalizePhone(telephone);

      const { data, error } = await supabase.rpc(
        "fn_membre_premiere_connexion_init",
        {
          p_telephone: tel,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const res: InitResult | undefined = Array.isArray(data) ? data[0] : data;

      if (!res) {
        setMessage("Aucune réponse du serveur.");
        return;
      }

      if (res.code !== "ELIGIBLE" || !res.membre_id || !res.nom_complet || !res.type_personne) {
        setMessage(res.message || "Numéro non reconnu.");
        return;
      }

      setPersonne({
        id: res.membre_id,
        nom_complet: res.nom_complet,
        email_masque: res.email_masque ?? null,
        email_verifie: null,
        role: res.role ?? null,
        type_personne: res.type_personne,
      });

      setStep(2);
      setMessage(
        res.email_masque
          ? `${res.message} Email attendu : ${res.email_masque}`
          : res.message
      );
    } catch (e: any) {
      setMessage(e?.message || "Erreur lors de la vérification du téléphone.");
    } finally {
      setBusy(false);
    }
  };

  const verifierEmailEtActiver = async () => {
    setMessage("");
    setBusy(true);

    try {
      if (!personne) {
        setMessage("Aucune personne sélectionnée.");
        return;
      }

      const finalEmail = email.trim().toLowerCase();

      if (!finalEmail) {
        setMessage("Saisis un email.");
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase.rpc(
        "fn_membre_premiere_connexion_verifier",
        {
          p_telephone: normalizePhone(telephone),
          p_email: finalEmail,
        }
      );

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      const verifyRes: VerifyResult | undefined = Array.isArray(verifyData)
        ? verifyData[0]
        : verifyData;

      if (!verifyRes) {
        setMessage("Aucune réponse du serveur.");
        return;
      }

      if (verifyRes.code !== "ELIGIBLE" || !verifyRes.membre_id) {
        setMessage(verifyRes.message || "Vérification email refusée.");
        return;
      }

      const password = "Temp1234!";

      const { error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const signInRes = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password,
        });

        if (signInRes.error) {
          throw new Error(
            signInRes.error.message ||
              "Compte créé mais session non ouverte automatiquement."
          );
        }
      }

      const { data: finalizeData, error: finalizeError } = await supabase.rpc(
        "fn_membre_finaliser_premiere_connexion",
        {
          p_membre_id: verifyRes.membre_id,
        }
      );

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      const finalizeRes: FinalizeResult | undefined = Array.isArray(finalizeData)
        ? finalizeData[0]
        : finalizeData;

      if (!finalizeRes) {
        setMessage("Finalisation incomplète.");
        return;
      }

      if (finalizeRes.code !== "OK") {
        setMessage(finalizeRes.message || "Finalisation refusée.");
        return;
      }

      setMessage("Compte créé et première connexion finalisée avec succès.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (e: any) {
      setMessage(e?.message || "Erreur lors de l’activation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">Première connexion</h1>

      {step === 1 && (
        <>
          <input
            className="w-full rounded border p-2"
            placeholder="Numéro de téléphone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />

          <button
            className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
            onClick={verifierTelephone}
            disabled={busy}
          >
            {busy ? "Vérification..." : "Vérifier"}
          </button>
        </>
      )}

      {step === 2 && personne && (
        <>
          <div className="rounded border p-3">
            <p className="font-medium">{personne.nom_complet}</p>
            <p className="text-sm text-slate-600">
              Type : {personne.type_personne}
            </p>
            {personne.email_masque ? (
              <p className="text-sm text-slate-600">
                Email attendu : {personne.email_masque}
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                Aucun email enregistré, saisis l’email à utiliser.
              </p>
            )}
          </div>

          <input
            className="w-full rounded border p-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="w-full rounded bg-green-600 p-2 text-white disabled:opacity-60"
            onClick={verifierEmailEtActiver}
            disabled={busy}
          >
            {busy ? "Activation..." : "Activer mon compte"}
          </button>
        </>
      )}

      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}

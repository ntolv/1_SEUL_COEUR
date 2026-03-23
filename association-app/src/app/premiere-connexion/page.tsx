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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [personne, setPersonne] = useState<PersonneTrouvee | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verifierTelephone = async () => {
    setMessage("");
    setBusy(true);

    try {
      const { data, error } = await supabase.rpc(
        "fn_membre_premiere_connexion_init",
        {
          p_telephone: normalizePhone(telephone),
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
        role: res.role ?? null,
        type_personne: res.type_personne,
      });

      setStep(2);
      setMessage(
        res.email_masque
          ? `${res.message} Email déjà connu : ${res.email_masque}`
          : "Numéro reconnu. Saisissez maintenant votre email et votre mot de passe."
      );
    } catch (e: any) {
      setMessage(e?.message || "Erreur lors de la vérification du téléphone.");
    } finally {
      setBusy(false);
    }
  };

  const activerCompte = async () => {
    setMessage("");
    setBusy(true);

    try {
      if (!personne) {
        setMessage("Aucune personne sélectionnée.");
        return;
      }

      const finalEmail = email.trim().toLowerCase();
      const finalPassword = password.trim();
      const finalPasswordConfirm = passwordConfirm.trim();

      if (!finalEmail) {
        setMessage("Saisis un email.");
        return;
      }

      if (!finalPassword) {
        setMessage("Saisis un mot de passe.");
        return;
      }

      if (finalPassword.length < 8) {
        setMessage("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }

      if (finalPassword !== finalPasswordConfirm) {
        setMessage("La confirmation du mot de passe ne correspond pas.");
        return;
      }

      if (personne.type_personne === "MEMBRE") {
        const { error: updateError } = await supabase
          .from("membres")
          .update({ email: finalEmail })
          .eq("id", personne.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: updateError } = await supabase
          .from("membres_preinscriptions")
          .update({ email: finalEmail })
          .eq("id", personne.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password: finalPassword,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const session = signUpData.session;
      const user = signUpData.user;

      if (session && user) {
        const { data: finalizeData, error: finalizeError } = await supabase.rpc(
          "fn_membre_finaliser_premiere_connexion",
          {
            p_membre_id: personne.id,
          }
        );

        if (finalizeError) {
          throw new Error(finalizeError.message);
        }

        const finalizeRes: FinalizeResult | undefined = Array.isArray(finalizeData)
          ? finalizeData[0]
          : finalizeData;

        if (!finalizeRes || finalizeRes.code !== "OK") {
          setMessage(
            finalizeRes?.message ||
              "Compte créé, mais la finalisation de la première connexion a échoué."
          );
          return;
        }

        setMessage("Compte créé et première connexion finalisée avec succès.");
        setTimeout(() => {
          router.push("/login");
        }, 1200);
        return;
      }

      if (user && !session) {
        setMessage(
          "Email enregistré et compte créé. Vérifie maintenant ta boîte mail pour confirmer ton inscription, puis connecte-toi avec cet email et le mot de passe choisi."
        );
        return;
      }

      setMessage(
        "Email enregistré. Le compte semble créé, mais la session n’a pas été ouverte automatiquement."
      );
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
                Email connu : {personne.email_masque}
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

          <input
            className="w-full rounded border p-2"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            className="w-full rounded border p-2"
            placeholder="Confirmer le mot de passe"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />

          <button
            className="w-full rounded bg-green-600 p-2 text-white disabled:opacity-60"
            onClick={activerCompte}
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

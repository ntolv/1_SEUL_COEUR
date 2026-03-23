"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type PersonneTrouvee = {
  id: string;
  nom_complet: string;
  telephone: string | null;
  email?: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
};

function normalizePhone(value: string) {
  return (value || "").replace(/\s+/g, "").replace(/-/g, "");
}

export default function PremiereConnexionPage() {
  const router = useRouter();

  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [membre, setMembre] = useState<PersonneTrouvee | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verifierTelephone = async () => {
    setMessage("");
    setBusy(true);

    try {
      const tel = normalizePhone(telephone);

      const { data: membres } = await supabase
        .from("membres")
        .select("id, nom_complet, telephone, email");

      const membreTrouve =
        (membres || []).find(
          (m: any) => normalizePhone(m.telephone || "") === tel
        ) || null;

      if (membreTrouve) {
        setMembre({
          id: membreTrouve.id,
          nom_complet: membreTrouve.nom_complet,
          telephone: membreTrouve.telephone,
          email: membreTrouve.email ?? null,
          type_personne: "MEMBRE",
        });
        setStep(2);
        setBusy(false);
        return;
      }

      const { data: preinscrits } = await supabase
        .from("membres_preinscriptions")
        .select("id, nom_complet, telephone, email");

      const preinscritTrouve =
        (preinscrits || []).find(
          (p: any) => normalizePhone(p.telephone || "") === tel
        ) || null;

      if (preinscritTrouve) {
        setMembre({
          id: preinscritTrouve.id,
          nom_complet: preinscritTrouve.nom_complet,
          telephone: preinscritTrouve.telephone,
          email: preinscritTrouve.email ?? null,
          type_personne: "PREINSCRIT",
        });
        setStep(2);
        setBusy(false);
        return;
      }

      setMessage("Aucun membre trouvé.");
    } catch (e: any) {
      setMessage(e?.message || "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  const verifierEmail = async () => {
    setMessage("");
    setBusy(true);

    try {
      if (!membre) return;

      const finalEmail = email.trim().toLowerCase();

      const { error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password: "Temp1234!",
      });

      if (signUpError) {
        setMessage(signUpError.message);
        setBusy(false);
        return;
      }

      // 🔥 CAS MEMBRE
      if (membre.type_personne === "MEMBRE") {
        await supabase
          .from("membres")
          .update({ email: finalEmail })
          .eq("id", membre.id);
      }

      // 🔥 CAS PREINSCRIT → TRANSFORMATION
      if (membre.type_personne === "PREINSCRIT") {
        const { data: pre } = await supabase
          .from("membres_preinscriptions")
          .select("*")
          .eq("id", membre.id)
          .single();

        if (pre) {
          // INSERT DANS MEMBRES
          await supabase.from("membres").insert({
            id: pre.id,
            nom_complet: pre.nom_complet,
            telephone: pre.telephone,
            email: finalEmail,
          });

          // 🔥 SUPPRESSION PREINSCRIT
          await supabase
            .from("membres_preinscriptions")
            .delete()
            .eq("id", pre.id);
        }
      }

      setMessage("Compte créé avec succès");
      router.push("/login");
    } catch (e: any) {
      setMessage(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">Première connexion</h1>

      {step === 1 && (
        <>
          <input
            className="w-full border p-2 rounded"
            placeholder="Téléphone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />

          <button
            className="w-full bg-blue-600 text-white p-2 rounded"
            onClick={verifierTelephone}
          >
            Vérifier
          </button>
        </>
      )}

      {step === 2 && membre && (
        <>
          <p>
            {membre.nom_complet} ({membre.type_personne})
          </p>

          <input
            className="w-full border p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="w-full bg-green-600 text-white p-2 rounded"
            onClick={verifierEmail}
          >
            Activer
          </button>
        </>
      )}

      {message && <p className="text-red-600">{message}</p>}
    </div>
  );
}

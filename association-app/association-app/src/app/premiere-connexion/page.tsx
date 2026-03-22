'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PremiereConnexionPage() {
  const router = useRouter();

  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [membre, setMembre] = useState<any>(null);
  const [message, setMessage] = useState('');

  const verifierTelephone = async () => {
    setMessage('');

    const { data, error } = await supabase
      .rpc('fn_membre_premiere_connexion_init', {
        p_telephone: telephone,
      });

    if (error || !data || data.length === 0) {
      setMessage("Erreur lors de la vérification");
      return;
    }

    const res = data[0];

    if (res.code !== 'ELIGIBLE') {
      setMessage(res.message);
      return;
    }

    setMembre(res);
    setStep(2);
  };

  const verifierEmail = async () => {
    setMessage('');

    const { data, error } = await supabase
      .rpc('fn_membre_premiere_connexion_verifier', {
        p_telephone: telephone,
        p_email: email,
      });

    if (error || !data || data.length === 0) {
      setMessage("Erreur lors de la vérification email");
      return;
    }

    const res = data[0];

    if (res.code !== 'ELIGIBLE') {
      setMessage(res.message);
      return;
    }

    // Création du compte
    const { error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: 'Temp1234!', // mot de passe temporaire
    });

    if (signUpError) {
      setMessage(signUpError.message);
      return;
    }

    // Finalisation
    await supabase.rpc('fn_membre_finaliser_premiere_connexion', {
      p_membre_id: res.membre_id,
    });

    setMessage("Compte créé. Connectez-vous.");
    router.push('/login');
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">Première connexion</h1>

      {step === 1 && (
        <>
          <input
            className="w-full border p-2 rounded"
            placeholder="Numéro de téléphone"
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

      {step === 2 && (
        <>
          <p>Membre trouvé : {membre.nom_complet}</p>

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
            Activer mon compte
          </button>
        </>
      )}

      {message && <p className="text-red-600">{message}</p>}
    </div>
  );
}

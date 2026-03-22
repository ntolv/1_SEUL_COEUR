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
    const { data } = await supabase.rpc('fn_membre_premiere_connexion_init', {
      p_telephone: telephone,
    });

    if (!data || data[0].code !== 'ELIGIBLE') {
      setMessage(data?.[0]?.message || "Erreur");
      return;
    }

    setMembre(data[0]);
    setStep(2);
  };

  const verifierEmail = async () => {
    const { data } = await supabase.rpc('fn_membre_premiere_connexion_verifier', {
      p_telephone: telephone,
      p_email: email,
    });

    if (!data || data[0].code !== 'ELIGIBLE') {
      setMessage(data?.[0]?.message || "Erreur");
      return;
    }

    await supabase.auth.signUp({
      email: email,
      password: 'Temp1234!',
    });

    await supabase.rpc('fn_membre_finaliser_premiere_connexion', {
      p_membre_id: data[0].membre_id,
    });

    router.push('/login');
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">Première connexion</h1>

      {step === 1 && (
        <>
          <input
            className="w-full border p-2"
            placeholder="Téléphone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
          <button onClick={verifierTelephone}>Vérifier</button>
        </>
      )}

      {step === 2 && (
        <>
          <p>{membre.nom_complet}</p>
          <input
            className="w-full border p-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={verifierEmail}>Activer</button>
        </>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

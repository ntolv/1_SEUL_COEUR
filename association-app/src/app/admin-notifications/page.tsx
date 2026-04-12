"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type MembreOption = {
id: string;
nom_complet: string;
};

export default function AdminNotificationsPage() {
const [mode, setMode] = useState<"TOUS" | "UN">("TOUS");
const [membres, setMembres] = useState<MembreOption[]>([]);
const [membreId, setMembreId] = useState("");
const [titre, setTitre] = useState("");
const [message, setMessage] = useState("");
const [type, setType] = useState("INFO");
const [actionUrl, setActionUrl] = useState("");
const [chargement, setChargement] = useState(false);
const [retour, setRetour] = useState("");

useEffect(() => {
async function chargerMembres() {
const { data, error } = await supabase
.from("membres")
.select("id, nom_complet")
.eq("statut_actif", true)
.order("nom_complet", { ascending: true });

```
  if (!error && data) {
    setMembres(data as MembreOption[]);
  }
}

chargerMembres();
```

}, []);

async function envoyerNotification() {
setRetour("");

```
if (!titre.trim()) {
  setRetour("Le titre est obligatoire.");
  return;
}

if (!message.trim()) {
  setRetour("Le message est obligatoire.");
  return;
}

if (mode === "UN" && !membreId) {
  setRetour("Sélectionne un membre.");
  return;
}

setChargement(true);

if (mode === "TOUS") {
  const { data, error } = await supabase.rpc("fn_notification_envoyer_a_tous", {
    p_titre: titre.trim(),
    p_message: message.trim(),
    p_type: type,
    p_source_module: "ADMIN",
    p_source_id: null,
    p_action_url: actionUrl.trim() || null,
    p_data: {},
  });

  if (error) {
    setRetour(error.message);
  } else {
    setRetour(`Notification envoyée à tous. Total: ${data?.total ?? 0}`);
    setTitre("");
    setMessage("");
    setActionUrl("");
  }
} else {
  const { error } = await supabase.rpc("fn_notification_envoyer_a_un_membre", {
    p_membre_id: membreId,
    p_titre: titre.trim(),
    p_message: message.trim(),
    p_type: type,
    p_source_module: "ADMIN",
    p_source_id: null,
    p_action_url: actionUrl.trim() || null,
    p_data: {},
  });

  if (error) {
    setRetour(error.message);
  } else {
    setRetour("Notification envoyée au membre.");
    setTitre("");
    setMessage("");
    setActionUrl("");
    setMembreId("");
  }
}

setChargement(false);
```

}

return ( <AppShell> <div className="space-y-6"> <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl"> <h1 className="text-2xl font-semibold">Envoi de notifications</h1> <p className="mt-2 text-sm text-slate-400">
Envoi manuel admin vers tous les membres ou un membre précis. </p> </div>

```
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">Mode d’envoi</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "TOUS" | "UN")}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
          >
            <option value="TOUS">Tous les membres</option>
            <option value="UN">Un seul membre</option>
          </select>
        </div>

        {mode === "UN" && (
          <div>
            <label className="mb-2 block text-sm text-slate-300">Membre</label>
            <select
              value={membreId}
              onChange={(e) => setMembreId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
            >
              <option value="">Sélectionner</option>
              {membres.map((membre) => (
                <option key={membre.id} value={membre.id}>
                  {membre.nom_complet}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-slate-300">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
          >
            <option value="INFO">INFO</option>
            <option value="ALERTE">ALERTE</option>
            <option value="ACTION">ACTION</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Action URL</label>
          <input
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/notifications ou /encaissements"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm text-slate-300">Titre</label>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm text-slate-300">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={envoyerNotification}
          disabled={chargement}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-60"
        >
          {chargement ? "Envoi..." : "Envoyer la notification"}
        </button>

        {retour ? (
          <div className="text-sm text-slate-300">{retour}</div>
        ) : null}
      </div>
    </div>
  </div>
</AppShell>
```

);
}

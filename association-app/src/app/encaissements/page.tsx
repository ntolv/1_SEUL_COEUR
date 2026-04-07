"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type SessionRow = {
  id: string;
  annee: number;
  mois: number;
  statut: string;
};

type PersonneRow = {
  id: string;
  nom_complet: string;
  telephone: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
};

type RubriqueRow = {
  id?: string | null;
  nom: string;
};

type DetailRow = {
  type_personne: string;
  personne_id: string;
  nom_complet: string;
  session_libelle: string;
  rubrique_nom: string;
  montant_attendu: number | null;
  montant_encaisse: number | null;
  montant_retard: number | null;
};

const DEFAULT_RUBRIQUES: RubriqueRow[] = [
  { nom: "Tontine Grand Cahier" },
  { nom: "Tontine Petit Cahier" },
  { nom: "Repas" },
  { nom: "Anniversaire" },
  { nom: "Fond de roulement" },
  { nom: "Projet" },
  { nom: "Secours" },
  { nom: "Inscription" },
];

const QUICK_BUTTONS: Record<string, number[]> = {
  Repas: [20],
  Anniversaire: [30],
  "Tontine Petit Cahier": [100],
  "Tontine Grand Cahier": [100, 500],
  "Fond de roulement": [20],
};

function euro(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function normalizeName(value: string) {
  return (value ?? "").trim().toLowerCase();
}

function isSessionClosed(session: SessionRow | null) {
  const statut = (session?.statut ?? "").toUpperCase();
  return (
    statut.includes("FERM") ||
    statut.includes("CLOT") ||
    statut.includes("CLOS")
  );
}

export default function EncaissementsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyCaisse, setBusyCaisse] = useState(false);
  const [busyAttendu, setBusyAttendu] = useState(false);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [personnes, setPersonnes] = useState<PersonneRow[]>([]);
  const [rubriques, setRubriques] = useState<RubriqueRow[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [montants, setMontants] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<DetailRow[]>([]);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageAttendu, setMessageAttendu] = useState<string | null>(null);
  const [errorAttendu, setErrorAttendu] = useState<string | null>(null);
  const [messageCaisse, setMessageCaisse] = useState<string | null>(null);
  const [errorCaisse, setErrorCaisse] = useState<string | null>(null);

  const [expectedPersonneKey, setExpectedPersonneKey] = useState("");
  const [expectedRubriqueNom, setExpectedRubriqueNom] = useState("");
  const [expectedMontant, setExpectedMontant] = useState("");

  const selectedPersonne = useMemo(() => {
    if (!selectedKey) return null;
    const [type, id] = selectedKey.split("::");
    return personnes.find((p) => p.id === id && p.type_personne === type) ?? null;
  }, [selectedKey, personnes]);

  const expectedPersonne = useMemo(() => {
    if (!expectedPersonneKey) return null;
    const [type, id] = expectedPersonneKey.split("::");
    return personnes.find((p) => p.id === id && p.type_personne === type) ?? null;
  }, [expectedPersonneKey, personnes]);

  const detailSummary = useMemo(() => {
    return details.reduce(
      (acc, row) => {
        acc.attendu += Number(row.montant_attendu ?? 0);
        acc.encaisse += Number(row.montant_encaisse ?? 0);
        acc.retard += Number(row.montant_retard ?? 0);
        return acc;
      },
      { attendu: 0, encaisse: 0, retard: 0 }
    );
  }, [details]);

  async function chargerSession() {
    const now = new Date();
    const annee = now.getFullYear();
    const mois = now.getMonth() + 1;

    const { data, error } = await supabase.rpc("fn_encaissement_initialiser_session", {
      p_annee: annee,
      p_mois: mois,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) throw new Error("Session du mois introuvable.");
    setSession(row as SessionRow);
  }

  async function chargerPersonnes() {
    const { data: personnes, error } = await supabase.rpc("fn_encaissement_personnes_uniques");

    if (error) throw new Error(error.message);

    const list: PersonneRow[] = ((personnes ?? []) as any[]).map((p: any) => ({
      id: p.id,
      nom_complet: p.nom_complet,
      telephone: p.telephone ?? null,
      type_personne: p.type_personne as "MEMBRE" | "PREINSCRIT",
    }));

    setPersonnes(list);
  }

  async function chargerRubriques() {
    const { data, error } = await supabase.from("rubriques").select("id, nom");
    if (error || !data || data.length === 0) {
      setRubriques(DEFAULT_RUBRIQUES);
      return;
    }

    const uniques = new Map<string, RubriqueRow>();
    for (const row of data as any[]) {
      const nom = (row.nom ?? "").trim();
      if (!nom) continue;
      uniques.set(normalizeName(nom), { id: row.id ?? null, nom });
    }

    const merged = [...DEFAULT_RUBRIQUES];
    for (const item of uniques.values()) {
      if (!merged.some((r) => normalizeName(r.nom) === normalizeName(item.nom))) {
        merged.push(item);
      }
    }

    merged.sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
    );
    setRubriques(merged);
  }

  async function chargerDetails(personne?: PersonneRow | null) {
    const cible = personne ?? selectedPersonne;
    if (!cible) {
      setDetails([]);
      return;
    }

    const viewName =
      cible.type_personne === "MEMBRE"
        ? "v_encaissements_membres_suivi"
        : "v_encaissements_preinscrits_suivi";

    const { data, error } = await supabase
      .from(viewName)
      .select("*")
      .eq("personne_id", cible.id)
      .order("annee", { ascending: false })
      .order("mois", { ascending: false })
      .order("rubrique_nom", { ascending: true });

    if (error) {
      setError(error.message);
      setDetails([]);
      return;
    }

    setDetails((data ?? []) as DetailRow[]);
  }

  async function chargerTout() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      setErrorAttendu(null);
      setMessageAttendu(null);
      setErrorCaisse(null);
      setMessageCaisse(null);

      await Promise.all([chargerSession(), chargerPersonnes(), chargerRubriques()]);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerTout();
  }, []);

  useEffect(() => {
    if (selectedPersonne) {
      chargerDetails(selectedPersonne);
    } else {
      setDetails([]);
    }
  }, [selectedKey]);

  function setMontant(rubriqueNom: string, value: string) {
    setMontants((prev) => ({
      ...prev,
      [rubriqueNom]: value,
    }));
  }

  function addQuick(rubriqueNom: string, amount: number) {
    const current = Number(montants[rubriqueNom] || 0);
    setMontants((prev) => ({
      ...prev,
      [rubriqueNom]: String(current + amount),
    }));
  }

  function addExpectedQuick(amount: number) {
    const current = Number(expectedMontant || 0);
    setExpectedMontant(String(current + amount));
  }

  const totalSaisi = useMemo(() => {
    return rubriques.reduce((sum, r) => sum + Number(montants[r.nom] || 0), 0);
  }, [rubriques, montants]);

  async function encaisser() {
    if (!session?.id) {
      setError("Session du mois introuvable.");
      return;
    }

    if (isSessionClosed(session)) {
      setError("La caisse du mois est fermée. Réouvre la session pour encaisser.");
      return;
    }

    if (!selectedPersonne) {
      setError("Sélectionne un membre ou un préinscrit.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const ventilations = rubriques
        .map((r) => {
          const brut = montants[r.nom];
          const montant = Number(brut || 0);
          return {
            rubrique_nom: r.nom,
            rubrique_id: r.id ?? null,
            montant,
          };
        })
        .filter((v) => v.montant > 0);

      if (ventilations.length === 0) {
        setError("Aucun montant saisi. Laisse au moins une rubrique supérieure à 0.");
        setBusy(false);
        return;
      }

      const rpcPayload = {
        p_session_id: session.id,
        p_membre_id:
          selectedPersonne.type_personne === "MEMBRE" ? selectedPersonne.id : null,
        p_preinscrit_id:
          selectedPersonne.type_personne === "PREINSCRIT"
            ? selectedPersonne.id
            : null,
        p_mode_paiement: "ESPECES",
        p_reference: null,
        p_commentaire: "Encaissement du mois",
        p_ventilations: ventilations.map((v) => ({
          rubrique: v.rubrique_nom,
          montant: v.montant,
        })),
      };

      const { data, error } = await supabase.rpc("fn_encaisser", rpcPayload);

      if (error) throw new Error(error.message);

      const row = Array.isArray(data) ? data[0] : data;
      if (row?.code && row.code !== "OK") {
        throw new Error(row.message ?? "Encaissement refusé.");
      }

      setMessage("Encaissement enregistré avec succès.");
      setMontants({});
      await chargerDetails(selectedPersonne);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'encaissement.");
    } finally {
      setBusy(false);
    }
  }

  async function encaisserAttendu() {
    if (!session?.id) {
      setErrorAttendu("Session du mois introuvable.");
      return;
    }

    if (isSessionClosed(session)) {
      setErrorAttendu("La caisse du mois est fermée. Réouvre la session pour encaisser.");
      return;
    }

    if (!expectedPersonne) {
      setErrorAttendu("Sélectionne un membre ou un préinscrit.");
      return;
    }

    if (!expectedRubriqueNom) {
      setErrorAttendu("Sélectionne une rubrique.");
      return;
    }

    const montant = Number(expectedMontant || 0);
    if (montant <= 0) {
      setErrorAttendu("Saisis un montant attendu supérieur à 0.");
      return;
    }

    setBusyAttendu(true);
    setErrorAttendu(null);
    setMessageAttendu(null);

    try {
      const { data, error } = await supabase.rpc("fn_encaisser", {
        p_session_id: session.id,
        p_membre_id:
          expectedPersonne.type_personne === "MEMBRE" ? expectedPersonne.id : null,
        p_preinscrit_id:
          expectedPersonne.type_personne === "PREINSCRIT"
            ? expectedPersonne.id
            : null,
        p_mode_paiement: "ESPECES",
        p_reference: null,
        p_commentaire: "Encaissement attendu / régularisation",
        p_ventilations: [
          {
            rubrique: expectedRubriqueNom,
            montant,
          },
        ],
      });

      if (error) throw new Error(error.message);

      const row = Array.isArray(data) ? data[0] : data;
      if (row?.code && row.code !== "OK") {
        throw new Error(row.message ?? "Encaissement refusé.");
      }

      setMessageAttendu("Encaissement attendu enregistré avec succès.");
      setExpectedMontant("");
      setExpectedRubriqueNom("");

      const newSelectedKey = `${expectedPersonne.type_personne}::${expectedPersonne.id}`;
      setSelectedKey(newSelectedKey);
      await chargerDetails(expectedPersonne);
    } catch (e: any) {
      setErrorAttendu(e?.message ?? "Erreur lors de l'encaissement attendu.");
    } finally {
      setBusyAttendu(false);
    }
  }

  async function callRpcUntilOneWorks(functionNames: string[]) {
    let lastError = "Aucune action n'a pu être exécutée.";

    for (const fnName of functionNames) {
      const { error } = await supabase.rpc(fnName, {
        p_session_id: session?.id,
      });

      if (!error) return;

      lastError = error.message;
    }

    throw new Error(lastError);
  }

  async function ouvrirCaisse() {
    if (!session?.id) {
      setErrorCaisse("Session du mois introuvable.");
      return;
    }

    setBusyCaisse(true);
    setErrorCaisse(null);
    setMessageCaisse(null);

    try {
      await callRpcUntilOneWorks([
        "fn_ouvrir_caisse_session",
        "fn_encaissement_ouvrir_session",
        "fn_session_ouvrir",
      ]);

      await chargerSession();
      setMessageCaisse("Caisse du mois ouverte avec succès.");
    } catch (e: any) {
      setErrorCaisse(
        e?.message ??
          "Impossible d'ouvrir la caisse. Vérifie le RPC backend d'ouverture."
      );
    } finally {
      setBusyCaisse(false);
    }
  }

  async function fermerCaisse() {
    if (!session?.id) {
      setErrorCaisse("Session du mois introuvable.");
      return;
    }

    setBusyCaisse(true);
    setErrorCaisse(null);
    setMessageCaisse(null);

    try {
      await callRpcUntilOneWorks([
        "fn_fermer_caisse_session",
        "fn_encaissement_fermer_session",
        "fn_session_fermer",
      ]);

      await chargerSession();
      setMessageCaisse("Caisse du mois fermée avec succès.");
    } catch (e: any) {
      setErrorCaisse(
        e?.message ??
          "Impossible de fermer la caisse. Vérifie le RPC backend de fermeture."
      );
    } finally {
      setBusyCaisse(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">
                Encaissements
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Encaissement du mois
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Saisie directe par rubrique. Les champs vides sont considérés à 0.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] px-4 py-3 text-sm text-slate-200">
              {session ? (
                <>
                  <div className="font-medium text-white">
                    Session {String(session.mois).padStart(2, "0")}/{session.annee}
                  </div>
                  <div>Statut : {session.statut}</div>
                </>
              ) : (
                "Chargement session..."
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
                Ouverture / fermeture caisse du mois
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Gestion de la caisse mensuelle
              </h2>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                isSessionClosed(session)
                  ? "border border-red-700/40 bg-red-500/10 text-red-200"
                  : "border border-emerald-700/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {session ? session.statut : "Chargement..."}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_auto]">
            <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4 text-sm text-slate-300">
              <div className="mb-2 font-medium text-white">
                Session {session ? `${String(session.mois).padStart(2, "0")}/${session.annee}` : "-"}
              </div>
              <p>
                Ce bloc permet d'ouvrir ou de fermer la caisse du mois. Quand la caisse
                est fermée, aucun encaissement ne doit être validé.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={ouvrirCaisse}
                disabled={busyCaisse}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyCaisse ? "Ouverture..." : "Ouvrir la caisse"}
              </button>

              <button
                type="button"
                onClick={fermerCaisse}
                disabled={busyCaisse}
                className="rounded-2xl bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyCaisse ? "Fermeture..." : "Fermer la caisse"}
              </button>
            </div>
          </div>

          {messageCaisse ? (
            <div className="mt-4 rounded-2xl border border-emerald-700/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
              {messageCaisse}
            </div>
          ) : null}

          {errorCaisse ? (
            <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-red-200">
              {errorCaisse}
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              Encaissements attendus
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Régularisation rapide
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Bloc dédié aux régularisations pour aider les calculs automatiques de
              retards et les calculs futurs.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Membre / Préinscrit
                </label>
                <select
                  value={expectedPersonneKey}
                  onChange={(e) => setExpectedPersonneKey(e.target.value)}
                  className="w-full rounded-2xl border border-cyan-800/40 bg-[#07142f] px-4 py-3 text-white outline-none"
                >
                  <option value="">Sélectionner</option>
                  {personnes.map((p) => (
                    <option
                      key={`${p.type_personne}::${p.id}`}
                      value={`${p.type_personne}::${p.id}`}
                    >
                      {p.nom_complet} - {p.type_personne}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Rubrique</label>
                <select
                  value={expectedRubriqueNom}
                  onChange={(e) => setExpectedRubriqueNom(e.target.value)}
                  className="w-full rounded-2xl border border-cyan-800/40 bg-[#07142f] px-4 py-3 text-white outline-none"
                >
                  <option value="">Sélectionner</option>
                  {rubriques.map((r) => (
                    <option key={r.nom} value={r.nom}>
                      {r.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Montant attendu
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expectedMontant}
                  onChange={(e) => setExpectedMontant(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border border-cyan-800/40 bg-[#07142f] px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => addExpectedQuick(20)}
                className="rounded-xl border border-cyan-700/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
              >
                +20 €
              </button>

              <button
                type="button"
                onClick={() => addExpectedQuick(50)}
                className="rounded-xl border border-cyan-700/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
              >
                +50 €
              </button>

              <button
                type="button"
                onClick={encaisserAttendu}
                disabled={busyAttendu}
                className="rounded-2xl bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAttendu ? "Encaissement..." : "Encaisser"}
              </button>
            </div>
          </div>

          {messageAttendu ? (
            <div className="mt-4 rounded-2xl border border-emerald-700/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
              {messageAttendu}
            </div>
          ) : null}

          {errorAttendu ? (
            <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-red-200">
              {errorAttendu}
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Chargement...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Membre / Préinscrit
                  </label>
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="w-full rounded-2xl border border-cyan-800/40 bg-[#081735] px-4 py-3 text-white outline-none"
                  >
                    <option value="">Sélectionner</option>
                    {personnes.map((p) => (
                      <option key={`${p.type_personne}::${p.id}`} value={`${p.type_personne}::${p.id}`}>
                        {p.nom_complet} - {p.type_personne}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] px-4 py-3 text-sm text-slate-300">
                  <div className="mb-1 font-medium text-white">Personne sélectionnée</div>
                  <div>{selectedPersonne ? selectedPersonne.nom_complet : "-"}</div>
                  <div>{selectedPersonne ? selectedPersonne.type_personne : "-"}</div>
                  <div>
                    Total saisi :{" "}
                    <span className="font-semibold text-white">{euro(totalSaisi)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
                <div className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-cyan-200">
                  Rubriques et montants
                </div>

                <div className="space-y-3">
                  {rubriques.map((r) => {
                    const quicks = QUICK_BUTTONS[r.nom] ?? [];
                    return (
                      <div
                        key={r.nom}
                        className="grid gap-3 rounded-2xl border border-slate-800 bg-[#07142f] p-3 lg:grid-cols-[1.5fr_220px_auto]"
                      >
                        <div className="flex items-center text-white">{r.nom}</div>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={montants[r.nom] ?? ""}
                          onChange={(e) => setMontant(r.nom, e.target.value)}
                          placeholder="0"
                          className="rounded-xl border border-cyan-800/40 bg-[#081735] px-3 py-2 text-white outline-none"
                        />

                        <div className="flex flex-wrap gap-2">
                          {quicks.map((amount) => (
                            <button
                              key={`${r.nom}-${amount}`}
                              type="button"
                              onClick={() => addQuick(r.nom, amount)}
                              className="rounded-xl border border-cyan-700/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
                            >
                              +{amount}€
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-300">
                    Les rubriques non renseignées sont automatiquement considérées à 0.
                  </div>

                  <button
                    type="button"
                    onClick={encaisser}
                    disabled={busy}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Encaissement..." : "Valider l'encaissement"}
                  </button>
                </div>
              </div>

              {message ? (
                <div className="rounded-2xl border border-emerald-700/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
                Situation détaillée
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Vue claire de la situation
              </h2>
            </div>

            <span className="rounded-full border border-cyan-800/40 bg-[#081735] px-3 py-1 text-sm text-slate-300">
              {details.length} ligne{details.length > 1 ? "s" : ""}
            </span>
          </div>

          {!selectedPersonne ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Sélectionne un membre ou un préinscrit pour afficher sa situation.
            </div>
          ) : details.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Aucune donnée détaillée pour cette personne.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
                  <div className="text-sm text-slate-300">Total attendu</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {euro(detailSummary.attendu)}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
                  <div className="text-sm text-slate-300">Total encaissé</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {euro(detailSummary.encaisse)}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4">
                  <div className="text-sm text-slate-300">Total retard</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {euro(detailSummary.retard)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {details.map((d, idx) => (
                  <div
                    key={`${d.personne_id}-${d.rubrique_nom}-${idx}`}
                    className="rounded-2xl border border-cyan-900/40 bg-[#081735] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-cyan-200">{d.session_libelle}</div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {d.rubrique_nom}
                        </div>
                      </div>

                      <span className="rounded-full border border-cyan-800/40 bg-[#07142f] px-3 py-1 text-xs text-slate-300">
                        {selectedPersonne.type_personne}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-800 bg-[#07142f] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                          Attendu
                        </div>
                        <div className="mt-2 font-semibold text-white">
                          {euro(d.montant_attendu)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#07142f] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                          Encaissé
                        </div>
                        <div className="mt-2 font-semibold text-white">
                          {euro(d.montant_encaisse)}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#07142f] p-3">
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                          Retard
                        </div>
                        <div className="mt-2 font-semibold text-white">
                          {euro(d.montant_retard)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
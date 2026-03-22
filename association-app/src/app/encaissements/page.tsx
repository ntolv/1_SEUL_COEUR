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
  "Repas": [20],
  "Anniversaire": [30],
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

export default function EncaissementsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [personnes, setPersonnes] = useState<PersonneRow[]>([]);
  const [rubriques, setRubriques] = useState<RubriqueRow[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [montants, setMontants] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPersonne = useMemo(() => {
    if (!selectedKey) return null;
    const [type, id] = selectedKey.split("::");
    return personnes.find((p) => p.id === id && p.type_personne === type) ?? null;
  }, [selectedKey, personnes]);

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
    const [{ data: membres, error: errM }, { data: preinscrits, error: errP }] = await Promise.all([
      supabase.from("membres").select("id, nom_complet, telephone"),
      supabase.from("membres_preinscriptions").select("id, nom_complet, telephone"),
    ]);

    if (errM) throw new Error(errM.message);
    if (errP) throw new Error(errP.message);

    const list: PersonneRow[] = [
      ...((membres ?? []).map((m: any) => ({
        id: m.id,
        nom_complet: m.nom_complet,
        telephone: m.telephone ?? null,
        type_personne: "MEMBRE" as const,
      }))),
      ...((preinscrits ?? []).map((p: any) => ({
        id: p.id,
        nom_complet: p.nom_complet,
        telephone: p.telephone ?? null,
        type_personne: "PREINSCRIT" as const,
      }))),
    ];

    list.sort((a, b) => a.nom_complet.localeCompare(b.nom_complet, "fr", { sensitivity: "base" }));
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

    merged.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
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

  const totalSaisi = useMemo(() => {
    return rubriques.reduce((sum, r) => sum + Number(montants[r.nom] || 0), 0);
  }, [rubriques, montants]);

  async function encaisser() {
    if (!session?.id) {
      setError("Session du mois introuvable.");
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
          selectedPersonne.type_personne === "MEMBRE"
            ? selectedPersonne.id
            : null,
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
                  <div>Total saisi : <span className="font-semibold text-white">{euro(totalSaisi)}</span></div>
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
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              Situation détaillée
            </p>
            <span className="rounded-full border border-cyan-800/40 bg-[#081735] px-3 py-1 text-sm text-slate-300">
              {details.length} ligne{details.length > 1 ? "s" : ""}
            </span>
          </div>

          {!selectedPersonne ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Sélectionne un membre ou un préinscrit pour afficher sa situation détaillée.
            </div>
          ) : details.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Aucune donnée détaillée pour cette personne.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-900/40 text-left text-cyan-200">
                    <th className="px-3 py-3">Session</th>
                    <th className="px-3 py-3">Rubrique</th>
                    <th className="px-3 py-3">Attendu</th>
                    <th className="px-3 py-3">Encaissé</th>
                    <th className="px-3 py-3">Retard</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, idx) => (
                    <tr key={`${d.personne_id}-${d.rubrique_nom}-${idx}`} className="border-b border-slate-800 text-slate-200">
                      <td className="px-3 py-3">{d.session_libelle}</td>
                      <td className="px-3 py-3 font-medium text-white">{d.rubrique_nom}</td>
                      <td className="px-3 py-3">{euro(d.montant_attendu)}</td>
                      <td className="px-3 py-3">{euro(d.montant_encaisse)}</td>
                      <td className="px-3 py-3">{euro(d.montant_retard)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type MembreRow = {
  id: string;
  nom_complet: string;
  role?: string | null;
  statut_actif?: boolean | null;
};

type RubriqueRow = {
  id: number;
  code: string;
  nom: string;
  solde_global?: number;
};

type DecaissementRow = {
  id: number;
  created_at: string;
  type_decaissement: "SECOURS" | "DECAISSEMENT_SIMPLE" | "PRET";
  rubrique_source_code: string;
  montant: number;
  motif: string;
  commentaire: string | null;
  statut: string;
  beneficiaire_nom?: string | null;
  auteur_nom?: string | null;
};

type FormDataPayload = {
  rubriques?: RubriqueRow[];
  membres?: MembreRow[];
};

const ROLES_AUTORISES = new Set(["ADMIN", "PRESIDENT", "TRESORIER"]);

function formatMontant(valeur: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valeur ?? 0));
}

function parsePositiveNumber(value: string) {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function isSimpleRubrique(r: RubriqueRow) {
  const code = normalize(r.code);
  return [
    "TONTINE",
    "TONTINE PETIT CAHIER",
    "REPAS",
    "ANNIVERSAIRE",
    "FOND DE ROULEMENT",
  ].includes(code);
}

function QuickAmountButtons({
  onAdd,
}: {
  onAdd: (amount: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onAdd(10)}
        className="rounded-[18px] border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"
      >
        +10€
      </button>
      <button
        type="button"
        onClick={() => onAdd(100)}
        className="rounded-[18px] border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"
      >
        +100€
      </button>
      <button
        type="button"
        onClick={() => onAdd(500)}
        className="rounded-[18px] border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"
      >
        +500€
      </button>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-950/50 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="mb-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

const selectClassName =
  "w-full rounded-[18px] border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40";

const inputClassName =
  "w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40";

export default function DecaissementsPage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [rubriques, setRubriques] = useState<RubriqueRow[]>([]);
  const [membres, setMembres] = useState<MembreRow[]>([]);
  const [historique, setHistorique] = useState<DecaissementRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [submittingSecours, setSubmittingSecours] = useState(false);
  const [submittingSimple, setSubmittingSimple] = useState(false);
  const [submittingPret, setSubmittingPret] = useState(false);

  const [secoursMembreId, setSecoursMembreId] = useState("");
  const [secoursMontant, setSecoursMontant] = useState("0");
  const [secoursMotif, setSecoursMotif] = useState("");
  const [secoursCommentaire, setSecoursCommentaire] = useState("");

  const [simpleRubrique, setSimpleRubrique] = useState("");
  const [simpleMembreId, setSimpleMembreId] = useState("");
  const [simpleMontant, setSimpleMontant] = useState("0");
  const [simpleMotif, setSimpleMotif] = useState("");
  const [simpleCommentaire, setSimpleCommentaire] = useState("");

  const [pretMembreId, setPretMembreId] = useState("");
  const [pretMontant, setPretMontant] = useState("0");
  const [pretMotif, setPretMotif] = useState("");
  const [pretCommentaire, setPretCommentaire] = useState("");

  const rubriquesSecours = useMemo(
    () => rubriques.filter((r) => normalize(r.code) === "SECOURS"),
    [rubriques]
  );

  const rubriquesSimples = useMemo(
    () => rubriques.filter((r) => isSimpleRubrique(r)),
    [rubriques]
  );

  const rubriqueInvestissement = useMemo(
    () => rubriques.find((r) => normalize(r.code) === "INVESTISSEMENT") || null,
    [rubriques]
  );

  async function loadPage() {
    setLoading(true);
    setError(null);

    const roleRes = await supabase.rpc("fn_decaissements_current_role");
    if (roleRes.error) {
      setError(roleRes.error.message);
      setLoading(false);
      return;
    }

    const currentRole = String(roleRes.data ?? "").toUpperCase() || null;
    setRole(currentRole);

    if (!currentRole || !ROLES_AUTORISES.has(currentRole)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setAccessDenied(false);

    const formDataRes = await supabase.rpc("fn_decaissements_form_data");
    if (formDataRes.error) {
      setError(formDataRes.error.message);
      setLoading(false);
      return;
    }

    const payload = (formDataRes.data ?? {}) as FormDataPayload;
    const rubriquesRows = Array.isArray(payload.rubriques) ? payload.rubriques : [];
    const membresRows = Array.isArray(payload.membres) ? payload.membres : [];

    setRubriques(rubriquesRows);
    setMembres(membresRows);

    const defaultSimple = rubriquesRows.find((r) => isSimpleRubrique(r))?.code || "";

    setSimpleRubrique((prev) =>
      prev && rubriquesRows.some((r) => r.code === prev) ? prev : defaultSimple
    );

    const defaultMembreId = membresRows[0]?.id ?? "";
    setSecoursMembreId((prev) =>
      prev && membresRows.some((m) => m.id === prev) ? prev : defaultMembreId
    );
    setSimpleMembreId((prev) =>
      prev && membresRows.some((m) => m.id === prev) ? prev : defaultMembreId
    );
    setPretMembreId((prev) =>
      prev && membresRows.some((m) => m.id === prev) ? prev : defaultMembreId
    );

    const histRes = await supabase
      .from("v_decaissements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (histRes.error) {
      setError(histRes.error.message);
      setLoading(false);
      return;
    }

    setHistorique((histRes.data ?? []) as DecaissementRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const totalRecent = useMemo(() => {
    return historique.reduce((sum, row) => sum + Number(row.montant ?? 0), 0);
  }, [historique]);

  async function submitSecours(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingSecours(true);
    setMessage(null);
    setError(null);

    const res = await supabase.rpc("fn_creer_decaissement_secours", {
      p_membre_beneficiaire_id: secoursMembreId,
      p_montant: parsePositiveNumber(secoursMontant),
      p_motif: secoursMotif,
      p_commentaire: secoursCommentaire,
    });

    if (res.error) {
      setError(res.error.message);
      setSubmittingSecours(false);
      return;
    }

    setMessage("Décaissement secours enregistré avec succès.");
    setSecoursMontant("0");
    setSecoursMotif("");
    setSecoursCommentaire("");
    setSubmittingSecours(false);
    await loadPage();
  }

  async function submitSimple(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingSimple(true);
    setMessage(null);
    setError(null);

    const res = await supabase.rpc("fn_creer_decaissement_tontine", {
      p_rubrique_code: simpleRubrique,
      p_membre_beneficiaire_id: simpleMembreId,
      p_montant: parsePositiveNumber(simpleMontant),
      p_motif: simpleMotif,
      p_commentaire: simpleCommentaire,
    });

    if (res.error) {
      setError(res.error.message);
      setSubmittingSimple(false);
      return;
    }

    setMessage("Décaissement simple enregistré avec succès.");
    setSimpleMontant("0");
    setSimpleMotif("");
    setSimpleCommentaire("");
    setSubmittingSimple(false);
    await loadPage();
  }

  async function submitPret(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingPret(true);
    setMessage(null);
    setError(null);

    const res = await supabase.rpc("fn_creer_decaissement_pret", {
      p_membre_beneficiaire_id: pretMembreId,
      p_montant: parsePositiveNumber(pretMontant),
      p_motif: pretMotif,
      p_commentaire: pretCommentaire,
    });

    if (res.error) {
      setError(res.error.message);
      setSubmittingPret(false);
      return;
    }

    setMessage("Décaissement prêt enregistré avec succès.");
    setPretMontant("0");
    setPretMotif("");
    setPretCommentaire("");
    setSubmittingPret(false);
    await loadPage();
  }

  function addSecoursAmount(amount: number) {
    setSecoursMontant(String(parsePositiveNumber(secoursMontant) + amount));
  }

  function addSimpleAmount(amount: number) {
    setSimpleMontant(String(parsePositiveNumber(simpleMontant) + amount));
  }

  function addPretAmount(amount: number) {
    setPretMontant(String(parsePositiveNumber(pretMontant) + amount));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-slate-950/50 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">
                USC — Décaissements
              </div>
              <h1 className="mt-4 text-3xl font-black text-white">Sorties de caisse</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Secours collectif, décaissements simples et prêts investissement.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Accès réservé à President / Tresorier / Admin
                {role ? ` — rôle détecté : ${role}` : ""}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                15 derniers décaissements
              </div>
              <div className="mt-2 text-2xl font-black text-white">{formatMontant(totalRecent)}</div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/10 bg-slate-950/50 p-6 text-slate-300 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            Chargement...
          </div>
        ) : accessDenied ? (
          <div className="rounded-[32px] border border-red-500/20 bg-red-500/10 p-6 text-red-200 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            Accès refusé. Cette page est réservée exclusivement à President / Tresorier / Admin.
          </div>
        ) : (
          <>
            {message ? (
              <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <SectionCard
                title="Secours"
                subtitle={`Solde global : ${formatMontant(Number(rubriquesSecours[0]?.solde_global ?? 0))}`}
              >
                <form className="space-y-4" onSubmit={submitSecours}>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Membre bénéficiaire
                    </label>
                    <select
                      value={secoursMembreId}
                      onChange={(e) => setSecoursMembreId(e.target.value)}
                      className={selectClassName}
                    >
                      <option style={{ backgroundColor: "#0f172a", color: "#ffffff" }} value="">
                        Sélectionner un membre
                      </option>
                      {membres.map((membre) => (
                        <option
                          style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                          key={membre.id}
                          value={membre.id}
                        >
                          {membre.nom_complet}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Montant
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={secoursMontant}
                      onChange={(e) => setSecoursMontant(e.target.value)}
                      className={inputClassName}
                    />
                    <div className="mt-3">
                      <QuickAmountButtons onAdd={addSecoursAmount} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Motif
                    </label>
                    <textarea
                      value={secoursMotif}
                      onChange={(e) => setSecoursMotif(e.target.value)}
                      rows={3}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Commentaire
                    </label>
                    <textarea
                      value={secoursCommentaire}
                      onChange={(e) => setSecoursCommentaire(e.target.value)}
                      rows={2}
                      className={inputClassName}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingSecours || !rubriquesSecours.length || !membres.length}
                    className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingSecours ? "Enregistrement..." : "Valider secours"}
                  </button>
                </form>
              </SectionCard>

              <SectionCard
                title="Décaissement simple"
                subtitle={rubriquesSimples.length > 0
                  ? rubriquesSimples
                      .map((r) => `${r.nom}: ${formatMontant(Number(r.solde_global ?? 0))}`)
                      .join(" — ")
                  : "Aucune rubrique simple disponible"}
              >
                <form className="space-y-4" onSubmit={submitSimple}>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Rubrique
                    </label>
                    <select
                      value={simpleRubrique}
                      onChange={(e) => setSimpleRubrique(e.target.value)}
                      className={selectClassName}
                    >
                      <option style={{ backgroundColor: "#0f172a", color: "#ffffff" }} value="">
                        Sélectionner une rubrique
                      </option>
                      {rubriquesSimples.map((rubrique) => (
                        <option
                          style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                          key={rubrique.id}
                          value={rubrique.code}
                        >
                          {rubrique.nom} — {formatMontant(Number(rubrique.solde_global ?? 0))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Membre bénéficiaire
                    </label>
                    <select
                      value={simpleMembreId}
                      onChange={(e) => setSimpleMembreId(e.target.value)}
                      className={selectClassName}
                    >
                      <option style={{ backgroundColor: "#0f172a", color: "#ffffff" }} value="">
                        Sélectionner un membre
                      </option>
                      {membres.map((membre) => (
                        <option
                          style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                          key={membre.id}
                          value={membre.id}
                        >
                          {membre.nom_complet}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Montant
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={simpleMontant}
                      onChange={(e) => setSimpleMontant(e.target.value)}
                      className={inputClassName}
                    />
                    <div className="mt-3">
                      <QuickAmountButtons onAdd={addSimpleAmount} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Motif
                    </label>
                    <textarea
                      value={simpleMotif}
                      onChange={(e) => setSimpleMotif(e.target.value)}
                      rows={3}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Commentaire
                    </label>
                    <textarea
                      value={simpleCommentaire}
                      onChange={(e) => setSimpleCommentaire(e.target.value)}
                      rows={2}
                      className={inputClassName}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingSimple || !rubriquesSimples.length || !membres.length}
                    className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingSimple ? "Enregistrement..." : "Valider décaissement simple"}
                  </button>
                </form>
              </SectionCard>

              <SectionCard
                title="Prêts investissement"
                subtitle={`Solde global : ${formatMontant(Number(rubriqueInvestissement?.solde_global ?? 0))}`}
              >
                <form className="space-y-4" onSubmit={submitPret}>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Membre bénéficiaire
                    </label>
                    <select
                      value={pretMembreId}
                      onChange={(e) => setPretMembreId(e.target.value)}
                      className={selectClassName}
                    >
                      <option style={{ backgroundColor: "#0f172a", color: "#ffffff" }} value="">
                        Sélectionner un membre
                      </option>
                      {membres.map((membre) => (
                        <option
                          style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                          key={membre.id}
                          value={membre.id}
                        >
                          {membre.nom_complet}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Montant
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pretMontant}
                      onChange={(e) => setPretMontant(e.target.value)}
                      className={inputClassName}
                    />
                    <div className="mt-3">
                      <QuickAmountButtons onAdd={addPretAmount} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Motif
                    </label>
                    <textarea
                      value={pretMotif}
                      onChange={(e) => setPretMotif(e.target.value)}
                      rows={3}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Commentaire
                    </label>
                    <textarea
                      value={pretCommentaire}
                      onChange={(e) => setPretCommentaire(e.target.value)}
                      rows={2}
                      className={inputClassName}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPret || !rubriqueInvestissement || !membres.length}
                    className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingPret ? "Enregistrement..." : "Valider prêt"}
                  </button>
                </form>
              </SectionCard>
            </div>

            <SectionCard
              title="Derniers décaissements"
              subtitle="Historique rapide des 15 derniers mouvements"
            >
              {historique.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                  Aucun décaissement enregistré pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {historique.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-white">
                            {row.beneficiaire_nom || "Bénéficiaire"}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {row.type_decaissement} — {row.rubrique_source_code}
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100">
                          {formatMontant(Number(row.montant ?? 0))}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-300">
                        <p>
                          <span className="font-semibold text-white">Motif :</span> {row.motif}
                        </p>
                        <p>
                          <span className="font-semibold text-white">Commentaire :</span>{" "}
                          {row.commentaire || "-"}
                        </p>
                        <p>
                          <span className="font-semibold text-white">Date :</span>{" "}
                          {new Date(row.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}

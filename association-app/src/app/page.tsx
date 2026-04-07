"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Profil = {
  id: string;
  email: string | null;
  nom_complet: string | null;
  telephone: string | null;
  role: string | null;
  statut_actif: boolean | null;
  photo_url: string | null;
  photo_storage_path: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ContributionItem = {
  rubrique: string;
  montant: number;
};

type AidePretItem = {
  id: string;
  libelle: string;
  montant: number;
  statut: string | null;
  type: "AIDE" | "PRET";
};

function getInitiales(nom: string | null | undefined) {
  const value = (nom ?? "").trim();
  if (!value) return "US";
  return value
    .split(" ")
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatMontant(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

async function loadProfil(userId: string): Promise<Profil | null> {
  const candidats = [
    { table: "profils", idColumn: "id" },
    { table: "membres", idColumn: "id" },
    { table: "v_membres", idColumn: "id" },
    { table: "utilisateurs", idColumn: "id" },
    { table: "utilisateurs", idColumn: "user_id" },
  ];

  for (const candidat of candidats) {
    const { data, error } = await supabase
      .from(candidat.table)
      .select("*")
      .eq(candidat.idColumn, userId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: String((data as any).id ?? userId),
        email: (data as any).email ?? null,
        nom_complet:
          (data as any).nom_complet ??
          (data as any).full_name ??
          (data as any).nom ??
          null,
        telephone:
          (data as any).telephone ??
          (data as any).phone ??
          (data as any).numero_telephone ??
          null,
        role: (data as any).role ?? (data as any).profil ?? null,
        statut_actif:
          typeof (data as any).statut_actif === "boolean"
            ? (data as any).statut_actif
            : typeof (data as any).actif === "boolean"
              ? (data as any).actif
              : null,
        photo_url:
          (data as any).photo_url ??
          (data as any).avatar_url ??
          (data as any).photo ??
          null,
        photo_storage_path: (data as any).photo_storage_path ?? null,
        created_at: (data as any).created_at ?? null,
        updated_at: (data as any).updated_at ?? null,
      };
    }
  }

  return {
    id: userId,
    email: null,
    nom_complet: "Membre connecté",
    telephone: null,
    role: null,
    statut_actif: null,
    photo_url: null,
    photo_storage_path: null,
    created_at: null,
    updated_at: null,
  };
}

async function loadContributions(userId: string): Promise<ContributionItem[]> {
  const sources = [
    { table: "v_contributions", memberColumn: "membre_id" },
    { table: "contributions", memberColumn: "membre_id" },
    { table: "contributions", memberColumn: "user_id" },
  ];

  for (const source of sources) {
    const { data, error } = await supabase
      .from(source.table)
      .select("*")
      .eq(source.memberColumn, userId);

    if (!error && Array.isArray(data)) {
      const map = new Map<string, number>();

      for (const row of data as any[]) {
        const rubrique =
          row.rubrique ??
          row.rubrique_nom ??
          row.libelle_rubrique ??
          row.type_contribution ??
          "Rubrique non renseignée";

        const montant = Number(
          row.montant ??
          row.montant_total ??
          row.montant_paye ??
          row.total ??
          0
        );

        map.set(rubrique, (map.get(rubrique) ?? 0) + (Number.isFinite(montant) ? montant : 0));
      }

      return Array.from(map.entries())
        .map(([rubrique, montant]) => ({ rubrique, montant }))
        .sort((a, b) => b.montant - a.montant);
    }
  }

  return [];
}

async function loadAidesEtPrets(userId: string): Promise<AidePretItem[]> {
  const result: AidePretItem[] = [];

  const aidesSources = [
    { table: "v_aides", memberColumn: "membre_id" },
    { table: "aides", memberColumn: "membre_id" },
    { table: "aides", memberColumn: "user_id" },
  ];

  for (const source of aidesSources) {
    const { data, error } = await supabase
      .from(source.table)
      .select("*")
      .eq(source.memberColumn, userId);

    if (!error && Array.isArray(data)) {
      for (const row of data as any[]) {
        result.push({
          id: String(row.id ?? `${source.table}-${Math.random()}`),
          libelle: row.libelle ?? row.objet ?? row.type_aide ?? "Aide",
          montant: Number(row.montant ?? row.montant_aide ?? row.total ?? 0),
          statut: row.statut ?? row.etat ?? null,
          type: "AIDE",
        });
      }
      break;
    }
  }

  const pretsSources = [
    { table: "v_prets", memberColumn: "membre_id" },
    { table: "prets", memberColumn: "membre_id" },
    { table: "prets", memberColumn: "user_id" },
  ];

  for (const source of pretsSources) {
    const { data, error } = await supabase
      .from(source.table)
      .select("*")
      .eq(source.memberColumn, userId);

    if (!error && Array.isArray(data)) {
      for (const row of data as any[]) {
        result.push({
          id: String(row.id ?? `${source.table}-${Math.random()}`),
          libelle: row.libelle ?? row.objet ?? row.type_pret ?? "Prêt",
          montant: Number(row.montant ?? row.montant_pret ?? row.total ?? 0),
          statut: row.statut ?? row.etat ?? null,
          type: "PRET",
        });
      }
      break;
    }
  }

  return result;
}

export default function HomePage() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [aidesEtPrets, setAidesEtPrets] = useState<AidePretItem[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      setChargement(true);
      setErreur(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("Utilisateur non connecté.");

        const [profilData, contributionsData, aidesPretsData] = await Promise.all([
          loadProfil(user.id),
          loadContributions(user.id),
          loadAidesEtPrets(user.id),
        ]);

        const finalProfil: Profil = {
          id: profilData?.id ?? user.id,
          email: profilData?.email ?? user.email ?? null,
          nom_complet: profilData?.nom_complet ?? user.email ?? "Membre connecté",
          telephone: profilData?.telephone ?? null,
          role: profilData?.role ?? null,
          statut_actif: profilData?.statut_actif ?? true,
          photo_url: profilData?.photo_url ?? null,
          photo_storage_path: profilData?.photo_storage_path ?? null,
          created_at: profilData?.created_at ?? null,
          updated_at: profilData?.updated_at ?? null,
        };

        setProfil(finalProfil);
        setContributions(contributionsData);
        setAidesEtPrets(aidesPretsData);
      } catch (e: any) {
        console.error(e);
        setErreur(e?.message ?? "Erreur de chargement.");
      } finally {
        setChargement(false);
      }
    }

    charger();
  }, []);

  const whatsappHref = useMemo(() => {
    const phone = normalizePhone(profil?.telephone);
    if (!phone) return null;
    const finalPhone = phone.startsWith("+") ? phone.slice(1) : phone;
    return "https://wa.me/" + finalPhone;
  }, [profil?.telephone]);

  const telephoneHref = useMemo(() => {
    const phone = normalizePhone(profil?.telephone);
    if (!phone) return null;
    return "tel:" + phone;
  }, [profil?.telephone]);

  const totalContributions = useMemo(() => {
    return contributions.reduce((sum, item) => sum + item.montant, 0);
  }, [contributions]);

  const aides = useMemo(() => aidesEtPrets.filter((item) => item.type === "AIDE"), [aidesEtPrets]);
  const prets = useMemo(() => aidesEtPrets.filter((item) => item.type === "PRET"), [aidesEtPrets]);

  const totalAides = useMemo(() => aides.reduce((sum, item) => sum + item.montant, 0), [aides]);
  const totalPrets = useMemo(() => prets.reduce((sum, item) => sum + item.montant, 0), [prets]);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-xl shadow-emerald-100">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
            Dashboard USC
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Situation synthétique du membre connecté
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/85 sm:text-base">
            Vue d’ensemble du profil, des contributions et de la situation aides / prêts.
          </p>
        </div>

        {chargement ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm">
            Chargement du dashboard...
          </div>
        ) : erreur ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700 shadow-sm">
            {erreur}
          </div>
        ) : (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-emerald-100 bg-emerald-50 text-3xl font-black text-emerald-700 shadow-inner">
                    {profil?.photo_url ? (
                      <img
                        src={profil.photo_url}
                        alt={profil.nom_complet ?? "Photo membre"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitiales(profil?.nom_complet)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">
                        {profil?.nom_complet ?? "Membre connecté"}
                      </h2>
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]",
                          profil?.statut_actif === false
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700",
                        ].join(" ")}
                      >
                        {profil?.statut_actif === false ? "Inactif" : "Actif"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {profil?.role ?? "Rôle non renseigné"}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Email
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                          {profil?.email ?? "Non renseigné"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Téléphone
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {profil?.telephone ?? "Non renseigné"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {telephoneHref ? (
                        <a
                          href={telephoneHref}
                          className="inline-flex items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
                        >
                          Appeler
                        </a>
                      ) : null}

                      {whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Date d’inscription
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {formatDate(profil?.created_at)}
                  </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Dernière mise à jour
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {formatDate(profil?.updated_at)}
                  </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Total contributions
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {formatMontant(totalContributions)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Contributions
                  </p>
                  <h3 className="text-xl font-black tracking-tight text-slate-900">
                    Synthèse par rubrique
                  </h3>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                  Total : {formatMontant(totalContributions)}
                </div>
              </div>

              {contributions.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
                  Aucune contribution trouvée pour le membre connecté.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {contributions.map((item) => (
                    <div
                      key={item.rubrique}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Rubrique
                      </p>
                      <p className="mt-2 text-base font-black text-slate-900">
                        {item.rubrique}
                      </p>
                      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Montant
                      </p>
                      <p className="mt-1 text-2xl font-black text-emerald-700">
                        {formatMontant(item.montant)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                      Aides
                    </p>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">
                      Situation aides obtenues
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                    Total : {formatMontant(totalAides)}
                  </div>
                </div>

                {aides.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
                    Aucune aide trouvée.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {aides.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.libelle}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {item.statut ?? "Statut non renseigné"}
                            </p>
                          </div>
                          <div className="text-lg font-black text-amber-700">
                            {formatMontant(item.montant)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                      Prêts
                    </p>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">
                      Situation prêts obtenus
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">
                    Total : {formatMontant(totalPrets)}
                  </div>
                </div>

                {prets.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
                    Aucun prêt trouvé.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {prets.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.libelle}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {item.statut ?? "Statut non renseigné"}
                            </p>
                          </div>
                          <div className="text-lg font-black text-sky-700">
                            {formatMontant(item.montant)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

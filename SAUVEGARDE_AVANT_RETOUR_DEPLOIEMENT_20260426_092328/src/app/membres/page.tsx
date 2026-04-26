"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Membre = {
  id: string;
  nom_complet?: string | null;
  email?: string | null;
  telephone?: string | null;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  role?: string | null;
  statut_actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function initials(name: string | null | undefined) {
  const clean = (name ?? "").trim();
  if (!clean) return "M";

  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isCurrentUser(membre: Membre, currentUserEmail: string | null) {
  return normalize(membre.email) !== "" && normalize(membre.email) === normalize(currentUserEmail);
}

export default function MembresPage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        setCurrentUserEmail(user?.email ?? null);

        const { data, error: membresError } = await supabase
          .from("membres")
          .select("id, nom_complet, email, telephone, photo_url, photo_storage_path, role, statut_actif, created_at, updated_at")
          .order("nom_complet", { ascending: true });

        if (membresError) {
          throw membresError;
        }

        setMembres((data ?? []) as Membre[]);
      } catch (e: any) {
        setError(e?.message ?? "Impossible de charger les membres.");
        setMembres([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const membresAffiches = useMemo(() => {
    const q = normalize(search);

    const filtered = !q
      ? membres
      : membres.filter((m) => {
          const haystack = normalize(
            [
              m.nom_complet ?? "",
              m.email ?? "",
              m.telephone ?? "",
              m.role ?? "",
            ].join(" ")
          );
          return haystack.includes(q);
        });

    return [...filtered].sort((a, b) => {
      const aMine = isCurrentUser(a, currentUserEmail) ? 1 : 0;
      const bMine = isCurrentUser(b, currentUserEmail) ? 1 : 0;

      if (aMine !== bMine) return bMine - aMine;

      return (a.nom_complet ?? "").localeCompare(b.nom_complet ?? "", "fr", {
        sensitivity: "base",
      });
    });
  }, [membres, search, currentUserEmail]);

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">
                Membres
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Cartes des membres
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Visualisation des cartes membres uniquement.
              </p>
            </div>

            <div className="w-full lg:w-[360px]">
              <label className="mb-2 block text-sm text-slate-300">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, email, téléphone..."
                className="w-full rounded-2xl border border-cyan-800/40 bg-[#081735] px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)]">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              Annuaire visuel
            </p>
            <span className="rounded-full border border-cyan-800/40 bg-[#081735] px-3 py-1 text-sm text-slate-300">
              {membresAffiches.length} membre{membresAffiches.length > 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Chargement des membres...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-6 text-red-200">
              {error}
            </div>
          ) : membresAffiches.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Aucun membre trouvé.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {membresAffiches.map((membre) => (
                <MembreCard
                  key={membre.id}
                  membre={membre}
                  isMine={isCurrentUser(membre, currentUserEmail)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MembreCard({
  membre,
  isMine,
}: {
  membre: Membre;
  isMine: boolean;
}) {
  const nomComplet = membre.nom_complet?.trim() || "Membre";
  const actif = membre.statut_actif === null || membre.statut_actif === undefined
    ? true
    : Boolean(membre.statut_actif);

  return (
    <div
      className={[
        "rounded-[26px] border p-4 shadow-[0_10px_30px_rgba(0,0,0,0.20)] transition",
        isMine
          ? "border-emerald-500/40 bg-[linear-gradient(180deg,rgba(6,78,59,0.28),rgba(8,23,53,0.95))]"
          : "border-cyan-900/40 bg-[#081735]",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-cyan-900/40 bg-[#0b1d45]">
          {membre.photo_url ? (
            <img
              src={membre.photo_url}
              alt={nomComplet}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-cyan-200">
              {initials(nomComplet)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{nomComplet}</h2>
            {isMine ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                Mon profil
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-medium",
                actif
                  ? "border border-emerald-700/40 bg-emerald-500/10 text-emerald-200"
                  : "border border-slate-700 bg-slate-800/70 text-slate-300",
              ].join(" ")}
            >
              {actif ? "Actif" : "Non actif"}
            </span>

            {membre.role ? (
              <span className="rounded-full border border-cyan-800/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                {membre.role}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-300">

        {membre.telephone ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-[#07142f] px-3 py-2">
            <span className="text-white">{membre.telephone}</span>

            <div className="flex gap-2">

              <a
                href={`tel:${membre.telephone}`}
                className="flex items-center gap-2 rounded-xl border border-cyan-700/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition"
              >
                📞 Appeler
              </a>

              <a
                href={`https://wa.me/${membre.telephone.replace(/\D/g, "")}`}
                target="_blank"
                className="flex items-center gap-2 rounded-xl border border-emerald-700/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 transition"
              >
                💬 WhatsApp
              </a>

            </div>
          </div>
        ) : null}

        {membre.email ? (
          <div className="rounded-2xl border border-slate-800 bg-[#07142f] px-3 py-2 break-all">
            <span className="text-slate-400">Email :</span>{" "}
            <span className="text-white">{membre.email}</span>
          </div>
        ) : null}

      </div>
    </div>
  );
}




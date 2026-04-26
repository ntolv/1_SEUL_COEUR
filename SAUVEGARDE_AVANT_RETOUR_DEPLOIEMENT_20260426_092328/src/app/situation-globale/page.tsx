"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function SituationGlobalePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function charger() {
    setLoading(true);
    setError(null);

    const [{ data: membres, error: errM }, { data: preinscrits, error: errP }] =
      await Promise.all([
        supabase.from("membres").select("id, nom_complet, telephone, email"),
        supabase
          .from("membres_preinscriptions")
          .select("id, nom_complet, telephone, email"),
      ]);

    if (errM) {
      setError(errM.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (errP) {
      setError(errP.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const membresRows: Row[] = (membres ?? []).map((m: any) => ({
      id: m.id,
      nom_complet: m.nom_complet,
      telephone: m.telephone ?? null,
      email: m.email ?? null,
      type_personne: "MEMBRE",
    }));

    const preinscritsRows: Row[] = (preinscrits ?? []).map((p: any) => ({
      id: p.id,
      nom_complet: p.nom_complet,
      telephone: p.telephone ?? null,
      email: p.email ?? null,
      type_personne: "PREINSCRIT",
    }));

    const map = new Map<string, Row>();

    for (const row of preinscritsRows) {
      map.set(normalize(row.nom_complet), row);
    }

    for (const row of membresRows) {
      map.set(normalize(row.nom_complet), row);
    }

    const finalRows = [...map.values()].sort((a, b) =>
      a.nom_complet.localeCompare(b.nom_complet, "fr", { sensitivity: "base" })
    );

    setRows(finalRows);
    setLoading(false);
  }

  useEffect(() => {
    charger();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) =>
      [r.nom_complet ?? "", r.email ?? "", r.telephone ?? "", r.type_personne ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="rounded-[28px] border border-cyan-900/40 bg-[#04112b] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300/70">
                Situation membres
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Membres + préinscrits
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Les préinscrits apparaissent aussi ici, avec priorité au membre si doublon.
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
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Chargement...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-6 text-red-200">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#081735] px-4 py-6 text-slate-300">
              Aucune donnée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-900/40 text-left text-cyan-200">
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Nom</th>
                    <th className="px-3 py-3">Téléphone</th>
                    <th className="px-3 py-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={`${row.type_personne}-${row.id}`}
                      className="border-b border-slate-800 text-slate-200"
                    >
                      <td className="px-3 py-3">{row.type_personne}</td>
                      <td className="px-3 py-3 font-medium text-white">
                        {row.nom_complet}
                      </td>
                      <td className="px-3 py-3">{row.telephone ?? "-"}</td>
                      <td className="px-3 py-3">{row.email ?? "-"}</td>
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

"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type EncaissementRow = {
  personne_id: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  type_personne: "MEMBRE" | "PREINSCRIT";
  mois_reference: string | null;
  rubrique_id: string | null;
  rubrique_code: string | null;
  rubrique_nom: string;
  montant_attendu: number;
  montant_encaisse: number;
  reste: number;
  statut: "A jour" | "En retard";
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatPhoneForWhatsApp(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/[^\d+]/g, "").trim();
  if (!digits) return "";

  if (digits.startsWith("+")) {
    return digits.replace(/[^\d]/g, "");
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    return "33" + digits.slice(1);
  }

  return digits.replace(/[^\d]/g, "");
}

function buildWhatsAppLink(row: EncaissementRow) {
  const phone = formatPhoneForWhatsApp(row.telephone);
  if (!phone || Number(row.reste ?? 0) <= 0) return null;

  const message =
    `Bonjour ${row.nom_complet}, ` +
    `petit rappel concernant votre retard pour la rubrique ${row.rubrique_nom} : ` +
    `${formatCurrency(row.reste)}. Merci.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function SuiviGlobalPage() {
  const [rows, setRows] = useState<EncaissementRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRows() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("v_encaissements_suivi_global")
        .select("*")
        .order("nom_complet", { ascending: true })
        .order("rubrique_nom", { ascending: true });

      if (!active) return;

      if (error) {
        setError(error.message || "Erreur de chargement.");
        setRows([]);
        setLoading(false);
        return;
      }

      const safeRows = ((data ?? []) as EncaissementRow[]).map((row) => ({
        ...row,
        montant_attendu: Number(row.montant_attendu ?? 0),
        montant_encaisse: Number(row.montant_encaisse ?? 0),
        reste: Number(row.reste ?? 0),
      }));

      setRows(safeRows);
      setLoading(false);
    }

    loadRows();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = normalize(search);

    const sorted = [...rows].sort((a, b) => {
      const byName = normalize(a.nom_complet).localeCompare(normalize(b.nom_complet), "fr");
      if (byName !== 0) return byName;

      const byType = normalize(a.type_personne).localeCompare(normalize(b.type_personne), "fr");
      if (byType !== 0) return byType;

      return normalize(a.rubrique_nom).localeCompare(normalize(b.rubrique_nom), "fr");
    });

    if (!q) return sorted;

    return sorted.filter((row) => {
      return [
        row.nom_complet,
        row.telephone,
        row.email,
        row.type_personne,
        row.rubrique_nom,
        row.rubrique_code,
        row.statut,
      ].some((value) => normalize(String(value ?? "")).includes(q));
    });
  }, [rows, search]);

  const groupedRows = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of filteredRows) {
      const key = `${row.personne_id}__${row.type_personne}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const seen = new Map<string, number>();

    return filteredRows.map((row) => {
      const key = `${row.personne_id}__${row.type_personne}`;
      const currentIndex = (seen.get(key) ?? 0) + 1;
      seen.set(key, currentIndex);

      return {
        ...row,
        groupKey: key,
        rowSpan: counts.get(key) ?? 1,
        showIdentity: currentIndex === 1,
      };
    });
  }, [filteredRows]);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#081127] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-3xl border border-cyan-500/20 bg-[#0b1733]/95 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Suivi global des encaissements
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Affichage basé sur la vue backend agrégée : une seule ligne par personne et par rubrique.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un membre, une rubrique, un téléphone..."
                  className="w-full rounded-2xl border border-cyan-500/20 bg-[#09142d] px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-cyan-500/20 bg-[#0b1733]/95 p-6 text-center text-slate-300">
              Chargement en cours...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
              {error}
            </div>
          ) : groupedRows.length === 0 ? (
            <div className="rounded-3xl border border-cyan-500/20 bg-[#0b1733]/95 p-6 text-center text-slate-300">
              Aucun résultat trouvé.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0b1733]/95 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-[#0d1b3d]">
                    <tr className="text-left text-sm text-slate-300">
                      <th className="px-5 py-4 font-semibold">Personne</th>
                      <th className="px-5 py-4 font-semibold">Rubrique</th>
                      <th className="px-5 py-4 font-semibold">Attendu</th>
                      <th className="px-5 py-4 font-semibold">Encaissé</th>
                      <th className="px-5 py-4 font-semibold">Reste</th>
                      <th className="px-5 py-4 font-semibold">Statut</th>
                      <th className="px-5 py-4 font-semibold">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupedRows.map((row, index) => {
                      const whatsappUrl = buildWhatsAppLink(row);
                      const isLate = row.statut === "En retard";
                      const isLastInGroup =
                        index === groupedRows.length - 1 ||
                        groupedRows[index + 1].groupKey !== row.groupKey;

                      return (
                        <tr
                          key={`${row.groupKey}__${normalize(row.rubrique_nom)}__${index}`}
                          className={`border-t border-white/5 ${
                            isLastInGroup ? "border-b border-white/10" : ""
                          }`}
                        >
                          {row.showIdentity ? (
                            <td
                              rowSpan={row.rowSpan}
                              className="align-top px-5 py-5"
                            >
                              <div className="flex min-w-[280px] flex-col gap-2">
                                <div className="text-[20px] font-semibold leading-tight text-white">
                                  {row.nom_complet}
                                </div>

                                <div className="text-base text-slate-300">
                                  {row.telephone || "Téléphone indisponible"}
                                </div>

                                <div className="pt-1">
                                  <span
                                    className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                                      row.type_personne === "MEMBRE"
                                        ? "bg-cyan-500/20 text-cyan-300"
                                        : "bg-amber-500/20 text-amber-300"
                                    }`}
                                  >
                                    {row.type_personne}
                                  </span>
                                </div>
                              </div>
                            </td>
                          ) : null}

                          <td className="px-5 py-5 text-[18px] text-white">
                            {row.rubrique_nom}
                          </td>

                          <td className="px-5 py-5 text-[18px] text-slate-200">
                            {formatCurrency(row.montant_attendu)}
                          </td>

                          <td className="px-5 py-5 text-[18px] font-semibold text-emerald-400">
                            {formatCurrency(row.montant_encaisse)}
                          </td>

                          <td
                            className={`px-5 py-5 text-[18px] font-semibold ${
                              Number(row.reste) > 0 ? "text-orange-400" : "text-emerald-400"
                            }`}
                          >
                            {formatCurrency(row.reste)}
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                                isLate
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {row.statut}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            {whatsappUrl ? (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                              >
                                WhatsApp
                              </a>
                            ) : (
                              <span className="text-sm text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

type Ligne = {
  attendu_id: number;
  membre_id: string;
  rubrique_nom: string;
  montant_attendu: number;
  montant_encaisse: number;
  statut: string;
};

type Props = {
  lignes: Ligne[];
  membresMap: Record<string, string>;
  openModal: (ligne: Ligne) => void;
  openMultiModal: (membreId: string) => void;
};

function getGlobalStatut(items: Ligne[]) {
  if (items.some((i) => i.statut === "retard")) return "retard";
  if (items.some((i) => i.statut === "partiel")) return "partiel";
  if (items.every((i) => i.statut === "encaisse")) return "encaisse";
  return "en_attente";
}

function getPriority(items: Ligne[]) {
  const statut = getGlobalStatut(items);
  switch (statut) {
    case "retard":
      return 3;
    case "partiel":
      return 2;
    case "encaisse":
      return 1;
    default:
      return 0;
  }
}

function getBadgeColor(statut: string) {
  switch (statut) {
    case "encaisse":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    case "partiel":
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    case "retard":
      return "bg-red-500/15 text-red-300 border border-red-400/20";
    default:
      return "bg-slate-500/15 text-slate-300 border border-slate-400/20";
  }
}

function getContainerStyle(statut: string) {
  switch (statut) {
    case "encaisse":
      return "border-emerald-400/25 shadow-[0_0_0_1px_rgba(16,185,129,0.10)]";
    case "partiel":
      return "border-amber-400/25 shadow-[0_0_0_1px_rgba(245,158,11,0.10)]";
    case "retard":
      return "border-red-400/25 shadow-[0_0_0_1px_rgba(239,68,68,0.10)]";
    default:
      return "border-cyan-400/20 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]";
  }
}

function getRibbonStyle(statut: string) {
  switch (statut) {
    case "encaisse":
      return "bg-emerald-500/10";
    case "partiel":
      return "bg-amber-500/10";
    case "retard":
      return "bg-red-500/10";
    default:
      return "bg-cyan-500/10";
  }
}

export default function GroupedEncaissements({
  lignes,
  membresMap,
  openModal,
  openMultiModal,
}: Props) {
  const groupes = lignes.reduce<Record<string, Ligne[]>>((acc, ligne) => {
    if (!acc[ligne.membre_id]) acc[ligne.membre_id] = [];
    acc[ligne.membre_id].push(ligne);
    return acc;
  }, {});

  const orderedGroups = Object.entries(groupes).sort(([, a], [, b]) => {
    return getPriority(b) - getPriority(a);
  });

  return (
    <div className="space-y-6">
      {orderedGroups.map(([membreId, items], index) => {
        const totalAttendu = items.reduce(
          (sum, item) => sum + Number(item.montant_attendu || 0),
          0
        );
        const totalEncaisse = items.reduce(
          (sum, item) => sum + Number(item.montant_encaisse || 0),
          0
        );
        const totalRestant = totalAttendu - totalEncaisse;
        const statutGlobal = getGlobalStatut(items);

        return (
          <div
            key={membreId}
            className={`overflow-hidden rounded-3xl border bg-slate-900/60 ${getContainerStyle(
              statutGlobal
            )}`}
          >
            <div className={`px-4 py-2 text-xs uppercase tracking-[0.25em] ${getRibbonStyle(statutGlobal)}`}>
              Priorité {index + 1}
            </div>

            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                    Bloc membre
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeColor(
                      statutGlobal
                    )}`}
                  >
                    {statutGlobal}
                  </span>
                </div>

                <div className="text-3xl font-semibold text-white">
                  {membresMap[membreId] || membreId}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 px-3 py-2 text-slate-300">
                    Attendu <span className="ml-2 font-semibold text-white">{totalAttendu}</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 text-slate-300">
                    Encaissé <span className="ml-2 font-semibold text-white">{totalEncaisse}</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 text-slate-300">
                    Restant <span className="ml-2 font-semibold text-white">{totalRestant}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openMultiModal(membreId)}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Encaissement groupé
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Rubrique</th>
                    <th className="px-4 py-3 text-center font-medium">Attendu</th>
                    <th className="px-4 py-3 text-center font-medium">Payé</th>
                    <th className="px-4 py-3 text-center font-medium">Restant</th>
                    <th className="px-4 py-3 text-center font-medium">Statut</th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ligne) => {
                    const restant =
                      Number(ligne.montant_attendu) - Number(ligne.montant_encaisse);

                    return (
                      <tr
                        key={ligne.attendu_id}
                        className="border-t border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 text-white">{ligne.rubrique_nom}</td>
                        <td className="px-4 py-3 text-center text-white">
                          {Number(ligne.montant_attendu).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-white">
                          {Number(ligne.montant_encaisse).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-white">
                          {restant.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeColor(
                              ligne.statut
                            )}`}
                          >
                            {ligne.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openModal(ligne)}
                            className="rounded-2xl bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600"
                          >
                            💰
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Aucune rubrique.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {orderedGroups.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-400">
          Aucun encaissement trouvé pour le mois courant.
        </div>
      )}
    </div>
  );
}

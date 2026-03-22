"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/layout/AppShell";

type ResumeSession = {
  out_mois: string;
  out_date_limite: string | null;
  out_statut: string;
  out_total_attendu: number;
  out_total_encaisse: number;
  out_total_restant: number;
  out_total_jour: number;
};

type Ligne = {
  attendu_id: number;
  membre_id: string;
  rubrique_id?: number;
  rubrique_nom: string;
  montant_attendu: number;
  montant_encaisse: number;
  statut: string;
  mois?: string;
};

type LignePreinscrit = {
  attendu_id: number;
  profil_id: string;
  rubrique_id?: number;
  rubrique_nom: string;
  montant_attendu: number;
  montant_encaisse: number;
  statut: string;
  nom_affichage?: string;
  mois?: string;
};

type MembreRow = {
  id: string;
  nom_complet: string | null;
  email: string | null;
  role?: string | null;
  statut_actif?: boolean | null;
};

type MeRow = {
  id?: string;
  membre_id?: string;
  role?: string;
};

type Rubrique = {
  id: number;
  nom: string;
};

type ProfilRow = {
  id: string;
  membre_id: string | null;
  preinscription_id: string | null;
  nom_affichage: string;
  telephone: string | null;
  source: "membre" | "preinscription";
};

type ProfilOption = ProfilRow & {
  label_select: string;
};

type BasketItem = {
  rubrique_id: number;
  rubrique_nom: string;
  montant: number;
};

type SituationGlobaleRow = {
  id: string;
  nom: string;
  type: "Membre" | "Préinscrit";
  total_encaisse: number;
  retards: number;
};

const MANAGER_ROLES = ["admin", "president", "tresorier"];

export default function EncaissementsPage() {
  const [loading, setLoading] = useState(true);
  const [savingBasket, setSavingBasket] = useState(false);
  const [savingAttendu, setSavingAttendu] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  const [resume, setResume] = useState<ResumeSession | null>(null);
  const [lignesMembres, setLignesMembres] = useState<Ligne[]>([]);
  const [lignesPreinscrits, setLignesPreinscrits] = useState<LignePreinscrit[]>([]);
  const [membres, setMembres] = useState<MembreRow[]>([]);
  const [profils, setProfils] = useState<ProfilRow[]>([]);
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [me, setMe] = useState<MeRow | null>(null);

  const [selectedProfilId, setSelectedProfilId] = useState("");
  const [selectedRubriqueId, setSelectedRubriqueId] = useState("");
  const [selectedMontant, setSelectedMontant] = useState<number>(0);
  const [basket, setBasket] = useState<BasketItem[]>([]);

  const [attenduProfilId, setAttenduProfilId] = useState("");
  const [attenduRubriqueId, setAttenduRubriqueId] = useState("");
  const [attenduMontant, setAttenduMontant] = useState<number>(0);

  const [sessionDateLimite, setSessionDateLimite] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const moisCourant = getCurrentMonth();

    const [
      resumeRes,
      membresLignesRes,
      preinscritsLignesRes,
      membresRes,
      profilsRes,
      rubriquesRes,
      meRes,
    ] = await Promise.all([
      supabase.rpc("fn_encaissement_resume_session_courante"),
      supabase
        .from("v_encaissements_suivi")
        .select("*")
        .eq("mois", moisCourant)
        .order("rubrique_nom", { ascending: true }),
      supabase
        .from("v_encaissements_preinscrits_suivi")
        .select("*")
        .eq("mois", moisCourant)
        .order("rubrique_nom", { ascending: true }),
      supabase
        .from("membres")
        .select("id, nom_complet, email, role, statut_actif")
        .order("nom_complet", { ascending: true }),
      supabase
        .from("encaissement_profils")
        .select("id, membre_id, preinscription_id, nom_affichage, telephone, source")
        .order("nom_affichage", { ascending: true }),
      supabase
        .from("encaissement_rubriques")
        .select("id, nom")
        .eq("est_active", true)
        .order("nom", { ascending: true }),
      supabase.rpc("fn_me"),
    ]);

    const resumeData = Array.isArray(resumeRes.data) ? resumeRes.data[0] : null;
    const typedResume = (resumeData || null) as ResumeSession | null;
    setResume(typedResume);
    setSessionDateLimite(typedResume?.out_date_limite || "");

    setLignesMembres((membresLignesRes.data || []) as Ligne[]);
    setLignesPreinscrits((preinscritsLignesRes.data || []) as LignePreinscrit[]);
    setMembres((membresRes.data || []) as MembreRow[]);
    setProfils((profilsRes.data || []) as ProfilRow[]);
    setRubriques((rubriquesRes.data || []) as Rubrique[]);

    let meData: MeRow | null = null;
    if (Array.isArray(meRes.data)) {
      meData = (meRes.data[0] || null) as MeRow | null;
    } else if (meRes.data) {
      meData = meRes.data as MeRow;
    }
    setMe(meData);

    setLoading(false);
  }

  function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7) + "-01";
  }

  const myMembreId = useMemo(() => me?.membre_id || me?.id || "", [me]);
  const myRole = useMemo(() => (me?.role || "").toLowerCase(), [me]);
  const isManager = useMemo(() => MANAGER_ROLES.includes(myRole), [myRole]);

  const profilsDisponibles = useMemo<ProfilOption[]>(() => {
    const actifs = profils.filter((p) => {
      if (p.source === "membre" && p.membre_id) {
        const membre = membres.find((m) => m.id === p.membre_id);
        return membre?.statut_actif !== false;
      }
      return true;
    });

    const nomsDesMembres = new Set(
      actifs
        .filter((p) => p.source === "membre")
        .map((p) => (p.nom_affichage || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const sansDoublons = actifs.filter((p) => {
      const nom = (p.nom_affichage || "").trim().toLowerCase();
      if (p.source === "preinscription" && nomsDesMembres.has(nom)) {
        return false;
      }
      return true;
    });

    return sansDoublons
      .map((p) => ({
        ...p,
        label_select: `${p.nom_affichage} - ${p.source === "membre" ? "Membre" : "Préinscrit"}`,
      }))
      .sort((a, b) =>
        a.nom_affichage.localeCompare(b.nom_affichage, "fr", { sensitivity: "base" })
      );
  }, [profils, membres]);

  const profilSelectionne = useMemo(() => {
    return profilsDisponibles.find((p) => p.id === selectedProfilId) || null;
  }, [profilsDisponibles, selectedProfilId]);

  const profilAttenduSelectionne = useMemo(() => {
    return profilsDisponibles.find((p) => p.id === attenduProfilId) || null;
  }, [profilsDisponibles, attenduProfilId]);

  const rubriqueSelectionnee = useMemo(() => {
    return rubriques.find((r) => String(r.id) === String(selectedRubriqueId)) || null;
  }, [rubriques, selectedRubriqueId]);

  const lignesPerso = useMemo(() => {
    if (!myMembreId) return [];
    return lignesMembres.filter((l) => l.membre_id === myMembreId);
  }, [lignesMembres, myMembreId]);

  const situationGlobale = useMemo<SituationGlobaleRow[]>(() => {
    const map = new Map<string, SituationGlobaleRow>();

    lignesMembres.forEach((l) => {
      const key = l.membre_id;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nom: profils.find((p) => p.membre_id === key)?.nom_affichage || "Membre",
          type: "Membre",
          total_encaisse: 0,
          retards: 0,
        });
      }

      const item = map.get(key)!;
      item.total_encaisse += Number(l.montant_encaisse || 0);
      if (l.statut === "retard") item.retards += 1;
    });

    lignesPreinscrits.forEach((l) => {
      const key = l.profil_id;
      const profil = profils.find((p) => p.id === key);

      if (profil?.membre_id) {
        return;
      }

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nom: l.nom_affichage || profil?.nom_affichage || "Préinscrit",
          type: "Préinscrit",
          total_encaisse: 0,
          retards: 0,
        });
      }

      const item = map.get(key)!;
      item.total_encaisse += Number(l.montant_encaisse || 0);
      if (l.statut === "retard") item.retards += 1;
    });

    profils.forEach((profil) => {
      if (profil.membre_id) return;

      if (!map.has(profil.id)) {
        map.set(profil.id, {
          id: profil.id,
          nom: profil.nom_affichage || "Préinscrit",
          type: "Préinscrit",
          total_encaisse: 0,
          retards: 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
    );
  }, [lignesMembres, lignesPreinscrits, profils]);

  const basketTotal = useMemo(() => {
    return basket.reduce((sum, item) => sum + Number(item.montant || 0), 0);
  }, [basket]);

  function formatEuro(value: number | string | null | undefined) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
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

  function resetBasket() {
    setBasket([]);
    setSelectedRubriqueId("");
    setSelectedMontant(0);
  }

  function onChangeProfil(value: string) {
    setSelectedProfilId(value);
    resetBasket();
  }

  function incrementMontant(delta: number) {
    setSelectedMontant((prev) => Math.max(0, Number(prev || 0) + delta));
  }

  async function ouvrirSession() {
    if (!sessionDateLimite) {
      alert("Renseigne une date limite.");
      return;
    }

    setSavingSession(true);

    const { error } = await supabase.rpc("fn_encaissement_initialiser_mois", {
      p_mois: getCurrentMonth(),
      p_date_limite: sessionDateLimite,
    });

    setSavingSession(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function cloturerSession() {
    setSavingSession(true);

    const { error } = await supabase.rpc("fn_encaissement_cloturer_mois", {
      p_mois: getCurrentMonth(),
    });

    setSavingSession(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function rouvrirSession() {
    setSavingSession(true);

    const { error } = await supabase.rpc("fn_encaissement_rouvrir_mois", {
      p_mois: getCurrentMonth(),
    });

    setSavingSession(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  function ajouterAuPanier() {
    if (!selectedProfilId) {
      alert("Sélectionne une personne.");
      return;
    }

    if (!selectedRubriqueId) {
      alert("Sélectionne une rubrique.");
      return;
    }

    if (selectedMontant <= 0) {
      alert("Le montant doit être supérieur à 0.");
      return;
    }

    const rubrique = rubriques.find((r) => String(r.id) === String(selectedRubriqueId));
    if (!rubrique) {
      alert("Rubrique introuvable.");
      return;
    }

    const deja = basket.some((b) => b.rubrique_id === rubrique.id);
    if (deja) {
      alert("Cette rubrique est déjà dans le panier.");
      return;
    }

    setBasket((prev) => [
      ...prev,
      {
        rubrique_id: rubrique.id,
        rubrique_nom: rubrique.nom,
        montant: selectedMontant,
      },
    ]);

    setSelectedRubriqueId("");
    setSelectedMontant(0);
  }

  function supprimerLignePanier(rubriqueId: number) {
    setBasket((prev) => prev.filter((item) => item.rubrique_id !== rubriqueId));
  }

  async function enregistrerAttendu() {
    if (!profilAttenduSelectionne) {
      alert("Sélectionne une personne.");
      return;
    }

    if (!attenduRubriqueId) {
      alert("Sélectionne une rubrique.");
      return;
    }

    if (attenduMontant < 0) {
      alert("Le montant attendu ne peut pas être négatif.");
      return;
    }

    setSavingAttendu(true);

    const moisCourant = getCurrentMonth();
    const rubriqueId = Number(attenduRubriqueId);

    if (profilAttenduSelectionne.membre_id) {
      const { data: attenduId, error: createErr } = await supabase.rpc(
        "fn_get_or_create_attendu_membre",
        {
          p_mois: moisCourant,
          p_membre_id: profilAttenduSelectionne.membre_id,
          p_rubrique_id: rubriqueId,
        }
      );

      if (createErr) {
        setSavingAttendu(false);
        alert(createErr.message);
        return;
      }

      const { error: saveErr } = await supabase.rpc(
        "fn_encaissement_membre_definir_attendu",
        {
          p_attendu_id: Number(attenduId),
          p_montant_attendu: Number(attenduMontant),
        }
      );

      setSavingAttendu(false);

      if (saveErr) {
        alert(saveErr.message);
        return;
      }
    } else {
      const { error: initErr } = await supabase.rpc(
        "fn_encaissement_preinscrit_initialiser_session",
        {
          p_profil_id: profilAttenduSelectionne.id,
          p_mois: moisCourant,
        }
      );

      if (initErr) {
        setSavingAttendu(false);
        alert(initErr.message);
        return;
      }

      const { data: attenduId, error: createErr } = await supabase.rpc(
        "fn_get_or_create_attendu_preinscrit",
        {
          p_mois: moisCourant,
          p_profil_id: profilAttenduSelectionne.id,
          p_rubrique_id: rubriqueId,
        }
      );

      if (createErr) {
        setSavingAttendu(false);
        alert(createErr.message);
        return;
      }

      const { error: saveErr } = await supabase.rpc(
        "fn_encaissement_preinscrit_definir_attendu",
        {
          p_attendu_id: Number(attenduId),
          p_montant_attendu: Number(attenduMontant),
        }
      );

      setSavingAttendu(false);

      if (saveErr) {
        alert(saveErr.message);
        return;
      }
    }

    setAttenduRubriqueId("");
    setAttenduMontant(0);
    await loadData();
  }

  async function encaisserUniversel() {
    if (!profilSelectionne) {
      alert("Sélectionne une personne.");
      return;
    }

    if (basket.length === 0) {
      alert("Le panier est vide.");
      return;
    }

    setSavingBasket(true);

    const moisCourant = getCurrentMonth();

    if (profilSelectionne.membre_id) {
      const ventilations: { attendu_id: number; montant: number }[] = [];

      for (const item of basket) {
        const { data: attenduId, error: attenduErr } = await supabase.rpc(
          "fn_get_or_create_attendu_membre",
          {
            p_mois: moisCourant,
            p_membre_id: profilSelectionne.membre_id,
            p_rubrique_id: item.rubrique_id,
          }
        );

        if (attenduErr) {
          setSavingBasket(false);
          alert(attenduErr.message);
          return;
        }

        ventilations.push({
          attendu_id: Number(attenduId),
          montant: Number(item.montant),
        });
      }

      const { error } = await supabase.rpc(
        "fn_enregistrer_encaissement_multi_rubriques",
        {
          p_mois: moisCourant,
          p_membre_id: profilSelectionne.membre_id,
          p_montant_total: basketTotal,
          p_ventilations: ventilations,
        }
      );

      setSavingBasket(false);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error: initErr } = await supabase.rpc(
        "fn_encaissement_preinscrit_initialiser_session",
        {
          p_profil_id: profilSelectionne.id,
          p_mois: moisCourant,
        }
      );

      if (initErr) {
        setSavingBasket(false);
        alert(initErr.message);
        return;
      }

      const ventilations: { attendu_id: number; montant: number }[] = [];

      for (const item of basket) {
        const { data: attenduId, error: attenduErr } = await supabase.rpc(
          "fn_get_or_create_attendu_preinscrit",
          {
            p_mois: moisCourant,
            p_profil_id: profilSelectionne.id,
            p_rubrique_id: item.rubrique_id,
          }
        );

        if (attenduErr) {
          setSavingBasket(false);
          alert(attenduErr.message);
          return;
        }

        ventilations.push({
          attendu_id: Number(attenduId),
          montant: Number(item.montant),
        });
      }

      const { error } = await supabase.rpc(
        "fn_enregistrer_encaissement_multi_preinscrit",
        {
          p_mois: moisCourant,
          p_profil_id: profilSelectionne.id,
          p_montant_total: basketTotal,
          p_ventilations: ventilations,
        }
      );

      setSavingBasket(false);

      if (error) {
        alert(error.message);
        return;
      }
    }

    resetBasket();
    await loadData();
  }

  const lignesSituationUnique = useMemo(() => {
    if (isManager && profilSelectionne) {
      if (profilSelectionne.membre_id) {
        return lignesMembres
          .filter((l) => l.membre_id === profilSelectionne.membre_id)
          .map((l) => ({
            key: `m-${l.attendu_id}`,
            rubrique_nom: l.rubrique_nom,
            montant_attendu: l.montant_attendu,
            montant_encaisse: l.montant_encaisse,
            statut: l.statut,
            mois: l.mois || getCurrentMonth(),
          }));
      }

      return lignesPreinscrits
        .filter((l) => l.profil_id === profilSelectionne.id)
        .map((l) => ({
          key: `p-${l.attendu_id}`,
          rubrique_nom: l.rubrique_nom,
          montant_attendu: l.montant_attendu,
          montant_encaisse: l.montant_encaisse,
          statut: l.statut,
          mois: l.mois || getCurrentMonth(),
        }));
    }

    return lignesPerso.map((l) => ({
      key: `self-${l.attendu_id}`,
      rubrique_nom: l.rubrique_nom,
      montant_attendu: l.montant_attendu,
      montant_encaisse: l.montant_encaisse,
      statut: l.statut,
      mois: l.mois || getCurrentMonth(),
    }));
  }, [isManager, profilSelectionne, lignesMembres, lignesPreinscrits, lignesPerso]);

  const titreSituation = useMemo(() => {
    if (isManager && profilSelectionne) return "Situation du membre";
    return "Ma situation";
  }, [isManager, profilSelectionne]);

  const nomSituation = useMemo(() => {
    if (isManager && profilSelectionne) return profilSelectionne.nom_affichage;
    return profilsDisponibles.find((p) => p.membre_id === myMembreId)?.nom_affichage || "";
  }, [isManager, profilSelectionne, profilsDisponibles, myMembreId]);

  const totalSituationEncaisse = useMemo(
    () => lignesSituationUnique.reduce((sum, l) => sum + Number(l.montant_encaisse || 0), 0),
    [lignesSituationUnique]
  );

  const nbSituationRetard = useMemo(
    () => lignesSituationUnique.filter((l) => l.statut === "retard").length,
    [lignesSituationUnique]
  );

  return (
    <AppShell>
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Encaissements</h1>
          <p className="mt-1 text-sm text-slate-400">
            Session mensuelle, situation personnelle et encaissements du jour
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
            Chargement des encaissements...
          </div>
        ) : (
          <>
            {resume && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card
                  title="Session"
                  value={resume.out_mois ? new Date(resume.out_mois).toLocaleDateString() : "-"}
                  subtle={resume.out_statut}
                />
                <Card title="Total encaissé du mois" value={formatEuro(resume.out_total_encaisse)} />
                <Card title="Total encaissé du jour" value={formatEuro(resume.out_total_jour)} />
                <Card title="Total restant session" value={formatEuro(resume.out_total_restant)} />
                <Card title="Session active" value={resume.out_statut || "-"} />
              </div>
            )}

            {isManager && (
              <>
                <Section title="Situation globale des contributions">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-white/5 text-slate-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Nom</th>
                          <th className="px-4 py-3 text-center font-medium">Type</th>
                          <th className="px-4 py-3 text-center font-medium">Total encaissé</th>
                          <th className="px-4 py-3 text-center font-medium">Retards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {situationGlobale.map((p) => (
                          <tr key={p.id} className="border-t border-white/5">
                            <td className="px-4 py-3 text-white">{p.nom}</td>
                            <td className="px-4 py-3 text-center text-slate-300">{p.type}</td>
                            <td className="px-4 py-3 text-center text-white">
                              {formatEuro(p.total_encaisse)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={p.retards > 0 ? "text-red-400" : "text-emerald-400"}>
                                {p.retards}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {situationGlobale.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              Aucune donnée
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <Section title="Gestion de la session du mois">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <SelectedBox
                      label="Mois en cours"
                      value={
                        resume?.out_mois
                          ? new Date(resume.out_mois).toLocaleDateString("fr-FR")
                          : new Date(getCurrentMonth()).toLocaleDateString("fr-FR")
                      }
                    />
                    <SelectedBox
                      label="Statut"
                      value={resume?.out_statut || "non ouverte"}
                    />
                    <Field label="Date limite">
                      <input
                        type="date"
                        value={sessionDateLimite}
                        onChange={(e) => setSessionDateLimite(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                      />
                    </Field>
                    <div className="flex flex-col justify-end gap-3">
                      <button
                        onClick={ouvrirSession}
                        disabled={savingSession}
                        className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                      >
                        {savingSession ? "Traitement..." : "Ouvrir / Mettre à jour"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={cloturerSession}
                      disabled={savingSession || !resume?.out_mois}
                      className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-50"
                    >
                      Clôturer la session
                    </button>

                    <button
                      onClick={rouvrirSession}
                      disabled={savingSession || !resume?.out_mois}
                      className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      Rouvrir la session
                    </button>
                  </div>
                </Section>

                <Section title="Montants attendus du mois">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Field label="Personne">
                      <select
                        value={attenduProfilId}
                        onChange={(e) => setAttenduProfilId(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                      >
                        <option value="">Sélectionner une personne</option>
                        {profilsDisponibles.map((profil) => (
                          <option key={profil.id} value={profil.id}>
                            {profil.label_select}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Rubrique">
                      <select
                        value={attenduRubriqueId}
                        onChange={(e) => setAttenduRubriqueId(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                      >
                        <option value="">Sélectionner une rubrique</option>
                        {rubriques.map((rubrique) => (
                          <option key={rubrique.id} value={rubrique.id}>
                            {rubrique.nom}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Montant attendu">
                      <div className="relative">
                        <input
                          type="number"
                          value={attenduMontant || ""}
                          onChange={(e) => setAttenduMontant(Number(e.target.value))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 pr-14 text-white outline-none"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                          €
                        </span>
                      </div>
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={enregistrerAttendu}
                      disabled={savingAttendu}
                      className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50"
                    >
                      {savingAttendu ? "Enregistrement..." : "Enregistrer le montant attendu"}
                    </button>
                  </div>
                </Section>

                <Section title="Encaissement du mois">
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Field label="Personne">
                        <select
                          value={selectedProfilId}
                          onChange={(e) => onChangeProfil(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                        >
                          <option value="">Sélectionner une personne</option>
                          {profilsDisponibles.map((profil) => (
                            <option key={profil.id} value={profil.id}>
                              {profil.label_select}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Rubrique">
                        <select
                          value={selectedRubriqueId}
                          onChange={(e) => setSelectedRubriqueId(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none"
                        >
                          <option value="">Sélectionner une rubrique</option>
                          {rubriques.map((rubrique) => (
                            <option key={rubrique.id} value={rubrique.id}>
                              {rubrique.nom}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Montant">
                        <div className="relative">
                          <input
                            type="number"
                            value={selectedMontant || ""}
                            onChange={(e) => setSelectedMontant(Number(e.target.value))}
                            className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 pr-14 text-white outline-none"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            €
                          </span>
                        </div>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <SelectedBox
                        label="Personne sélectionnée"
                        value={profilSelectionne?.nom_affichage || "Aucune"}
                      />
                      <SelectedBox
                        label="Rubrique sélectionnée"
                        value={rubriqueSelectionnee?.nom || "Aucune"}
                      />
                      <SelectedBox
                        label="Montant saisi"
                        value={selectedMontant > 0 ? formatEuro(selectedMontant) : "0 €"}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <QuickButton onClick={() => incrementMontant(50)} label="+50 €" />
                      <QuickButton onClick={() => incrementMontant(200)} label="+200 €" />
                      <QuickButton onClick={() => setSelectedMontant(0)} label="Réinitialiser" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={ajouterAuPanier}
                        className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
                      >
                        Ajouter au panier
                      </button>

                      <button
                        onClick={resetBasket}
                        className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300"
                      >
                        Vider panier
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title="Panier d'encaissement du membre">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-white/5 text-slate-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Rubrique</th>
                          <th className="px-4 py-3 text-center font-medium">Montant panier</th>
                          <th className="px-4 py-3 text-center font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {basket.map((item) => (
                          <tr key={item.rubrique_id} className="border-t border-white/5">
                            <td className="px-4 py-3 text-white">{item.rubrique_nom}</td>
                            <td className="px-4 py-3 text-center text-white">{formatEuro(item.montant)}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => supprimerLignePanier(item.rubrique_id)}
                                className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}

                        {basket.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                              Aucun article dans le panier.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-300">
                      Total panier : <span className="font-semibold text-white">{formatEuro(basketTotal)}</span>
                    </div>

                    <button
                      onClick={encaisserUniversel}
                      disabled={basket.length === 0 || savingBasket || !selectedProfilId}
                      className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {savingBasket ? "Encaissement..." : "Encaisser membre"}
                    </button>
                  </div>
                </Section>
              </>
            )}

            <Section title={titreSituation}>
              {nomSituation ? (
                <div className="mb-4 text-lg font-medium text-white">{nomSituation}</div>
              ) : null}

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <MiniStat label="Total encaissé" value={formatEuro(totalSituationEncaisse)} />
                <MiniStat label="Rubriques en retard" value={String(nbSituationRetard)} />
              </div>

              <SituationTable
                lignes={lignesSituationUnique}
                getBadgeColor={getBadgeColor}
                formatEuro={formatEuro}
              />
            </Section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SituationTable({
  lignes,
  getBadgeColor,
  formatEuro,
}: {
  lignes: {
    key: string;
    rubrique_nom: string;
    montant_attendu: number;
    montant_encaisse: number;
    statut: string;
    mois: string;
  }[];
  getBadgeColor: (statut: string) => string;
  formatEuro: (value: number | string | null | undefined) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-white/5 text-slate-300">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Session</th>
            <th className="px-4 py-3 text-left font-medium">Rubrique</th>
            <th className="px-4 py-3 text-center font-medium">Attendu</th>
            <th className="px-4 py-3 text-center font-medium">Encaissé</th>
            <th className="px-4 py-3 text-center font-medium">Restant</th>
            <th className="px-4 py-3 text-center font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => {
            const restant = Number(ligne.montant_attendu) - Number(ligne.montant_encaisse);

            return (
              <tr key={ligne.key} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">
                  {ligne.mois ? new Date(ligne.mois).toLocaleDateString("fr-FR") : "-"}
                </td>
                <td className="px-4 py-3 text-white">{ligne.rubrique_nom}</td>
                <td className="px-4 py-3 text-center text-white">{formatEuro(ligne.montant_attendu)}</td>
                <td className="px-4 py-3 text-center text-white">{formatEuro(ligne.montant_encaisse)}</td>
                <td className="px-4 py-3 text-center text-white">{formatEuro(restant)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeColor(ligne.statut)}`}>
                    {ligne.statut}
                  </span>
                </td>
              </tr>
            );
          })}

          {lignes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Aucune contribution trouvée pour cette situation.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-4 text-lg font-semibold text-white">{title}</div>
      {children}
    </div>
  );
}

function Card({
  title,
  value,
  subtle,
}: {
  title: string;
  value: string;
  subtle?: string | null;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      {subtle ? <div className="mt-1 text-sm text-slate-500">{subtle}</div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      {children}
    </label>
  );
}

function SelectedBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 min-h-[110px]">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-3 break-words text-2xl font-semibold leading-tight text-white">
        {value}
      </div>
    </div>
  );
}

function QuickButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
    >
      {label}
    </button>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type NotificationAdminItem = {
  id: string;
  membre_id: string;
  nom_complet: string;
  role_membre: string | null;
  titre: string;
  message: string;
  type: string | null;
  priorite: string | null;
  lu: boolean;
  date_lecture: string | null;
  action_url: string | null;
  source_module: string | null;
  source_id: string | null;
  relance_envoyee: boolean | null;
  date_derniere_relance: string | null;
  nb_relances: number | null;
  created_at: string;
};

type TauxLectureItem = {
  nom_complet: string;
  membre_id: string;
  total_notifications: number;
  lues: number;
  non_lues: number;
  taux_lecture: number;
};

type Profil = {
  role: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR");
}

function priorityStyles(priorite?: string | null) {
  const key = String(priorite ?? "INFO").toUpperCase();
  if (key === "URGENT") return "bg-red-500/15 text-red-100 border-red-400/30";
  if (key === "IMPORTANT") return "bg-amber-500/15 text-amber-100 border-amber-400/30";
  return "bg-cyan-500/15 text-cyan-100 border-cyan-400/30";
}

export default function AdminNotificationsPage() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [notifications, setNotifications] = useState<NotificationAdminItem[]>([]);
  const [tauxLecture, setTauxLecture] = useState<TauxLectureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function chargerProfilEtDroits() {
    const authRes = await supabase.auth.getUser();
    const user = authRes.data.user;

    if (!user) {
      setProfil(null);
      setError("Utilisateur non connecté.");
      return;
    }

    const profilRes = await supabase
      .from("membres")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profilRes.error) {
      setProfil(null);
      setError(profilRes.error.message);
      return;
    }

    setProfil(profilRes.data as Profil);
  }

  async function chargerDonnees() {
    setLoading(true);
    setError(null);

    await chargerProfilEtDroits();

    const authRes = await supabase.auth.getUser();
    const user = authRes.data.user;

    if (!user) {
      setLoading(false);
      return;
    }

    const profilRes = await supabase
      .from("membres")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profilRes.error) {
      setError(profilRes.error.message);
      setLoading(false);
      return;
    }

    const role = String((profilRes.data as Profil).role ?? "").toUpperCase();
    if (!["ADMIN", "PRESIDENT", "TRESORIER"].includes(role)) {
      setError("Accès refusé. Cette page est réservée à President / Tresorier / Admin.");
      setLoading(false);
      return;
    }

    const [notifRes, tauxRes] = await Promise.all([
      supabase.from("v_notifications_admin").select("*").order("created_at", { ascending: false }),
      supabase.from("v_notifications_taux_lecture").select("*").order("taux_lecture", { ascending: true }),
    ]);

    if (notifRes.error) {
      setError(notifRes.error.message);
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (tauxRes.error) {
      setError(tauxRes.error.message);
      setTauxLecture([]);
      setLoading(false);
      return;
    }

    setNotifications((notifRes.data as NotificationAdminItem[] | null) ?? []);
    setTauxLecture((tauxRes.data as TauxLectureItem[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void chargerDonnees();

    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        async () => {
          await chargerDonnees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalNonLues = useMemo(
    () => notifications.filter((item) => !item.lu).length,
    [notifications]
  );

  const totalUrgentes = useMemo(
    () =>
      notifications.filter(
        (item) => String(item.priorite ?? "").toUpperCase() === "URGENT"
      ).length,
    [notifications]
  );

  const aRelancer = useMemo(
    () =>
      notifications.filter(
        (item) =>
          !item.lu &&
          ["IMPORTANT", "URGENT"].includes(String(item.priorite ?? "").toUpperCase())
      ).length,
    [notifications]
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Admin notifications</h1>
              <p className="mt-2 text-sm text-slate-300">
                Suivi centralisé des notifications, de la lecture membre et des cas à relancer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:w-[380px]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
                <div className="mt-2 text-2xl font-semibold text-white">{notifications.length}</div>
              </div>
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-red-200/80">Non lues</div>
                <div className="mt-2 text-2xl font-semibold text-white">{totalNonLues}</div>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Urgentes</div>
                <div className="mt-2 text-2xl font-semibold text-white">{totalUrgentes}</div>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">À relancer</div>
                <div className="mt-2 text-2xl font-semibold text-white">{aRelancer}</div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-100 shadow-2xl backdrop-blur-xl">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300 shadow-2xl backdrop-blur-xl">
            Chargement...
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Taux de lecture par membre</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm text-slate-200">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-400">
                      <th className="px-3 py-3">Membre</th>
                      <th className="px-3 py-3">Total</th>
                      <th className="px-3 py-3">Lues</th>
                      <th className="px-3 py-3">Non lues</th>
                      <th className="px-3 py-3">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tauxLecture.map((item) => (
                      <tr key={item.membre_id} className="border-b border-white/5">
                        <td className="px-3 py-3">{item.nom_complet}</td>
                        <td className="px-3 py-3">{item.total_notifications}</td>
                        <td className="px-3 py-3">{item.lues}</td>
                        <td className="px-3 py-3">{item.non_lues}</td>
                        <td className="px-3 py-3">{item.taux_lecture}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Historique des notifications</h2>
              <div className="mt-4 space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                            {notification.nom_complet}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                            {notification.role_membre ?? "MEMBRE"}
                          </span>
                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                              priorityStyles(notification.priorite),
                            ].join(" ")}
                          >
                            {notification.priorite ?? "INFO"}
                          </span>
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-medium",
                              notification.lu
                                ? "bg-emerald-500/15 text-emerald-100"
                                : "bg-red-500/15 text-red-100",
                            ].join(" ")}
                          >
                            {notification.lu ? "Lue" : "Non lue"}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-white">
                            {notification.titre}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                          <span>Créée le : {formatDate(notification.created_at)}</span>
                          <span>Lecture : {formatDate(notification.date_lecture)}</span>
                          <span>Relances : {notification.nb_relances ?? 0}</span>
                          <span>
                            Dernière relance : {formatDate(notification.date_derniere_relance)}
                          </span>
                        </div>
                      </div>

                      {notification.action_url ? (
                        <a
                          href={notification.action_url}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Ouvrir l’action
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

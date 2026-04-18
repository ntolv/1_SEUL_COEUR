"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type NotificationItem = {
  id: string;
  titre: string;
  message: string;
  type: string | null;
  priorite: string | null;
  lu: boolean;
  date_lecture: string | null;
  action_url: string | null;
  source_module: string | null;
  source_id: string | null;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Date inconnue";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR");
}

function priorityStyles(priorite?: string | null) {
  const key = String(priorite ?? "INFO").toUpperCase();
  if (key === "URGENT") {
    return "border-red-400/30 bg-red-500/15 text-red-100";
  }
  if (key === "IMPORTANT") {
    return "border-amber-400/30 bg-amber-500/15 text-amber-100";
  }
  return "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chargerNotifications() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("v_notifications_me")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications((data as NotificationItem[] | null) ?? []);
    setLoading(false);
  }

  async function marquerCommeLue(id: string) {
    setBusyId(id);
    const { error } = await supabase.rpc("fn_notification_marquer_lue", {
      p_notification_id: id,
    });

    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }

    await chargerNotifications();
    setBusyId(null);
  }

  async function handleNotificationClick(notification: NotificationItem) {
    if (!notification.lu) {
      await marquerCommeLue(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  }

  useEffect(() => {
    void chargerNotifications();

    const channel = supabase
      .channel("notifications-page-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        async () => {
          await chargerNotifications();
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

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Notifications</h1>
              <p className="mt-2 text-sm text-slate-300">
                Les nouvelles notifications apparaissent automatiquement. Les priorités
                sont visibles ici, et chaque lecture est tracée.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:w-[340px]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Total
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {notifications.length}
                </div>
              </div>

              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-red-200/80">
                  Non lues
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {totalNonLues}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                  Urgentes
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {totalUrgentes}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                  Lues
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {notifications.length - totalNonLues}
                </div>
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
            Chargement des notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300 shadow-2xl backdrop-blur-xl">
            Aucune notification.
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isUnread = !notification.lu;

              return (
                <div
                  key={notification.id}
                  className={[
                    "rounded-3xl border p-5 shadow-2xl backdrop-blur-xl transition",
                    isUnread
                      ? "border-cyan-400/20 bg-cyan-500/10"
                      : "border-white/10 bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
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
                            isUnread
                              ? "bg-red-500/15 text-red-100"
                              : "bg-emerald-500/15 text-emerald-100",
                          ].join(" ")}
                        >
                          {isUnread ? "Non lue" : "Lue"}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {notification.titre}
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Créée le : {formatDate(notification.created_at)}</span>
                        <span>
                          Lecture :{" "}
                          {notification.date_lecture
                            ? formatDate(notification.date_lecture)
                            : "pas encore lue"}
                        </span>
                        {notification.source_module ? (
                          <span>Module : {notification.source_module}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 md:w-[220px]">
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={() => marquerCommeLue(notification.id)}
                          disabled={busyId === notification.id}
                          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyId === notification.id
                            ? "Mise à jour..."
                            : "Marquer comme lue"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-900"
                      >
                        {notification.action_url ? "Ouvrir l’action" : "Ouvrir"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

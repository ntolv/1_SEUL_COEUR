"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type NotificationItem = {
  id: string;
  titre: string;
  message: string;
  type: "INFO" | "SUCCES" | "ALERTE" | "ERREUR";
  lu: boolean;
  date_lecture: string | null;
  source_module: string | null;
  source_id: string | null;
  action_url: string | null;
  created_at: string;
};

function formatDate(valeur: string | null) {
  if (!valeur) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valeur));
}

function getTypeStyle(type: NotificationItem["type"]) {
  switch (type) {
    case "SUCCES":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "ALERTE":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "ERREUR":
      return "border-red-400/30 bg-red-400/10 text-red-200";
    default:
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [actionChargement, setActionChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function chargerNotifications() {
    setChargement(true);
    setErreur("");

    const { data: countData, error: countError } = await supabase.rpc(
      "fn_notifications_unread_count"
    );

    if (countError) {
      setErreur(countError.message);
      setChargement(false);
      return;
    }

    const { data: inboxData, error: inboxError } = await supabase.rpc(
      "fn_notifications_inbox",
      {
        p_limit: 50,
        p_offset: 0,
      }
    );

    if (inboxError) {
      setErreur(inboxError.message);
      setChargement(false);
      return;
    }

    setUnreadCount(Number(countData ?? 0));
    setNotifications(inboxData || []);
    setChargement(false);
  }

  useEffect(() => {
    chargerNotifications();
  }, []);

  async function marquerCommeLue(id: string) {
    setActionChargement(true);
    setErreur("");

    const { error } = await supabase.rpc("fn_notification_mark_as_read", {
      p_id: id,
    });

    if (error) {
      setErreur(error.message);
      setActionChargement(false);
      return;
    }

    await chargerNotifications();
    setActionChargement(false);
  }

  async function toutMarquerCommeLu() {
    setActionChargement(true);
    setErreur("");

    const { error } = await supabase.rpc("fn_notifications_mark_all_as_read");

    if (error) {
      setErreur(error.message);
      setActionChargement(false);
      return;
    }

    await chargerNotifications();
    setActionChargement(false);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-200">
                Notifications
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Ma boîte de réception
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Retrouve toutes les alertes, informations et mises à jour liées à ton compte.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </div>

              <button
                onClick={toutMarquerCommeLu}
                disabled={actionChargement || notifications.length === 0}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:opacity-60"
              >
                Tout marquer comme lu
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {chargement ? (
            <p className="text-slate-300">Chargement des notifications...</p>
          ) : erreur ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {erreur}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-6 text-sm text-slate-300">
              Aucune notification pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={
                    "rounded-2xl border p-5 transition " +
                    (item.lu
                      ? "border-white/10 bg-slate-950/50"
                      : "border-cyan-400/20 bg-cyan-400/5")
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "rounded-full border px-3 py-1 text-xs " + getTypeStyle(item.type)
                          }
                        >
                          {item.type}
                        </span>

                        {!item.lu ? (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                            Non lue
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            Lue
                          </span>
                        )}
                      </div>

                      <h2 className="mt-4 text-xl font-semibold">{item.titre}</h2>
                      <p className="mt-2 text-sm text-slate-300">{item.message}</p>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>Créée le {formatDate(item.created_at)}</span>
                        {item.source_module ? <span>Module : {item.source_module}</span> : null}
                        {item.date_lecture ? (
                          <span>Lue le {formatDate(item.date_lecture)}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!item.lu ? (
                        <button
                          onClick={() => marquerCommeLue(item.id)}
                          disabled={actionChargement}
                          className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-60"
                        >
                          Marquer comme lue
                        </button>
                      ) : null}

                      {item.action_url ? (
                        <a
                          href={item.action_url}
                          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-400/10"
                        >
                          Ouvrir
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

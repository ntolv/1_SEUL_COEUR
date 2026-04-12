"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type NotificationItem = {
id: string;
titre: string;
message: string;
lu: boolean;
created_at: string;
action_url: string | null;
};

export default function NotificationsPage() {
const router = useRouter();
const [notifications, setNotifications] = useState<NotificationItem[]>([]);
const [loading, setLoading] = useState(true);

async function chargerNotifications() {
setLoading(true);

```
const { data, error } = await supabase
  .from("v_notifications_me")
  .select("*")
  .order("created_at", { ascending: false });

if (!error && data) {
  setNotifications(data as NotificationItem[]);
}

setLoading(false);
```

}

async function handleNotificationClick(notification: NotificationItem) {
if (!notification.lu) {
await supabase.rpc("fn_notification_marquer_lue", {
p_notification_id: notification.id,
});
}

```
if (notification.action_url) {
  router.push(notification.action_url);
  return;
}

await chargerNotifications();
```

}

useEffect(() => {
let isMounted = true;
let channel: ReturnType<typeof supabase.channel> | null = null;

```
async function initRealtime() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const membreId = session?.user?.id;

  await chargerNotifications();

  if (!isMounted || !membreId) {
    return;
  }

  channel = supabase
    .channel("notifications-page-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `membre_id=eq.${membreId}`,
      },
      async () => {
        await chargerNotifications();
      }
    )
    .subscribe();
}

initRealtime();

return () => {
  isMounted = false;
  if (channel) {
    supabase.removeChannel(channel);
  }
};
```

}, []);

return ( <AppShell> <div className="space-y-6"> <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl"> <h1 className="text-2xl font-semibold">Notifications</h1> <p className="mt-2 text-sm text-slate-400">
Les nouvelles notifications apparaissent automatiquement. </p> </div>

```
    {loading ? (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
        Chargement...
      </div>
    ) : notifications.length === 0 ? (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
        Aucune notification.
      </div>
    ) : (
      <div className="space-y-4">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleNotificationClick(notification)}
            className={
              "w-full rounded-2xl border p-4 text-left transition " +
              (notification.lu
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/15")
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">
                  {notification.titre}
                </div>

                <div className="mt-2 text-sm text-slate-300">
                  {notification.message}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {new Date(notification.created_at).toLocaleString("fr-FR")}
                </div>
              </div>

              {!notification.lu && (
                <div className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">
                  Nouveau
                </div>
              )}
            </div>

            {notification.action_url && (
              <div className="mt-3 text-xs text-emerald-300">
                Action disponible
              </div>
            )}
          </button>
        ))}
      </div>
    )}
  </div>
</AppShell>
```

);
}

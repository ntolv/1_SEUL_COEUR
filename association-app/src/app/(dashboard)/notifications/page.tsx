"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Notification = {
id: string;
titre: string;
message: string;
lu: boolean;
created_at: string;
action_url: string | null;
};

export default function NotificationsPage() {
const router = useRouter();
const [notifications, setNotifications] = useState<Notification[]>([]);
const [loading, setLoading] = useState(true);

async function charger() {
setLoading(true);

```
const { data, error } = await supabase
  .from("v_notifications_me")
  .select("*")
  .order("created_at", { ascending: false });

if (!error && data) {
  setNotifications(data as Notification[]);
}

setLoading(false);
```

}

async function handleClick(n: Notification) {
await supabase.rpc("fn_notification_marquer_lue", {
p_notification_id: n.id,
});

```
if (n.action_url) {
  router.push(n.action_url);
  return;
}

await charger();
```

}

useEffect(() => {
charger();
}, []);

return ( <AppShell> <div className="space-y-6"> <h1 className="text-2xl font-semibold">Notifications</h1>

```
    {loading ? (
      <div className="text-slate-400">Chargement...</div>
    ) : notifications.length === 0 ? (
      <div className="text-slate-400">Aucune notification</div>
    ) : (
      <div className="space-y-4">
        {notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => handleClick(n)}
            className={
              "w-full rounded-2xl border p-4 text-left transition " +
              (n.lu
                ? "border-white/10 bg-white/5"
                : "border-cyan-400/30 bg-cyan-400/10")
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div className="font-semibold">{n.titre}</div>
              {!n.lu && (
                <div className="text-xs text-cyan-300">Nouveau</div>
              )}
            </div>

            <div className="mt-2 text-sm text-slate-300">
              {n.message}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {new Date(n.created_at).toLocaleString("fr-FR")}
            </div>

            {n.action_url && (
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

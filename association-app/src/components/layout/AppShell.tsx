"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const liens = [
{ href: "/page-accueil", label: "Accueil" },
{ href: "/dashboard", label: "Dashboard" },
{ href: "/synthese-caisse", label: "Synthèse caisse" },
{ href: "/membres", label: "Membres" },
{ href: "/encaissements", label: "Encaissements" },
{ href: "/situation-globale", label: "Situation globale" },
{ href: "/prets", label: "Prêts" },
{ href: "/investissements", label: "Investissements" },
{ href: "/notifications", label: "Notifications" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
const pathname = usePathname();
const [menuOpen, setMenuOpen] = useState(false);
const [count, setCount] = useState(0);

async function loadCount() {
const { data } = await supabase
.from("v_notifications_non_lues_count")
.select("*")
.single();

```
if (data) {
  setCount(data.total_non_lues || 0);
}
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

  await loadCount();

  if (!isMounted || !membreId) {
    return;
  }

  channel = supabase
    .channel("notifications-badge-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `membre_id=eq.${membreId}`,
      },
      async () => {
        await loadCount();
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

return ( <div className="min-h-screen w-full bg-[#020617] text-white"> <div className="fixed inset-0 -z-10"> <div className="absolute inset-0 bg-[#020617]" /> <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_30%)]" /> <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_30%)]" /> </div>

```
  <div className="flex min-h-screen w-full">
    <aside className="hidden w-72 flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-xl lg:flex">
      <div className="p-6 text-lg font-semibold">UN SEUL COEUR</div>

      <nav className="flex-1 space-y-2 px-4">
        {liens.map((lien) => {
          const active = pathname === lien.href;

          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={
                "block rounded-xl px-4 py-3 text-sm transition " +
                (active
                  ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                  : "text-slate-300 hover:bg-white/5")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span>{lien.label}</span>

                {lien.href === "/notifications" && count > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                    {count}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>

    {menuOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={() => setMenuOpen(false)}
      />
    )}

    <aside
      className={
        "fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 p-4 transition-transform lg:hidden " +
        (menuOpen ? "translate-x-0" : "-translate-x-full")
      }
    >
      <div className="mb-4 text-lg font-semibold">UN SEUL COEUR</div>

      <div className="space-y-2">
        {liens.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            onClick={() => setMenuOpen(false)}
            className="block rounded-xl px-4 py-3 text-white hover:bg-white/5"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{lien.label}</span>

              {lien.href === "/notifications" && count > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {count}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </aside>

    <div className="flex min-h-screen w-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 p-4 backdrop-blur">
        <button onClick={() => setMenuOpen(true)} className="lg:hidden">
          ☰
        </button>

        <div className="font-semibold">Interface PRO++</div>

        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 font-bold text-black">
            USC
          </div>

          {count > 0 && (
            <div className="absolute -right-1 -top-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {count}
            </div>
          )}
        </div>
      </header>

      <main className="w-full flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  </div>
</div>
```

);
}

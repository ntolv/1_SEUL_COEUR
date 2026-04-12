"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

return ( <div className="min-h-screen w-full bg-[#020617] text-white">

```
  {/* BACKGROUND */}
  <div className="fixed inset-0 -z-10">
    <div className="absolute inset-0 bg-[#020617]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_30%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_30%)]" />
  </div>

  <div className="flex min-h-screen w-full">

    {/* SIDEBAR DESKTOP */}
    <aside className="hidden lg:flex w-72 flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="p-6 text-lg font-semibold">UN SEUL COEUR</div>

      <nav className="flex-1 px-4 space-y-2">
        {liens.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "block rounded-xl px-4 py-3 text-sm transition " +
                (active
                  ? "bg-cyan-400/10 border border-cyan-400/30 text-cyan-200"
                  : "text-slate-300 hover:bg-white/5")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>

    {/* MOBILE OVERLAY */}
    {menuOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={() => setMenuOpen(false)}
      />
    )}

    {/* SIDEBAR MOBILE */}
    <aside
      className={
        "fixed z-50 inset-y-0 left-0 w-72 bg-slate-950 p-4 transform transition lg:hidden " +
        (menuOpen ? "translate-x-0" : "-translate-x-full")
      }
    >
      {liens.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={() => setMenuOpen(false)}
          className="block py-3 text-white"
        >
          {l.label}
        </Link>
      ))}
    </aside>

    {/* CONTENU */}
    <div className="flex-1 flex flex-col min-h-screen w-full">

      {/* HEADER */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <button onClick={() => setMenuOpen(true)} className="lg:hidden">
          ☰
        </button>

        <div className="font-semibold">Interface PRO++</div>

        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-black font-bold">
          USC
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
        {children}
      </main>

    </div>
  </div>
</div>
```

);
}

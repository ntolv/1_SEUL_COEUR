"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function BarChart3(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-7" />
    </svg>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const liens = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/membres", label: "Membres" },
  { href: "/encaissements", label: "Encaissements" },
  { href: "/situation-globale", label: "Situation globale", icon: BarChart3 },
  { href: "/prets", label: "Prêts" },
  { href: "/investissements", label: "Investissements" },
  { href: "/notifications", label: "Notifications" },
];

type NavProps = {
  pathname: string;
  onNavigate?: () => void;
};

function NavigationContent({ pathname, onNavigate }: NavProps) {
  return (
    <>
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <div>
          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-200">
            Association
          </div>
          <div className="mt-3 text-xl font-semibold tracking-tight">
            UN SEUL COEUR
          </div>
        </div>
      </div>

      <nav className="p-4">
        <div className="mb-3 px-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          Navigation
        </div>

        <div className="space-y-2">
          {liens.map((lien) => {
            const actif = pathname === lien.href;
            return (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={onNavigate}
                className={
                  "block rounded-2xl px-4 py-3 text-sm transition " +
                  (actif
                    ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border border-transparent bg-white/0 text-slate-300 hover:border-white/10 hover:bg-white/5")
                }
              >
                {lien.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_25%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_28%)]" />

      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-slate-950/80 backdrop-blur-xl lg:block">
          <NavigationContent pathname={pathname} />
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={
            "fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 lg:hidden " +
            (mobileMenuOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div className="text-lg font-semibold tracking-tight">UN SEUL COEUR</div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200"
              aria-label="Fermer le menu"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <NavigationContent
            pathname={pathname}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 lg:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>

                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Interface PRO++
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-tight">
                    Gestion Association Futuriste
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 sm:block">
                  Session active
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-slate-950">
                  USC
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChartColumn,
  ChevronDown,
  FileText,
  HandCoins,
  Home,
  Landmark,
  Menu,
  MoreHorizontal,
  Shield,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ProfilMe = {
  role?: string | null;
};

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  items: NavItem[];
  adminOnly?: boolean;
  bureauOnly?: boolean;
};

const navGroups: NavGroup[] = [
  {
    key: "accueil",
    label: "Accueil",
    icon: Home,
    href: "/page-accueil",
    items: [{ href: "/page-accueil", label: "Centre d'opérations" }],
  },
  {
    key: "membres",
    label: "Membres",
    icon: Users,
    href: "/membres",
    items: [
      { href: "/membres", label: "Liste des membres" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    key: "finances",
    label: "Finances",
    icon: HandCoins,
    href: "/encaissements",
    bureauOnly: true,
    items: [
      { href: "/encaissements", label: "Encaissements" },
      { href: "/encaissements/historique", label: "Historique encaissements" },
      { href: "/decaissements", label: "Décaissements" },
      { href: "/prets", label: "Prêts" },
      { href: "/investissements", label: "Investissements" },
    ],
  },
  {
    key: "caisses",
    label: "Caisses",
    icon: Landmark,
    href: "/suivi-global",
    bureauOnly: true,
    items: [
      { href: "/suivi-global", label: "Suivi global" },
      { href: "/suivi-caisse-session", label: "Suivi caisse session" },
      { href: "/synthese-caisse", label: "Synthèse caisse" },
    ],
  },
  {
    key: "rapports",
    label: "Rapports",
    icon: ChartColumn,
    href: "/synthese-caisse",
    bureauOnly: true,
    items: [
      { href: "/synthese-caisse", label: "Synthèse caisse" },
      { href: "/suivi-global", label: "Suivi global" },
      { href: "/documentation", label: "Documentation" },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    icon: Shield,
    href: "/admin-notifications",
    adminOnly: true,
    items: [
      { href: "/admin-notifications", label: "Admin notifications" },
      { href: "/notifications", label: "Notifications" },
      { href: "/documentation", label: "Documentation" },
    ],
  },
];

const memberFallbackGroups: NavGroup[] = [
  {
    key: "accueil",
    label: "Accueil",
    icon: Home,
    href: "/page-accueil",
    items: [{ href: "/page-accueil", label: "Centre d'opérations" }],
  },
  {
    key: "membres",
    label: "Membres",
    icon: Users,
    href: "/membres",
    items: [
      { href: "/membres", label: "Annuaire membres" },
      { href: "/dashboard", label: "Mon dashboard" },
    ],
  },
  {
    key: "finances",
    label: "Mon espace",
    icon: HandCoins,
    href: "/dashboard",
    items: [
      { href: "/dashboard", label: "Mon dashboard" },
      { href: "/prets", label: "Mes prêts" },
      { href: "/investissements", label: "Mes investissements" },
    ],
  },
  {
    key: "rapports",
    label: "Documents",
    icon: FileText,
    href: "/documentation",
    items: [
      { href: "/documentation", label: "Documentation" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [role, setRole] = useState<string>("");

  const roleUpper = String(role || "").toUpperCase();
  const canManage =
    roleUpper === "ADMIN" ||
    roleUpper === "PRESIDENT" ||
    roleUpper === "TRESORIER";

  const visibleGroups = useMemo(() => {
    if (!canManage) {
      return memberFallbackGroups;
    }

    return navGroups.filter((group) => {
      if (group.adminOnly && roleUpper !== "ADMIN") return false;
      if (group.bureauOnly && !canManage) return false;
      return true;
    });
  }, [canManage, roleUpper]);

  const activeGroupKey = useMemo(() => {
    const group = visibleGroups.find((g) =>
      g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    );

    return group?.key || "accueil";
  }, [pathname, visibleGroups]);

  const [openGroup, setOpenGroup] = useState<string>("accueil");

  useEffect(() => {
    setOpenGroup(activeGroupKey);
  }, [activeGroupKey]);

  async function loadCount() {
    const { data } = await supabase
      .from("v_notifications_non_lues_count")
      .select("*")
      .single();

    if (data) {
      setCount(data.total_non_lues || 0);
    }
  }

  async function loadRole() {
    const { data, error } = await supabase.rpc("fn_me");

    if (!error && Array.isArray(data) && data.length > 0) {
      const profil = data[0] as ProfilMe;
      setRole(String(profil.role || ""));
    }
  }

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initRealtime() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const membreId = session?.user?.id;

      await Promise.all([loadCount(), loadRole()]);

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
  }, []);

  const bottomItems = visibleGroups.slice(0, 4);

  return (
    <div className="min-h-screen w-full bg-[#020617] text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_30%)]" />
      </div>

      <div className="flex min-h-screen w-full">
        <aside className="hidden w-72 flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-xl lg:flex">
          <div className="border-b border-white/10 p-6">
            <div className="text-lg font-bold tracking-wide">UN SEUL COEUR</div>
            <div className="mt-1 text-xs text-slate-400">Centre d'opérations</div>
          </div>

          <nav className="flex-1 space-y-3 px-4 py-5">
            {visibleGroups.map((group) => {
              const Icon = group.icon;
              const groupActive = group.key === activeGroupKey;
              const expanded = openGroup === group.key;

              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(expanded ? "" : group.key)}
                    className={
                      "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition " +
                      (groupActive
                        ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "text-slate-300 hover:bg-white/5")
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{group.label}</span>
                    </span>
                    <ChevronDown
                      className={
                        "h-4 w-4 transition " + (expanded ? "rotate-180" : "")
                      }
                    />
                  </button>

                  {expanded && (
                    <div className="mt-2 space-y-1 pl-4">
                      {group.items.map((item) => {
                        const active =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={
                              "block rounded-xl px-4 py-2 text-sm transition " +
                              (active
                                ? "bg-white/10 text-cyan-100"
                                : "text-slate-400 hover:bg-white/5 hover:text-white")
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{item.label}</span>
                              {item.href === "/notifications" && count > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                                  {count}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          className={
            "fixed inset-y-0 left-0 z-50 w-80 max-w-[86vw] bg-slate-950 p-4 transition-transform lg:hidden " +
            (menuOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">UN SEUL COEUR</div>
              <div className="text-xs text-slate-400">Menu complet</div>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-white/10 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {visibleGroups.map((group) => {
              const Icon = group.icon;
              const groupActive = group.key === activeGroupKey;
              const expanded = openGroup === group.key;

              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(expanded ? "" : group.key)}
                    className={
                      "flex w-full items-center justify-between rounded-2xl px-4 py-3 transition " +
                      (groupActive
                        ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "text-white hover:bg-white/5")
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{group.label}</span>
                    </span>
                    <ChevronDown
                      className={
                        "h-4 w-4 transition " + (expanded ? "rotate-180" : "")
                      }
                    />
                  </button>

                  {expanded && (
                    <div className="mt-2 space-y-1 pl-4">
                      {group.items.map((item) => {
                        const active =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={
                              "block rounded-xl px-4 py-2 text-sm transition " +
                              (active
                                ? "bg-white/10 text-cyan-100"
                                : "text-slate-300 hover:bg-white/5 hover:text-white")
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{item.label}</span>
                              {item.href === "/notifications" && count > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                                  {count}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-screen w-full flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/70 p-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl bg-white/10 p-2 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="font-semibold">Centre d'opérations</div>
              <div className="hidden text-xs text-slate-400 sm:block">
                Navigation métier simplifiée
              </div>
            </div>

            <Link href="/notifications" className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 font-bold text-black">
                USC
              </div>

              {count > 0 && (
                <div className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {count}
                </div>
              )}
            </Link>
          </header>

          <main className="w-full flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
            {children}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 py-2 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-5 gap-1">
              {bottomItems.map((group) => {
                const Icon = group.icon;
                const active = group.key === activeGroupKey;

                return (
                  <Link
                    key={group.key}
                    href={group.href || group.items[0]?.href || "/page-accueil"}
                    className={
                      "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs transition " +
                      (active
                        ? "bg-cyan-400/10 text-cyan-100"
                        : "text-slate-400 hover:bg-white/5 hover:text-white")
                    }
                  >
                    <Icon className="mb-1 h-5 w-5" />
                    <span className="max-w-full truncate">{group.label}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setMobileMoreOpen((v) => !v)}
                className={
                  "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs transition " +
                  (mobileMoreOpen
                    ? "bg-cyan-400/10 text-cyan-100"
                    : "text-slate-400 hover:bg-white/5 hover:text-white")
                }
              >
                <MoreHorizontal className="mb-1 h-5 w-5" />
                <span>Plus</span>
              </button>
            </div>

            {mobileMoreOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-2 rounded-3xl border border-white/10 bg-slate-950 p-3 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(true);
                    setMobileMoreOpen(false);
                  }}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left text-sm text-white"
                >
                  <Menu className="h-5 w-5" />
                  Menu complet
                </button>

                <Link
                  href="/notifications"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
                >
                  <span className="flex items-center gap-3">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </span>
                  {count > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                      {count}
                    </span>
                  )}
                </Link>

                <Link
                  href="/documentation"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
                >
                  <FileText className="h-5 w-5" />
                  Documentation
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
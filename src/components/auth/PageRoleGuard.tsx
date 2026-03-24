"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Role = "ADMIN" | "PRESIDENT" | "TRESORIER" | "MEMBRE";

export default function PageRoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.rpc("fn_me");

      if (!mounted) return;

      if (error || !data) {
        router.replace("/dashboard");
        return;
      }

      const profil = Array.isArray(data) ? data[0] : data;

      if (!profil?.statut_actif) {
        router.replace("/login");
        return;
      }

      if (!allowedRoles.includes(profil?.role)) {
        router.replace("/dashboard");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, router]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        Vérification des droits...
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}

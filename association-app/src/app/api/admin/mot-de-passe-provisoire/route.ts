import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;

  function pick(source: string) {
    return source[Math.floor(Math.random() * source.length)];
  }

  let password =
    pick(upper) +
    pick(lower) +
    pick(digits) +
    pick(special);

  for (let i = 0; i < 8; i += 1) {
    password += pick(all);
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, message: "Variables Supabase manquantes côté serveur." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Token admin manquant." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const memberId = body?.memberId as string | undefined;

    if (!memberId) {
      return NextResponse.json(
        { ok: false, message: "memberId manquant." },
        { status: 400 }
      );
    }

    const publicClient = createClient(supabaseUrl, supabaseAnonKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await publicClient.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, message: "Session admin invalide." },
        { status: 401 }
      );
    }

    const { data: adminMember, error: adminError } = await serviceClient
      .from("membres")
      .select("id, role, statut_actif")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !adminMember) {
      return NextResponse.json(
        { ok: false, message: "Profil admin introuvable." },
        { status: 403 }
      );
    }

    if (!adminMember.statut_actif || adminMember.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Action réservée à l'administrateur." },
        { status: 403 }
      );
    }

    const { data: cible, error: cibleError } = await serviceClient
      .from("membres")
      .select("id, nom_complet, email, auth_user_id, statut_actif")
      .eq("id", memberId)
      .single();

    if (cibleError || !cible) {
      return NextResponse.json(
        { ok: false, message: "Membre introuvable." },
        { status: 404 }
      );
    }

    if (!cible.statut_actif) {
      return NextResponse.json(
        { ok: false, message: "Ce membre est inactif." },
        { status: 400 }
      );
    }

    if (!cible.auth_user_id) {
      return NextResponse.json(
        { ok: false, message: "Ce membre n'a pas encore de compte connecté." },
        { status: 400 }
      );
    }

    const motDePasseProvisoire = generateTemporaryPassword();

    const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(
      cible.auth_user_id,
      {
        password: motDePasseProvisoire,
        email_confirm: true,
      }
    );

    if (authUpdateError) {
      return NextResponse.json(
        { ok: false, message: authUpdateError.message },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateMemberError } = await serviceClient
      .from("membres")
      .update({
        mot_de_passe_provisoire_actif: true,
        doit_changer_mot_de_passe: true,
        date_generation_mdp_provisoire: nowIso,
        genere_par_user_id: user.id,
        updated_at: nowIso,
      })
      .eq("id", cible.id);

    if (updateMemberError) {
      return NextResponse.json(
        { ok: false, message: updateMemberError.message },
        { status: 400 }
      );
    }

    await serviceClient.from("audit_logs").insert({
      table_name: "membres",
      action: "GENERATE_TEMP_PASSWORD",
      record_id: cible.id,
      old_data: null,
      new_data: {
        membre_id: cible.id,
        email: cible.email,
        mot_de_passe_provisoire_actif: true,
        doit_changer_mot_de_passe: true,
      },
      changed_fields: {
        mot_de_passe_provisoire_actif: true,
        doit_changer_mot_de_passe: true,
        genere_par_user_id: user.id,
      },
      user_id: user.id,
      user_role: "ADMIN",
      created_at: nowIso,
    });

    return NextResponse.json({
      ok: true,
      message: "Mot de passe provisoire généré.",
      motDePasseProvisoire,
      membre: {
        id: cible.id,
        nom_complet: cible.nom_complet,
        email: cible.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Erreur serveur inattendue.",
      },
      { status: 500 }
    );
  }
}

"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function switchOrganization(organizationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  // Verify membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "Você não tem acesso a esta organização." };
  }

  const cookieStore = await cookies();
  cookieStore.set("nexora_active_org", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return { success: true };
}
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createOrgSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  slug: z
    .string()
    .min(2, "Identificador deve ter pelo menos 2 caracteres")
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens"
    ),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export async function createOrganization(input: CreateOrgInput) {
  const validated = createOrgSchema.parse(input);

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Usuário não autenticado." };
  }

  // Check if slug already exists
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", validated.slug)
    .maybeSingle();

  if (existing) {
    return { error: "Este identificador já está em uso. Escolha outro." };
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: validated.name,
      slug: validated.slug,
      created_by: user.id,
    })
    .select()
    .single();

  if (orgError || !org) {
    return { error: "Erro ao criar organização. Tente novamente." };
  }

  // Create OWNER membership
  const { error: memberError } = await supabase.from("memberships").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "OWNER",
  });

  if (memberError) {
    // Rollback: delete the org if membership fails
    await supabase.from("organizations").delete().eq("id", org.id);
    return { error: "Erro ao vincular usuário à organização." };
  }

  return { organizationId: org.id };
}
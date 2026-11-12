"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import type { SalesChannel } from "@/types/sales";
import {
  createChannelSchema,
  updateChannelSchema,
  type CreateChannelInput,
  type UpdateChannelInput,
} from "./schemas";

async function getCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const activeData = await getActiveOrganization();
  if (!activeData) throw new Error("Nenhuma organização ativa");
  return { supabase, user, orgId: activeData.org.id };
}

export async function getSalesChannels(): Promise<SalesChannel[]> {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("sales_channels")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as SalesChannel[];
}

export async function createChannel(input: CreateChannelInput) {
  const parsed = createChannelSchema.parse(input);
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase.from("sales_channels").insert({
    organization_id: orgId,
    name: parsed.name,
    description: parsed.description ?? null,
    is_active: parsed.is_active,
  });
  if (error) throw error;
  revalidatePath("/dashboard/vendas/canais");
  return { success: true };
}

export async function updateChannel(id: string, input: UpdateChannelInput) {
  const parsed = updateChannelSchema.parse(input);
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("sales_channels")
    .update({
      name: parsed.name,
      description: parsed.description ?? null,
      is_active: parsed.is_active,
    })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/vendas/canais");
  return { success: true };
}

export async function deleteChannel(id: string) {
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("sales_channels")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/vendas/canais");
  return { success: true };
}
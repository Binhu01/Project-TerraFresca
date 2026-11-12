"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  AiConversation,
  AiMessage,
  AiSettings,
  AiInsight,
  AiUsageStats,
  UpdateAiSettingsInput,
} from "@/types/ai";
import { isAiConfigured } from "@/lib/ai/provider";

// ============================================================================
// CONTEXT HELPER
// ============================================================================

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role, id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  if (!membership) throw new Error("Organização não encontrada");

  return { supabase, user, orgId: membership.organization_id, role: membership.role, membershipId: membership.id };
}

function reval() {
  revalidatePath("/dashboard/intelligence");
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

export async function getConversations(): Promise<AiConversation[]> {
  const { supabase, user, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as AiConversation[];
}

export async function createConversation(title?: string): Promise<{ id: string }> {
  const { supabase, user, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      organization_id: orgId,
      user_id: user.id,
      title: title?.trim() || "Nova conversa",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  reval();
  return data;
}

export async function updateConversationTitle(conversationId: string, title: string) {
  const { supabase, user } = await getCtx();

  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: title.trim() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  reval();
}

export async function archiveConversation(conversationId: string) {
  const { supabase, user } = await getCtx();

  const { error } = await supabase
    .from("ai_conversations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  reval();
}

export async function deleteConversation(conversationId: string) {
  const { supabase, user } = await getCtx();

  // Delete messages first (cascade should handle this, but explicit for safety)
  await supabase
    .from("ai_messages")
    .delete()
    .in("conversation_id", [conversationId]);

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// MESSAGES
// ============================================================================

export async function getMessages(conversationId: string): Promise<AiMessage[]> {
  const { supabase, user } = await getCtx();

  // Verify conversation ownership
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) throw new Error("Conversa não encontrada");

  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AiMessage[];
}

export async function saveUserMessage(conversationId: string, content: string): Promise<{ id: string }> {
  const { supabase, user, orgId } = await getCtx();

  // Verify conversation ownership
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) throw new Error("Conversa não encontrada");

  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      role: "user",
      content,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Update conversation timestamp and auto-title from first message
  const { count } = await supabase
    .from("ai_messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if ((count ?? 0) <= 1) {
    const autoTitle = content.slice(0, 60) + (content.length > 60 ? "..." : "");
    await supabase
      .from("ai_conversations")
      .update({ title: autoTitle, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } else {
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  reval();
  return data;
}

export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<{ id: string }> {
  const { supabase, user, orgId } = await getCtx();

  // Verify conversation ownership
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) throw new Error("Conversa não encontrada");

  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      role: "assistant",
      content,
      message_metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  reval();
  return data;
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getAiSettings(): Promise<AiSettings | null> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data as AiSettings) ?? null;
}

export async function updateAiSettings(input: UpdateAiSettingsInput) {
  const { supabase, user, orgId, role } = await getCtx();

  // Only OWNER and ADMIN can manage settings
  if (!["OWNER", "ADMIN"].includes(role)) {
    throw new Error("Permissão negada: apenas proprietários e administradores podem alterar configurações da IA");
  }

  const updateSchema = z.object({
    is_enabled: z.boolean().optional(),
    usage_limit_monthly: z.number().int().min(1).max(100000).optional(),
    daily_limit: z.number().int().min(1).max(10000).optional(),
    max_tokens_per_request: z.number().int().min(256).max(32768).optional(),
  });

  const parsed = updateSchema.parse(input);

  const { error } = await supabase
    .from("ai_settings")
    .upsert({
      organization_id: orgId,
      updated_by: user.id,
      ...parsed,
    }, { onConflict: "organization_id" });

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// INSIGHTS
// ============================================================================

export async function getInsights(status?: string): Promise<AiInsight[]> {
  const { supabase, orgId } = await getCtx();

  let query = supabase
    .from("ai_insights")
    .select("*")
    .eq("organization_id", orgId)
    .order("generated_at", { ascending: false })
    .limit(30);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AiInsight[];
}

export async function acknowledgeInsight(insightId: string) {
  const { supabase, orgId } = await getCtx();

  const { error } = await supabase
    .from("ai_insights")
    .update({ status: "acknowledged" })
    .eq("id", insightId)
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
  reval();
}

export async function dismissInsight(insightId: string) {
  const { supabase, orgId } = await getCtx();

  const { error } = await supabase
    .from("ai_insights")
    .update({ status: "dismissed" })
    .eq("id", insightId)
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// USAGE STATS
// ============================================================================

export async function getAiUsageStats(): Promise<AiUsageStats | null> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase.rpc("get_ai_usage_stats", {
    p_org_id: orgId,
  });

  if (error) throw new Error(error.message);
  return data as AiUsageStats;
}

// ============================================================================
// CONFIGURATION STATUS
// ============================================================================

export async function getAiStatus() {
  const { supabase, orgId, role } = await getCtx();

  const configured = isAiConfigured();

  const { data: settings } = await supabase
    .from("ai_settings")
    .select("is_enabled")
    .eq("organization_id", orgId)
    .single();

  return {
    is_configured: configured,
    is_enabled: settings?.is_enabled ?? false,
    needs_setup: !configured || !settings?.is_enabled,
    role,
  };
}
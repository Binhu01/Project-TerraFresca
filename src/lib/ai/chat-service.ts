"use server";

import { createClient } from "@/lib/supabase/server";
import { streamChatCompletion, chatCompletion, isAiConfigured } from "./provider";
import { AI_TOOLS, executeAiTool } from "./tools";
import type { AiMessage } from "@/types/ai";

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

 return { supabase, user, orgId: membership.organization_id };
}

// ============================================================================
// QUOTA CHECK
// ============================================================================

async function checkQuota(orgId: string, userId: string): Promise<boolean> {
 const supabase = await createClient();
 const { data, error } = await supabase.rpc("check_ai_quota", {
 p_org_id: orgId,
 p_user_id: userId,
 });
 if (error || !data) return false;
 return data as boolean;
}

// ============================================================================
// RECORD USAGE
// ============================================================================

async function recordUsage(params: {
 orgId: string;
 userId: string;
 operationType: string;
 inputTokens?: number;
 outputTokens?: number;
 status?: string;
 errorMessage?: string;
}) {
 const supabase = await createClient();
 await supabase.rpc("record_ai_usage", {
 p_org_id: params.orgId,
 p_user_id: params.userId,
 p_provider: "anthropic",
 p_model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
 p_operation_type: params.operationType,
 p_input_tokens: params.inputTokens ?? null,
 p_output_tokens: params.outputTokens ?? null,
 p_status: params.status ?? "success",
 p_error_message: params.errorMessage ?? null,
 });
}

// ============================================================================
// STREAMING CHAT SERVICE
// ============================================================================

export interface ChatStreamCallbacks {
 onTextDelta: (text: string) => void;
 onToolCall: (toolName: string, args: Record<string, unknown>) => void;
 onToolResult: (toolName: string, result: unknown) => void;
 onDone: (fullResponse: string) => void;
 onError: (error: string) => void;
}

export async function processChatMessage(
 conversationId: string,
 userMessage: string,
 callbacks: ChatStreamCallbacks,
): Promise<void> {
 const ctx = await getCtx();
 const { supabase, user, orgId } = ctx;

 // 1. Check configuration
 if (!isAiConfigured()) {
 callbacks.onError("Nexora Intelligence não está configurado. Configure a variável ANTHROPIC_API_KEY no servidor.");
 return;
 }

 // 2. Check quota
 const hasQuota = await checkQuota(orgId, user.id);
 if (!hasQuota) {
 callbacks.onError("Limite diário de uso da IA atingido. Tente novamente amanhã ou entre em contato com o administrador.");
 await recordUsage({ orgId, userId: user.id, operationType: "chat", status: "rate_limited" });
 return;
 }

 // 3. Verify conversation ownership
 const { data: conv } = await supabase
 .from("ai_conversations")
 .select("id")
 .eq("id", conversationId)
 .eq("user_id", user.id)
 .single();

 if (!conv) {
 callbacks.onError("Conversa não encontrada.");
 return;
 }

 // 4. Load conversation history
 const { data: messages } = await supabase
 .from("ai_messages")
 .select("role, content")
 .eq("conversation_id", conversationId)
 .order("created_at", { ascending: true })
 .limit(50);

 const history: Array<{ role: "user" | "assistant"; content: string }> = (messages ?? [])
 .filter((m: Record<string, unknown>) => m.role === "user" || m.role === "assistant")
 .map((m: Record<string, unknown>) => ({
 role: m.role as "user" | "assistant",
 content: m.content as string,
 }));

 // Add current user message
 history.push({ role: "user", content: userMessage });

 // 5. Stream completion with tool use loop
 let fullResponse = "";
 let iterationCount = 0;
 const MAX_ITERATIONS = 5; // Prevent infinite tool loops

 while (iterationCount < MAX_ITERATIONS) {
 iterationCount++;
 let turnComplete = false;
 const pendingToolCalls: Array<{ name: string; id: string; input: Record<string, unknown> }> = [];

 await streamChatCompletion({
 messages: history,
 tools: AI_TOOLS,
 maxTokens: 4096,
 callbacks: {
 onTextDelta: (text) => {
 fullResponse += text;
 callbacks.onTextDelta(text);
 },
 onToolUse: (toolName, toolId, input) => {
 pendingToolCalls.push({ name: toolName, id: toolId, input });
 callbacks.onToolCall(toolName, input);
 },
 onDone: () => {
 turnComplete = true;
 },
 onError: (error) => {
 callbacks.onError(error);
 recordUsage({ orgId, userId: user.id, operationType: "chat", status: "error", errorMessage: error });
 turnComplete = true;
 },
 },
 });

 // If no tool calls, we're done
 if (pendingToolCalls.length === 0) {
 break;
 }

 // Execute each tool and add results to history
 for (const toolCall of pendingToolCalls) {
 try {
 const { result } = await executeAiTool(toolCall.name, toolCall.input);
 callbacks.onToolResult(toolCall.name, result);

 // Add assistant message with tool_use and tool_result to history
 history.push({
 role: "assistant",
 content: `[Usou ferramenta: ${toolCall.name}]`,
 });
 history.push({
 role: "user",
 content: `[Resultado da ferramenta ${toolCall.name}]: ${JSON.stringify(result)}`,
 });

 await recordUsage({ orgId, userId: user.id, operationType: "tool_call" });
 } catch (err) {
 const errorMsg = err instanceof Error ? err.message : "Erro ao executar ferramenta";
 history.push({
 role: "assistant",
 content: `[Erro na ferramenta ${toolCall.name}: ${errorMsg}]`,
 });
 callbacks.onError(`Erro na ferramenta ${toolCall.name}: ${errorMsg}`);
 }
 }

 // Continue the loop to let the model respond to tool results
 }

 // 6. Save assistant response
 if (fullResponse.trim()) {
 await supabase.from("ai_messages").insert({
 organization_id: orgId,
 conversation_id: conversationId,
 role: "assistant",
 content: fullResponse,
 message_metadata: { iterations: iterationCount },
 });

 await supabase
 .from("ai_conversations")
 .update({ updated_at: new Date().toISOString() })
 .eq("id", conversationId);
 }

 // 7. Record usage
 await recordUsage({ orgId, userId: user.id, operationType: "chat" });

 callbacks.onDone(fullResponse);
}

// ============================================================================
// NON-STREAMING CHAT (for insights generation)
// ============================================================================

export async function generateInsight(prompt: string, orgId: string, userId: string): Promise<string> {
 if (!isAiConfigured()) {
 throw new Error("IA não configurada");
 }

 const hasQuota = await checkQuota(orgId, userId);
 if (!hasQuota) {
 throw new Error("Limite de uso atingido");
 }

 const result = await chatCompletion({
 messages: [{ role: "user", content: prompt }],
 maxTokens: 2048,
 });

 await recordUsage({
 orgId,
 userId,
 operationType: "insight",
 inputTokens: result.inputTokens,
 outputTokens: result.outputTokens,
 });

 return result.content;
}
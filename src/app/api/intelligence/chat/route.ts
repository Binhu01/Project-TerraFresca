import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChatCompletion, isAiConfigured } from "@/lib/ai/provider";
import { AI_TOOLS, executeAiTool } from "@/lib/ai/tools";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
 try {
 // 1. Auth check
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) {
 return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
 }

 // 2. Config check
 if (!isAiConfigured()) {
 return NextResponse.json(
 { error: "Nexora Intelligence não está configurado. Configure ANTHROPIC_API_KEY no servidor." },
 { status: 503 },
 );
 }

 // 3. Parse body
 const body = await request.json();
 const { conversation_id, message } = body;

 if (!conversation_id || !message) {
 return NextResponse.json({ error: "conversation_id e message são obrigatórios" }, { status: 400 });
 }

 // 4. Verify conversation ownership + get org
 const { data: conv, error: convError } = await supabase
 .from("ai_conversations")
 .select("id, organization_id")
 .eq("id", conversation_id)
 .eq("user_id", user.id)
 .single();

 if (convError || !conv) {
 return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
 }

 const orgId = conv.organization_id;

 // 5. Check quota
 const { data: hasQuota } = await supabase.rpc("check_ai_quota", {
 p_org_id: orgId,
 p_user_id: user.id,
 });

 if (!hasQuota) {
 return NextResponse.json(
 { error: "Limite diário de uso da IA atingido. Tente novamente amanhã." },
 { status: 429 },
 );
 }

 // 6. Load conversation history
 const { data: messages } = await supabase
 .from("ai_messages")
 .select("role, content")
 .eq("conversation_id", conversation_id)
 .order("created_at", { ascending: true })
 .limit(50);

 const history: Array<{ role: "user" | "assistant"; content: string }> = (messages ?? [])
 .filter((m: Record<string, unknown>) => m.role === "user" || m.role === "assistant")
 .map((m: Record<string, unknown>) => ({
 role: m.role as "user" | "assistant",
 content: m.content as string,
 }));

 history.push({ role: "user", content: message });

 // 7. Stream response
 const encoder = new TextEncoder();
 let fullResponse = "";
 let iterationCount = 0;
 const MAX_ITERATIONS = 5;

 const stream = new ReadableStream({
 async start(controller) {
 const sendEvent = (data: unknown) => {
 controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
 };

 try {
 while (iterationCount < MAX_ITERATIONS) {
 iterationCount++;
 const pendingToolCalls: Array<{ name: string; id: string; input: Record<string, unknown> }> = [];
 let turnText = "";

 await streamChatCompletion({
 messages: history,
 tools: AI_TOOLS,
 maxTokens: 4096,
 callbacks: {
 onTextDelta: (text) => {
 turnText += text;
 fullResponse += text;
 sendEvent({ type: "text_delta", content: text });
 },
 onToolUse: (toolName, toolId, input) => {
 pendingToolCalls.push({ name: toolName, id: toolId, input });
 sendEvent({ type: "tool_use", tool_name: toolName, tool_arguments: input });
 },
 onDone: () => {},
 onError: (error) => {
 sendEvent({ type: "error", error });
 controller.close();
 return;
 },
 },
 });

 // No tool calls → done
 if (pendingToolCalls.length === 0) break;

 // Execute tools and feed results back
 for (const tc of pendingToolCalls) {
 try {
 const { result } = await executeAiTool(tc.name, tc.input);
 sendEvent({ type: "tool_result", tool_name: tc.name, result });

 history.push({ role: "assistant", content: `[Usou ferramenta: ${tc.name}]` });
 history.push({ role: "user", content: `[Resultado da ferramenta ${tc.name}]: ${JSON.stringify(result)}` });

 // Record tool usage
 await supabase.rpc("record_ai_usage", {
 p_org_id: orgId,
 p_user_id: user.id,
 p_provider: "anthropic",
 p_model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
 p_operation_type: "tool_call",
 });
 } catch (err) {
 const errorMsg = err instanceof Error ? err.message : "Erro ao executar ferramenta";
 sendEvent({ type: "error", error: `Ferramenta ${tc.name}: ${errorMsg}` });
 history.push({ role: "assistant", content: `[Erro na ferramenta ${tc.name}: ${errorMsg}]` });
 }
 }
 }

 // Save assistant message
 if (fullResponse.trim()) {
 await supabase.from("ai_messages").insert({
 organization_id: orgId,
 conversation_id,
 role: "assistant",
 content: fullResponse,
 message_metadata: { iterations: iterationCount },
 });

 await supabase
 .from("ai_conversations")
 .update({ updated_at: new Date().toISOString() })
 .eq("id", conversation_id);
 }

 // Record chat usage
 await supabase.rpc("record_ai_usage", {
 p_org_id: orgId,
 p_user_id: user.id,
 p_provider: "anthropic",
 p_model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
 p_operation_type: "chat",
 });

 sendEvent({ type: "done" });
 controller.enqueue(encoder.encode("data: [DONE]\n\n"));
 controller.close();
 } catch (err) {
 const msg = err instanceof Error ? err.message : "Erro interno";
 sendEvent({ type: "error", error: msg });
 controller.close();
 }
 },
 });

 return new NextResponse(stream, {
 headers: {
 "Content-Type": "text/event-stream",
 "Cache-Control": "no-cache",
 Connection: "keep-alive",
 },
 });
 } catch (err) {
 const msg = err instanceof Error ? err.message : "Erro interno do servidor";
 return NextResponse.json({ error: msg }, { status: 500 });
 }
}
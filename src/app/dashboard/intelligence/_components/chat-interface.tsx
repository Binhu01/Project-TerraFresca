"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, Loader2, AlertCircle, Trash2, MessageSquare } from "lucide-react";
import { saveUserMessage, saveAssistantMessage, getMessages, deleteConversation } from "../actions";
import type { AiMessage } from "@/types/ai";

interface ChatInterfaceProps {
 conversationId: string;
 initialQuestion?: string;
}

interface DisplayMessage {
 id: string;
 role: "user" | "assistant";
 content: string;
 isStreaming?: boolean;
 toolCalls?: Array<{ name: string; status: "running" | "done" | "error" }>;
}

export function ChatInterface({ conversationId, initialQuestion }: ChatInterfaceProps) {
 const router = useRouter();
 const [messages, setMessages] = useState<DisplayMessage[]>([]);
 const [inputValue, setInputValue] = useState("");
 const [isStreaming, setIsStreaming] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const hasInitialized = useRef(false);

 // Auto-scroll to bottom
 const scrollToBottom = useCallback(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 }, []);

 useEffect(() => {
 scrollToBottom();
 }, [messages, scrollToBottom]);

 // Load existing messages on mount
 useEffect(() => {
 if (hasInitialized.current) return;
 hasInitialized.current = true;

 async function init() {
 try {
 const existing = await getMessages(conversationId);
 if (existing.length > 0) {
 setMessages(
 existing.map((m: AiMessage) => ({
 id: m.id,
 role: m.role as "user" | "assistant",
 content: m.content,
 }))
 );
 } else if (initialQuestion) {
 // Auto-send initial question
 await sendMessage(initialQuestion);
 }
 } catch {
 setError("Erro ao carregar mensagens.");
 }
 }
 init();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [conversationId]);

 async function sendMessage(text: string) {
 if (!text.trim() || isStreaming) return;

 const userText = text.trim();
 setInputValue("");
 setError(null);
 setIsStreaming(true);

 // Add user message to display
 const tempUserMsg: DisplayMessage = {
 id: `temp-user-${Date.now()}`,
 role: "user",
 content: userText,
 };
 setMessages((prev) => [...prev, tempUserMsg]);

 // Save user message to DB
 try {
 await saveUserMessage(conversationId, userText);
 } catch {
 setError("Erro ao salvar mensagem.");
 setIsStreaming(false);
 return;
 }

 // Create placeholder for assistant response
 const assistantMsgId = `temp-assistant-${Date.now()}`;
 const assistantMsg: DisplayMessage = {
 id: assistantMsgId,
 role: "assistant",
 content: "",
 isStreaming: true,
 toolCalls: [],
 };
 setMessages((prev) => [...prev, assistantMsg]);

 // Call the streaming API endpoint
 try {
 const response = await fetch("/api/intelligence/chat", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ conversation_id: conversationId, message: userText }),
 });

 if (!response.ok) {
 const errData = await response.json().catch(() => ({}));
 throw new Error(errData.error ?? "Erro na comunicação com a IA");
 }

 const reader = response.body?.getReader();
 if (!reader) throw new Error("Stream não disponível");

 const decoder = new TextDecoder();
 let accumulatedContent = "";
 let buffer = "";

 while (true) {
 const { done, value } = await reader.read();
 if (done) break;

 buffer += decoder.decode(value, { stream: true });
 const lines = buffer.split("\n");
 buffer = lines.pop() ?? "";

 for (const line of lines) {
 if (!line.startsWith("data: ")) continue;
 const jsonStr = line.slice(6).trim();
 if (!jsonStr || jsonStr === "[DONE]") continue;

 try {
 const event = JSON.parse(jsonStr);

 if (event.type === "text_delta") {
 accumulatedContent += event.content;
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
 )
 );
 } else if (event.type === "tool_use") {
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId
 ? {
 ...m,
 toolCalls: [
 ...(m.toolCalls ?? []),
 { name: event.tool_name, status: "running" },
 ],
 }
 : m
 )
 );
 } else if (event.type === "tool_result") {
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId
 ? {
 ...m,
 toolCalls: (m.toolCalls ?? []).map((tc) =>
 tc.name === event.tool_name ? { ...tc, status: "done" } : tc
 ),
 }
 : m
 )
 );
 } else if (event.type === "error") {
 setError(event.error);
 }
 } catch {
 // Skip malformed JSON lines
 }
 }
 }

 // Finalize assistant message
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId ? { ...m, isStreaming: false } : m
 )
 );

 // Save assistant message to DB
 if (accumulatedContent.trim()) {
 await saveAssistantMessage(conversationId, accumulatedContent);
 }
 } catch (err) {
 const msg = err instanceof Error ? err.message : "Erro desconhecido";
 setError(msg);
 setMessages((prev) =>
 prev.map((m) =>
 m.id === assistantMsgId
 ? { ...m, content: m.content || `Erro: ${msg}`, isStreaming: false }
 : m
 )
 );
 } finally {
 setIsStreaming(false);
 }
 }

 function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 sendMessage(inputValue);
 }

 function handleKeyDown(e: React.KeyboardEvent) {
 if (e.key === "Enter" && !e.shiftKey) {
 e.preventDefault();
 sendMessage(inputValue);
 }
 }

 async function handleDeleteConversation() {
 if (confirm("Tem certeza que deseja apagar esta conversa?")) {
 await deleteConversation(conversationId);
 router.push("/dashboard/intelligence");
 }
 }

 return (
 <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-nexora-border bg-white shadow-sm">
 {/* Messages Area */}
 <div className="flex-1 overflow-y-auto p-4 space-y-4">
 {messages.length === 0 && !isStreaming && (
 <div className="flex h-full flex-col items-center justify-center text-center">
 <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-nexora-blue to-nexora-cyan shadow-lg">
 <Sparkles className="h-8 w-8 text-white" />
 </div>
 <h2 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
 Nexora Intelligence
 </h2>
 <p className="mt-2 max-w-md text-sm text-nexora-text-secondary">
 Pergunte sobre vendas, estoque, financeiro, clientes ou qualquer aspecto da sua empresa.
 O assistente consulta dados reais e respeita suas permissões.
 </p>
 </div>
 )}

 {messages.map((msg) => (
 <div
 key={msg.id}
 className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
 >
 {/* Avatar */}
 <div
 className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
 msg.role === "user"
 ? "bg-nexora-bg-secondary text-nexora-text-secondary"
 : "bg-gradient-to-br from-nexora-blue to-nexora-cyan text-white"
 }`}
 >
 {msg.role === "user" ? (
 <span className="text-xs font-bold">Eu</span>
 ) : (
 <Sparkles className="h-4 w-4" />
 )}
 </div>

 {/* Bubble */}
 <div
 className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
 msg.role === "user"
 ? "bg-nexora-blue text-white"
 : "bg-nexora-bg-secondary text-nexora-dark"
 }`}
 >
 {/* Tool calls indicator */}
 {msg.toolCalls && msg.toolCalls.length > 0 && (
 <div className="mb-2 space-y-1">
 {msg.toolCalls.map((tc, i) => (
 <div key={i} className="flex items-center gap-1.5 text-xs opacity-70">
 {tc.status === "running" ? (
 <Loader2 className="h-3 w-3 animate-spin" />
 ) : tc.status === "done" ? (
 <span className="text-green-600">✓</span>
 ) : (
 <AlertCircle className="h-3 w-3 text-red-500" />
 )}
 <span>Consultando: {tc.name.replace(/_/g, " ")}</span>
 </div>
 ))}
 </div>
 )}

 {/* Content */}
 <div className="whitespace-pre-wrap leading-relaxed">
 {msg.content}
 {msg.isStreaming && (
 <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current align-middle" />
 )}
 </div>
 </div>
 </div>
 ))}

 {error && (
 <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
 <AlertCircle className="h-4 w-4 shrink-0" />
 {error}
 </div>
 )}

 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="border-t border-nexora-border p-4">
 <form onSubmit={handleSubmit} className="flex gap-3">
 <textarea
 ref={textareaRef}
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Pergunte algo sobre sua empresa..."
 disabled={isStreaming}
 rows={1}
 className="flex-1 resize-none rounded-xl border border-nexora-border px-4 py-3 text-sm text-nexora-dark placeholder:text-nexora-text-secondary/50 focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue disabled:opacity-50"
 style={{ minHeight: "48px", maxHeight: "120px" }}
 />
 <button
 type="submit"
 disabled={!inputValue.trim() || isStreaming}
 className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-nexora-blue text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
 >
 {isStreaming ? (
 <Loader2 className="h-5 w-5 animate-spin" />
 ) : (
 <Send className="h-5 w-5" />
 )}
 </button>
 </form>

 {/* Footer actions */}
 <div className="mt-2 flex items-center justify-between text-xs text-nexora-text-secondary">
 <span>
 As respostas são geradas por IA com base nos dados da sua organização.
 Sempre verifique informações críticas.
 </span>
 <button
 onClick={handleDeleteConversation}
 className="inline-flex items-center gap-1 text-nexora-text-secondary transition-colors hover:text-red-600"
 >
 <Trash2 className="h-3 w-3" />
 Apagar conversa
 </button>
 </div>
 </div>
 </div>
 );
}
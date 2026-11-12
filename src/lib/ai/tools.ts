// ============================================================================
// NEXORA INTELLIGENCE — Authorized Tool Registry
// ============================================================================
// Each tool is explicitly listed, validated and permission-gated.
// The AI model NEVER executes arbitrary SQL or accesses the DB directly.

import { createClient } from "@/lib/supabase/server";
import type { ToolDefinition } from "@/types/ai";

// ---------------------------------------------------------------------------
// Context helper (server-side only)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Permission check helper
// ---------------------------------------------------------------------------

async function requirePermission(orgId: string, userId: string, key: string): Promise<void> {
 const { data, error } = await (await createClient()).rpc("has_permission", {
 p_org_id: orgId,
 p_user_id: userId,
 p_permission_key: key,
 });
 if (error || !data) {
 throw new Error(`Permissão negada: ${key}`);
 }
}

// ---------------------------------------------------------------------------
// Tool definitions (schema + permissions)
// ---------------------------------------------------------------------------

export const AI_TOOLS: ToolDefinition[] = [
 {
 name: "get_sales_summary",
 description: "Consulta resumo de vendas (pedidos, receita, ticket médio, margem) para um período.",
 parameters: {
 type: "object",
 properties: {
 from: { type: "string", description: "Data início (YYYY-MM-DD)" },
 to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
 },
 required: ["from", "to"],
 },
 required_permissions: ["orders.view"],
 },
 {
 name: "get_customers",
 description: "Pesquisa clientes por nome ou e-mail. Retorna lista paginada.",
 parameters: {
 type: "object",
 properties: {
 search: { type: "string", description: "Termo de busca" },
 limit: { type: "integer", description: "Máximo de resultados (default 10)", default: 10 },
 },
 required: [],
 },
 required_permissions: ["customers.view"],
 },
 {
 name: "get_leads_summary",
 description: "Consulta leads com filtro opcional de etapa ou status. Identifica leads sem contato recente.",
 parameters: {
 type: "object",
 properties: {
 stage: { type: "string", description: "Nome da etapa do funil" },
 stale_days: { type: "integer", description: "Dias sem contato para considerar atrasado", default: 7 },
 limit: { type: "integer", default: 15 },
 },
 required: [],
 },
 required_permissions: ["leads.view"],
 },
 {
 name: "get_stock_alerts",
 description: "Lista produtos com estoque abaixo do mínimo configurado ou zerado.",
 parameters: {
 type: "object",
 properties: {
 warehouse_id: { type: "string", description: "Filtrar por depósito específico" },
 },
 required: [],
 },
 required_permissions: ["inventory.view"],
 },
 {
 name: "get_financial_summary",
 description: "Resumo financeiro: recebíveis, pagáveis, saldo, vencidos. Período opcional.",
 parameters: {
 type: "object",
 properties: {
 from: { type: "string", description: "Data início (YYYY-MM-DD)" },
 to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
 },
 required: [],
 },
 required_permissions: ["receivables.view", "payables.view"],
 },
 {
 name: "get_pending_tasks",
 description: "Lista tarefas pendentes ou atrasadas do usuário ou da equipe.",
 parameters: {
 type: "object",
 properties: {
 assigned_to_me: { type: "boolean", description: "Apenas minhas tarefas", default: false },
 overdue_only: { type: "boolean", description: "Apenas atrasadas", default: false },
 limit: { type: "integer", default: 15 },
 },
 required: [],
 },
 required_permissions: ["tasks.view"],
 },
 {
 name: "get_purchase_orders_summary",
 description: "Resumo de ordens de compra: pendentes, recebidas, valores totais.",
 parameters: {
 type: "object",
 properties: {
 status: { type: "string", enum: ["draft", "approved", "sent", "partially_received", "received", "cancelled"] },
 from: { type: "string", description: "Data início (YYYY-MM-DD)" },
 to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
 },
 required: [],
 },
 required_permissions: ["orders.view"],
 },
 {
 name: "suggest_task_creation",
 description: "Sugere criação de tarefa. NÃO cria automaticamente — retorna proposta para confirmação do usuário.",
 parameters: {
 type: "object",
 properties: {
 title: { type: "string", description: "Título sugerido" },
 description: { type: "string", description: "Descrição sugerida" },
 priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
 due_date: { type: "string", description: "Prazo sugerido (YYYY-MM-DD)" },
 },
 required: ["title"],
 },
 required_permissions: ["tasks.create"],
 },
];

// ---------------------------------------------------------------------------
// Tool execution dispatcher
// ---------------------------------------------------------------------------

export async function executeAiTool(
 toolName: string,
 args: Record<string, unknown>,
): Promise<{ result: unknown; inputTokens?: number; outputTokens?: number }> {
 const ctx = await getCtx();
 const { supabase, user, orgId } = ctx;

 // Find tool definition
 const toolDef = AI_TOOLS.find((t) => t.name === toolName);
 if (!toolDef) {
 throw new Error(`Ferramenta não autorizada: ${toolName}`);
 }

 // Check all required permissions
 for (const perm of toolDef.required_permissions) {
 await requirePermission(orgId, user.id, perm);
 }

 switch (toolName) {
 case "get_sales_summary": {
 const from = args.from as string;
 const to = args.to as string;
 const { data, error } = await supabase
 .from("v_sales_summary")
 .select("total, total_cost, status")
 .eq("organization_id", orgId)
 .gte("created_at", `${from}T00:00:00`)
 .lte("created_at", `${to}T23:59:59.999`);
 if (error) throw new Error(error.message);
 const rows = data ?? [];
 const totalOrders = rows.length;
 const totalRevenue = rows.reduce((s, r) => s + Number(r.total), 0);
 const completedOrders = rows.filter((r) => r.status === "completed").length;
 const totalCost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
 return {
 result: {
 period: `${from} a ${to}`,
 total_orders: totalOrders,
 total_revenue: totalRevenue,
 completed_orders: completedOrders,
 avg_ticket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
 gross_margin: totalRevenue - totalCost,
 margin_rate: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0,
 },
 };
 }

 case "get_customers": {
 const search = (args.search as string) ?? "";
 const limit = Math.min((args.limit as number) ?? 10, 50);
 let query = supabase
 .from("customers")
 .select("id, name, email, phone, customer_type, status")
 .eq("organization_id", orgId)
 .limit(limit);
 if (search) {
 const escaped = search.replace(/([%_,()])/g, "\\$1");
 query = query.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
 }
 const { data, error } = await query;
 if (error) throw new Error(error.message);
 return { result: data ?? [] };
 }

 case "get_leads_summary": {
 const limit = Math.min((args.limit as number) ?? 15, 50);
 const staleDays = (args.stale_days as number) ?? 7;
 const staleThreshold = new Date(Date.now() - staleDays * 86400000).toISOString();

 let query = supabase
 .from("leads")
 .select("id, name, company, stage, estimated_value, source, assigned_to, next_follow_up_date")
 .eq("organization_id", orgId)
 .neq("status", "won")
 .neq("status", "lost")
 .limit(limit);

 if (args.stage) {
 query = query.eq("stage", args.stage as string);
 }

 const { data, error } = await query;
 if (error) throw new Error(error.message);

 const leads = (data ?? []).map((lead: Record<string, unknown>) => ({
 lead_id: lead.id,
 name: lead.name,
 company: lead.company ?? null,
 stage: lead.stage,
 value: Number(lead.estimated_value ?? 0),
 source: lead.source ?? "Desconhecida",
 assigned_to: lead.assigned_to ?? null,
 next_follow_up: lead.next_follow_up_date ?? null,
 days_without_contact: lead.next_follow_up_date
 ? Math.max(0, Math.floor((Date.now() - new Date(lead.next_follow_up_date as string).getTime()) / 86400000))
 : null,
 is_stale: lead.next_follow_up_date ? new Date(lead.next_follow_up_date as string) < new Date(staleThreshold) : false,
 }));

 return { result: leads };
 }

 case "get_stock_alerts": {
 let query = supabase
 .from("inventory_balances")
 .select("product_id, variant_id, quantity_on_hand, quantity_reserved, products!inner(name, sku, minimum_stock), warehouses!inner(name)")
 .eq("organization_id", orgId);

 if (args.warehouse_id) {
 query = query.eq("warehouse_id", args.warehouse_id as string);
 }

 const { data, error } = await query;
 if (error) throw new Error(error.message);

 const alerts = (data ?? [])
 .filter((row: Record<string, unknown>) => {
 const product = row.products as { minimum_stock?: number; name: string; sku: string | null };
 const onHand = Number(row.quantity_on_hand ?? 0);
 const minStock = product.minimum_stock ?? 0;
 return onHand <= minStock;
 })
 .map((row: Record<string, unknown>) => {
 const product = row.products as { name: string; sku: string | null; minimum_stock?: number };
 const warehouse = row.warehouses as { name: string };
 return {
 product_id: row.product_id,
 product_name: product.name,
 sku: product.sku ?? null,
 quantity_available: Number(row.quantity_on_hand ?? 0) - Number(row.quantity_reserved ?? 0),
 minimum_stock: product.minimum_stock ?? 0,
 warehouse_name: warehouse.name,
 };
 });

 return { result: alerts };
 }

 case "get_financial_summary": {
 const now = new Date().toISOString();
 const from = (args.from as string) ? `${args.from}T00:00:00` : undefined;
 const to = (args.to as string) ? `${args.to}T23:59:59.999` : now;

 // Receivables
 let recvQuery = supabase
 .from("receivables")
 .select("amount, paid_amount, status, due_date")
 .eq("organization_id", orgId)
 .neq("status", "cancelled");
 if (from) recvQuery = recvQuery.gte("due_date", from);
 recvQuery = recvQuery.lte("due_date", to);
 const { data: receivables } = await recvQuery;

 // Payables
 let payQuery = supabase
 .from("payables")
 .select("amount, paid_amount, status, due_date")
 .eq("organization_id", orgId)
 .neq("status", "cancelled");
 if (from) payQuery = payQuery.gte("due_date", from);
 payQuery = payQuery.lte("due_date", to);
 const { data: payables } = await payQuery;

 // Account balances
 const { data: accounts } = await supabase
 .from("financial_accounts")
 .select("id, balance")
 .eq("organization_id", orgId)
 .eq("is_active", true);

 const openReceivables = (receivables ?? [])
 .filter((r: Record<string, unknown>) => r.status !== "paid")
 .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount) - Number(r.paid_amount ?? 0)), 0);

 const overdueReceivables = (receivables ?? [])
 .filter((r: Record<string, unknown>) => r.status !== "paid" && new Date(r.due_date as string) < new Date())
 .reduce((s: number, r: Record<string, unknown>) => s + (Number(r.amount) - Number(r.paid_amount ?? 0)), 0);

 const openPayables = (payables ?? [])
 .filter((p: Record<string, unknown>) => p.status !== "paid")
 .reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) - Number(p.paid_amount ?? 0)), 0);

 const overduePayables = (payables ?? [])
 .filter((p: Record<string, unknown>) => p.status !== "paid" && new Date(p.due_date as string) < new Date())
 .reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) - Number(p.paid_amount ?? 0)), 0);

 const accountBalance = (accounts ?? []).reduce((s: number, a: Record<string, unknown>) => s + Number(a.balance ?? 0), 0);

 return {
 result: {
 total_received: (receivables ?? []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.paid_amount ?? 0), 0),
 total_paid: (payables ?? []).reduce((s: number, p: Record<string, unknown>) => s + Number(p.paid_amount ?? 0), 0),
 account_balance: accountBalance,
 open_receivables: openReceivables,
 open_payables: openPayables,
 overdue_receivables: overdueReceivables,
 overdue_payables: overduePayables,
 },
 };
 }

 case "get_pending_tasks": {
 const limit = Math.min((args.limit as number) ?? 15, 50);
 let query = supabase
 .from("tasks")
 .select("id, title, status, priority, due_date, assigned_to")
 .eq("organization_id", orgId)
 .neq("status", "done")
 .neq("status", "cancelled")
 .order("due_date", { ascending: true })
 .limit(limit);

 if (args.assigned_to_me) {
 query = query.eq("assigned_to", ctx.membershipId);
 }
 if (args.overdue_only) {
 query = query.lt("due_date", new Date().toISOString());
 }

 const { data, error } = await query;
 if (error) throw new Error(error.message);

 const tasks = (data ?? []).map((task: Record<string, unknown>) => ({
 task_id: task.id,
 title: task.title,
 status: task.status,
 priority: task.priority,
 due_date: task.due_date ?? null,
 assignee_name: null, // Simplified — full enrichment would need join
 is_overdue: task.due_date ? new Date(task.due_date as string) < new Date() : false,
 }));

 return { result: tasks };
 }

 case "get_purchase_orders_summary": {
 let query = supabase
 .from("purchase_orders")
 .select("id, purchase_number, supplier_id, status, total_amount, expected_delivery_date")
 .eq("organization_id", orgId);

 if (args.status) {
 query = query.eq("status", args.status as string);
 }
 if (args.from) {
 query = query.gte("issue_date", args.from as string);
 }
 if (args.to) {
 query = query.lte("issue_date", args.to as string);
 }

 const { data, error } = await query.order("issue_date", { ascending: false }).limit(30);
 if (error) throw new Error(error.message);

 return { result: data ?? [] };
 }

 case "suggest_task_creation": {
 // This tool does NOT create anything — it returns a proposal for user confirmation
 return {
 result: {
 type: "task_proposal",
 requires_confirmation: true,
 proposal: {
 title: args.title as string,
 description: (args.description as string) ?? null,
 priority: (args.priority as string) ?? "medium",
 due_date: (args.due_date as string) ?? null,
 },
 message: "Para criar esta tarefa, confirme clicando no botão abaixo.",
 },
 };
 }

 default:
 throw new Error(`Ferramenta desconhecida: ${toolName}`);
 }
}

// ---------------------------------------------------------------------------
// Export tool names for validation
// ---------------------------------------------------------------------------

export const ALLOWED_TOOL_NAMES = AI_TOOLS.map((t) => t.name);
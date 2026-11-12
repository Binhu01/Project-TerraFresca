"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import type {
  DateRange,
  SalesKPIs,
  SalesByChannel,
  SalesByPeriod,
  TopCustomer,
  TopProduct,
  CRMKPIs,
  PipelineFunnelStage,
  LeadsBySource,
  FinancialKPIs,
  CashflowMonthlyRow,
  AgingBucket,
  ExpenseByCategory,
  AccountBalanceSummary,
  InventoryKPIs,
  InventoryValuationRow,
  MovementSummary,
  TeamKPIs,
  TeamPerformanceRow,
  ExecutiveDashboardData,
} from "@/types/reports";

// ============================================================================
// CONTEXT HELPER
// ============================================================================

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const activeData = await getActiveOrganization();
  if (!activeData) throw new Error("Nenhuma organização ativa");
  return { supabase, user, orgId: activeData.org.id };
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function dateToISO(d: string): string {
  return `${d}T00:00:00`;
}

function dateToEndISO(d: string): string {
  return `${d}T23:59:59.999`;
}

// ============================================================================
// SALES REPORTS
// ============================================================================

export async function getSalesKPIs(dateRange: DateRange, previousRange?: DateRange): Promise<SalesKPIs> {
  const { supabase, orgId } = await getCtx();

  const { data: current, error } = await supabase
    .from("v_sales_summary")
    .select("total, total_cost, status")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to));

  if (error) throw error;

  const rows = current ?? [];
  const totalOrders = rows.length;
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total), 0);
  const completedOrders = rows.filter((r) => r.status === "completed").length;
  const totalCost = rows.reduce((sum, r) => sum + Number(r.total_cost), 0);
  const grossMargin = totalRevenue - totalCost;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const marginRate = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  let previousTotalOrders: number | null = null;
  let previousTotalRevenue: number | null = null;
  let ordersChange: number | null = null;
  let revenueChange: number | null = null;

  if (previousRange) {
    const { data: prev } = await supabase
      .from("v_sales_summary")
      .select("total")
      .eq("organization_id", orgId)
      .gte("created_at", dateToISO(previousRange.from))
      .lte("created_at", dateToEndISO(previousRange.to));

    const prevRows = prev ?? [];
    previousTotalOrders = prevRows.length;
    previousTotalRevenue = prevRows.reduce((sum, r) => sum + Number(r.total), 0);
    ordersChange = previousTotalOrders > 0 ? ((totalOrders - previousTotalOrders) / previousTotalOrders) * 100 : null;
    revenueChange = previousTotalRevenue > 0 ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : null;
  }

  return {
    totalOrders,
    totalRevenue,
    completedOrders,
    avgTicket,
    grossMargin,
    marginRate,
    previousTotalOrders,
    previousTotalRevenue,
    ordersChange,
    revenueChange,
  };
}

export async function getSalesByChannel(dateRange: DateRange): Promise<SalesByChannel[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_sales_summary")
    .select("channel_name, total")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to));

  if (error) throw error;

  const map = new Map<string, { count: number; revenue: number }>();
  for (const row of data ?? []) {
    const name = row.channel_name ?? "Sem canal";
    const entry = map.get(name) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(row.total);
    map.set(name, entry);
  }

  const totalRevenue = [...map.values()].reduce((s, e) => s + e.revenue, 0);

  return [...map.entries()]
    .map(([channelName, { count, revenue }]) => ({
      channelName,
      orderCount: count,
      totalRevenue: revenue,
      avgTicket: count > 0 ? revenue / count : 0,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export async function getSalesByPeriod(dateRange: DateRange): Promise<SalesByPeriod[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_sales_summary")
    .select("created_at, total")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to))
    .order("created_at");

  if (error) throw error;

  // Group by day
  const map = new Map<string, { count: number; revenue: number }>();
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    const entry = map.get(day) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(row.total);
    map.set(day, entry);
  }

  return [...map.entries()]
    .map(([period, { count, revenue }]) => ({ period, orderCount: count, totalRevenue: revenue }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export async function getTopCustomers(dateRange: DateRange, limit = 10): Promise<TopCustomer[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_sales_summary")
    .select("customer_id, customer_name, total")
    .eq("organization_id", orgId)
    .not("customer_id", "is", null)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to));

  if (error) throw error;

  const map = new Map<string, { name: string; count: number; revenue: number }>();
  for (const row of data ?? []) {
    if (!row.customer_id) continue;
    const entry = map.get(row.customer_id) ?? { name: row.customer_name ?? "Desconhecido", count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(row.total);
    map.set(row.customer_id, entry);
  }

  return [...map.entries()]
    .map(([customerId, { name, count, revenue }]) => ({
      customerId,
      customerName: name,
      orderCount: count,
      totalRevenue: revenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export async function getTopProducts(dateRange: DateRange, limit = 10): Promise<TopProduct[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, product_name_snapshot, product_sku_snapshot, quantity, total")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to));

  if (error) throw error;

  const map = new Map<string, { name: string; sku: string | null; qty: number; revenue: number }>();
  for (const row of data ?? []) {
    const pid = row.product_id ?? "manual";
    const entry = map.get(pid) ?? { name: row.product_name_snapshot ?? "Item manual", sku: row.product_sku_snapshot, qty: 0, revenue: 0 };
    entry.qty += Number(row.quantity);
    entry.revenue += Number(row.total);
    map.set(pid, entry);
  }

  return [...map.entries()]
    .map(([productId, { name, sku, qty, revenue }]) => ({
      productId,
      productName: name,
      sku,
      quantitySold: qty,
      totalRevenue: revenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

// ============================================================================
// CRM REPORTS
// ============================================================================

export async function getCRMKPIs(dateRange: DateRange, previousRange?: DateRange): Promise<CRMKPIs> {
  const { supabase, orgId } = await getCtx();

  // Active customers
  const { count: totalActiveCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active")
    .is("archived_at", null);

  // New customers in period
  const { count: newCustomersInPeriod } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to));

  // Leads in period
  const { data: leads } = await supabase
    .from("leads")
    .select("id, converted_at, stage_id, pipeline_stages!inner(is_won, is_lost)")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to))
    .is("archived_at", null);

  const leadsList = leads ?? [];
  const totalLeads = leadsList.length;
  const wonLeads = leadsList.filter((l) => {
    const ps = Array.isArray(l.pipeline_stages) ? l.pipeline_stages[0] : l.pipeline_stages;
    return ps?.is_won;
  }).length;
  const lostLeads = leadsList.filter((l) => {
    const ps = Array.isArray(l.pipeline_stages) ? l.pipeline_stages[0] : l.pipeline_stages;
    return ps?.is_lost;
  }).length;
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  // Pipeline value (open leads)
  const { data: pipelineLeads } = await supabase
    .from("leads")
    .select("estimated_value, pipeline_stages!inner(is_won, is_lost)")
    .eq("organization_id", orgId)
    .is("archived_at", null);

  const pipelineValue = (pipelineLeads ?? [])
    .filter((l) => {
      const ps = Array.isArray(l.pipeline_stages) ? l.pipeline_stages[0] : l.pipeline_stages;
      return !ps?.is_won && !ps?.is_lost;
    })
    .reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);

  let previousNewCustomers: number | null = null;
  let previousLeads: number | null = null;
  let customersChange: number | null = null;
  let leadsChange: number | null = null;

  if (previousRange) {
    const { count: prevCust } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", dateToISO(previousRange.from))
      .lte("created_at", dateToEndISO(previousRange.to));

    const { count: prevLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", dateToISO(previousRange.from))
      .lte("created_at", dateToEndISO(previousRange.to))
      .is("archived_at", null);

    previousNewCustomers = prevCust ?? 0;
    previousLeads = prevLeads ?? 0;
    customersChange = previousNewCustomers > 0 ? (((newCustomersInPeriod ?? 0) - previousNewCustomers) / previousNewCustomers) * 100 : null;
    leadsChange = previousLeads > 0 ? ((totalLeads - previousLeads) / previousLeads) * 100 : null;
  }

  return {
    totalActiveCustomers: totalActiveCustomers ?? 0,
    newCustomersInPeriod: newCustomersInPeriod ?? 0,
    totalLeads,
    wonLeads,
    lostLeads,
    conversionRate,
    pipelineValue,
    previousNewCustomers,
    previousLeads,
    customersChange,
    leadsChange,
  };
}

export async function getPipelineFunnel(): Promise<PipelineFunnelStage[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_pipeline_funnel")
    .select("*")
    .eq("organization_id", orgId)
    .order("position");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    stageId: row.stage_id,
    stageName: row.stage_name,
    position: row.position,
    isWon: row.is_won,
    isLost: row.is_lost,
    leadCount: row.lead_count,
    totalValue: row.total_value,
    convertedCount: row.converted_count,
  }));
}

export async function getLeadsBySource(dateRange: DateRange): Promise<LeadsBySource[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("leads")
    .select("source, estimated_value")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to))
    .is("archived_at", null);

  if (error) throw error;

  const map = new Map<string, { count: number; value: number }>();
  for (const row of data ?? []) {
    const source = row.source ?? "Não informado";
    const entry = map.get(source) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += Number(row.estimated_value || 0);
    map.set(source, entry);
  }

  return [...map.entries()]
    .map(([source, { count, value }]) => ({ source, count, estimatedValue: value }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================

export async function getFinancialKPIs(dateRange: DateRange, previousRange?: DateRange): Promise<FinancialKPIs> {
  const { supabase, orgId } = await getCtx();

  // Total received (inbound payments in period)
  const { data: inbound } = await supabase
    .from("financial_payments")
    .select("gross_amount")
    .eq("organization_id", orgId)
    .eq("payment_direction", "inbound")
    .is("reversal_of", null)
    .gte("paid_at", dateToISO(dateRange.from))
    .lte("paid_at", dateToEndISO(dateRange.to));

  const totalReceived = (inbound ?? []).reduce((s, r) => s + Number(r.gross_amount), 0);

  // Total paid (outbound payments in period)
  const { data: outbound } = await supabase
    .from("financial_payments")
    .select("gross_amount")
    .eq("organization_id", orgId)
    .eq("payment_direction", "outbound")
    .is("reversal_of", null)
    .gte("paid_at", dateToISO(dateRange.from))
    .lte("paid_at", dateToEndISO(dateRange.to));

  const totalPaid = (outbound ?? []).reduce((s, r) => s + Number(r.gross_amount), 0);

  // Account balance
  const { data: txns } = await supabase
    .from("financial_transactions")
    .select("amount, financial_account_id, financial_accounts!inner(is_active)")
    .eq("organization_id", orgId)
    .eq("financial_accounts.is_active", true);

  const accountBalance = (txns ?? []).reduce((s, r) => s + Number(r.amount), 0);

  // Open receivables
  const { data: recvs } = await supabase.rpc("query_receivables_aging", { p_org_id: orgId }).then(
    ({ data }) => ({ data }),
    () => ({ data: null })
  );

  let openReceivables = 0;
  let overdueReceivables = 0;
  if (recvs.data) {
    for (const r of recvs.data as Array<{ outstanding_amount: number; aging_bucket: string }>) {
      openReceivables += Number(r.outstanding_amount);
      if (r.aging_bucket !== "current") overdueReceivables += Number(r.outstanding_amount);
    }
  } else {
    // Fallback direct query
    const { data: recvFallback } = await supabase
      .from("receivables")
      .select("original_amount, amount_received, due_date")
      .eq("organization_id", orgId)
      .not("status", "in", '("cancelled","fully_paid")');

    for (const r of recvFallback ?? []) {
      const outstanding = Number(r.original_amount) - Number(r.amount_received);
      if (outstanding > 0.01) {
        openReceivables += outstanding;
        if (new Date(r.due_date) < new Date()) overdueReceivables += outstanding;
      }
    }
  }

  // Open payables
  const { data: pays } = await supabase
    .from("payables")
    .select("original_amount, amount_paid, due_date")
    .eq("organization_id", orgId)
    .not("status", "in", '("cancelled","fully_paid")');

  let openPayables = 0;
  let overduePayables = 0;
  for (const p of pays ?? []) {
    const outstanding = Number(p.original_amount) - Number(p.amount_paid);
    if (outstanding > 0.01) {
      openPayables += outstanding;
      if (new Date(p.due_date) < new Date()) overduePayables += outstanding;
    }
  }

  const netCashflow = totalReceived - totalPaid;

  let previousReceived: number | null = null;
  let previousPaid: number | null = null;
  let receivedChange: number | null = null;
  let paidChange: number | null = null;

  if (previousRange) {
    const { data: prevIn } = await supabase
      .from("financial_payments")
      .select("gross_amount")
      .eq("organization_id", orgId)
      .eq("payment_direction", "inbound")
      .is("reversal_of", null)
      .gte("paid_at", dateToISO(previousRange.from))
      .lte("paid_at", dateToEndISO(previousRange.to));

    const { data: prevOut } = await supabase
      .from("financial_payments")
      .select("gross_amount")
      .eq("organization_id", orgId)
      .eq("payment_direction", "outbound")
      .is("reversal_of", null)
      .gte("paid_at", dateToISO(previousRange.from))
      .lte("paid_at", dateToEndISO(previousRange.to));

    previousReceived = (prevIn ?? []).reduce((s, r) => s + Number(r.gross_amount), 0);
    previousPaid = (prevOut ?? []).reduce((s, r) => s + Number(r.gross_amount), 0);
    receivedChange = previousReceived > 0 ? ((totalReceived - previousReceived) / previousReceived) * 100 : null;
    paidChange = previousPaid > 0 ? ((totalPaid - previousPaid) / previousPaid) * 100 : null;
  }

  return {
    totalReceived,
    totalPaid,
    accountBalance,
    openReceivables,
    openPayables,
    overdueReceivables,
    overduePayables,
    netCashflow,
    previousReceived,
    previousPaid,
    receivedChange,
    paidChange,
  };
}

export async function getCashflowMonthly(months = 12): Promise<CashflowMonthlyRow[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_cashflow_monthly")
    .select("*")
    .eq("organization_id", orgId)
    .order("month_start", { ascending: false })
    .limit(months);

  if (error) throw error;

  return (data ?? []).reverse().map((row) => ({
    organization_id: row.organization_id,
    month_start: row.month_start,
    total_income: row.total_income,
    total_expense: row.total_expense,
    net_flow: row.net_flow,
  }));
}

export async function getReceivablesAging(): Promise<AgingBucket[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_receivables_aging")
    .select("aging_bucket, outstanding_amount")
    .eq("organization_id", orgId);

  if (error) throw error;

  const buckets: Record<string, { count: number; total: number }> = {
    current: { count: 0, total: 0 },
    "1_30": { count: 0, total: 0 },
    "31_60": { count: 0, total: 0 },
    "61_90": { count: 0, total: 0 },
    "90_plus": { count: 0, total: 0 },
  };

  for (const row of data ?? []) {
    const b = row.aging_bucket as keyof typeof buckets;
    if (buckets[b]) {
      buckets[b].count += 1;
      buckets[b].total += Number(row.outstanding_amount);
    }
  }

  const labels: Record<string, string> = {
    current: "A vencer",
    "1_30": "1-30 dias",
    "31_60": "31-60 dias",
    "61_90": "61-90 dias",
    "90_plus": "90+ dias",
  };

  return Object.entries(buckets).map(([bucket, { count, total }]) => ({
    bucket: bucket as AgingBucket["bucket"],
    label: labels[bucket] ?? bucket,
    count,
    totalAmount: total,
  }));
}

export async function getPayablesAging(): Promise<AgingBucket[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_payables_aging")
    .select("aging_bucket, outstanding_amount")
    .eq("organization_id", orgId);

  if (error) throw error;

  const buckets: Record<string, { count: number; total: number }> = {
    current: { count: 0, total: 0 },
    "1_30": { count: 0, total: 0 },
    "31_60": { count: 0, total: 0 },
    "61_90": { count: 0, total: 0 },
    "90_plus": { count: 0, total: 0 },
  };

  for (const row of data ?? []) {
    const b = row.aging_bucket as keyof typeof buckets;
    if (buckets[b]) {
      buckets[b].count += 1;
      buckets[b].total += Number(row.outstanding_amount);
    }
  }

  const labels: Record<string, string> = {
    current: "A vencer",
    "1_30": "1-30 dias",
    "31_60": "31-60 dias",
    "61_90": "61-90 dias",
    "90_plus": "90+ dias",
  };

  return Object.entries(buckets).map(([bucket, { count, total }]) => ({
    bucket: bucket as AgingBucket["bucket"],
    label: labels[bucket] ?? bucket,
    count,
    totalAmount: total,
  }));
}

export async function getExpensesByCategory(dateRange: DateRange): Promise<ExpenseByCategory[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("amount, financial_categories!inner(name)")
    .eq("organization_id", orgId)
    .eq("transaction_type", "expense")
    .is("reversal_of_transaction_id", null)
    .gte("occurred_at", dateToISO(dateRange.from))
    .lte("occurred_at", dateToEndISO(dateRange.to));

  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const fc = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
    const catName = (fc as { name: string } | null)?.name ?? "Sem categoria";
    map.set(catName, (map.get(catName) ?? 0) + Math.abs(Number(row.amount)));
  }

  const total = [...map.values()].reduce((s, v) => s + v, 0);

  return [...map.entries()]
    .map(([categoryName, totalAmount]) => ({
      categoryName,
      totalAmount,
      percentage: total > 0 ? (totalAmount / total) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getAccountBalances(): Promise<AccountBalanceSummary[]> {
  const { supabase, orgId } = await getCtx();

  const { data: accounts, error } = await supabase
    .from("financial_accounts")
    .select("id, name, account_type")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  const result: AccountBalanceSummary[] = [];
  for (const acc of accounts ?? []) {
    const { data: txns } = await supabase
      .from("financial_transactions")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("financial_account_id", acc.id);

    const balance = (txns ?? []).reduce((s, t) => s + Number(t.amount), 0);
    result.push({
      accountId: acc.id,
      accountName: acc.name,
      accountType: acc.account_type,
      balance,
    });
  }

  return result;
}

// ============================================================================
// INVENTORY REPORTS
// ============================================================================

export async function getInventoryKPIs(): Promise<InventoryKPIs> {
  const { supabase, orgId } = await getCtx();

  // Total active products
  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .is("archived_at", null);

  // Low stock & out of stock
  const { data: balances } = await supabase
    .from("inventory_balances")
    .select("quantity_on_hand, quantity_reserved, products!inner(minimum_stock, track_inventory)")
    .eq("organization_id", orgId)
    .eq("products.track_inventory", true);

  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  for (const b of balances ?? []) {
    const available = Number(b.quantity_on_hand) - Number(b.quantity_reserved);
    const prod = Array.isArray(b.products) ? b.products[0] : b.products;
    const minStock = Number((prod as { minimum_stock: number } | null)?.minimum_stock ?? 0);
    if (available <= 0) outOfStockProducts++;
    else if (available <= minStock) lowStockProducts++;
  }

  // Total movements this month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: totalMovements } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", firstOfMonth);

  // Total inventory value
  const { data: valuations } = await supabase
    .from("v_inventory_valuation")
    .select("total_value")
    .eq("organization_id", orgId);

  const totalInventoryValue = (valuations ?? []).reduce((s, v) => s + Number(v.total_value), 0);

  return {
    totalProducts: totalProducts ?? 0,
    lowStockProducts,
    outOfStockProducts,
    totalMovements: totalMovements ?? 0,
    totalInventoryValue,
  };
}

export async function getInventoryValuation(): Promise<InventoryValuationRow[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_inventory_valuation")
    .select("*")
    .eq("organization_id", orgId)
    .gt("quantity_on_hand", 0)
    .order("product_name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    organization_id: row.organization_id,
    warehouse_id: row.warehouse_id,
    warehouse_name: row.warehouse_name,
    product_id: row.product_id,
    product_name: row.product_name,
    product_sku: row.product_sku,
    variant_id: row.variant_id,
    variant_name: row.variant_name,
    variant_sku: row.variant_sku,
    quantity_on_hand: row.quantity_on_hand,
    quantity_reserved: row.quantity_reserved,
    quantity_available: row.quantity_available,
    unit_cost: row.unit_cost,
    available_value: row.available_value,
    total_value: row.total_value,
  }));
}

export async function getMovementSummary(dateRange: DateRange): Promise<MovementSummary[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("movement_type, quantity_delta")
    .eq("organization_id", orgId)
    .gte("created_at", dateToISO(dateRange.from))
    .lte("created_at", dateToEndISO(dateRange.to));

  if (error) throw error;

  const map = new Map<string, { count: number; qty: number }>();
  for (const row of data ?? []) {
    const entry = map.get(row.movement_type) ?? { count: 0, qty: 0 };
    entry.count += 1;
    entry.qty += Math.abs(Number(row.quantity_delta));
    map.set(row.movement_type, entry);
  }

  return [...map.entries()]
    .map(([movementType, { count, qty }]) => ({ movementType, count, totalQuantity: qty }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// TEAM REPORTS
// ============================================================================

export async function getTeamKPIs(): Promise<TeamKPIs> {
  const { supabase, orgId } = await getCtx();

  // Active members
  const { count: activeMembers } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");

  // Members by department
  const { data: deptMembers } = await supabase
    .from("employee_profiles")
    .select("department_id, departments!inner(name)")
    .eq("organization_id", orgId);

  const membersByDepartment: Record<string, number> = {};
  for (const dm of deptMembers ?? []) {
    const dept = Array.isArray(dm.departments) ? dm.departments[0] : dm.departments;
    const deptName = (dept as { name: string } | null)?.name ?? "Sem departamento";
    membersByDepartment[deptName] = (membersByDepartment[deptName] ?? 0) + 1;
  }

  // Pending invitations
  const { count: pendingInvitations } = await supabase
    .from("invitations")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  // Accepted invitations
  const { count: acceptedInvitations } = await supabase
    .from("invitations")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .not("accepted_at", "is", null);

  return {
    activeMembers: activeMembers ?? 0,
    membersByDepartment,
    pendingInvitations: pendingInvitations ?? 0,
    acceptedInvitations: acceptedInvitations ?? 0,
  };
}

export async function getTeamPerformance(dateRange: DateRange): Promise<TeamPerformanceRow[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("v_team_performance")
    .select("*")
    .eq("organization_id", orgId)
    .gte("last_order_at", dateToISO(dateRange.from))
    .lte("first_order_at", dateToEndISO(dateRange.to))
    .order("total_revenue", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    organization_id: row.organization_id,
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    department_id: row.department_id,
    department_name: row.department_name,
    order_count: row.order_count,
    total_revenue: row.total_revenue,
    avg_ticket: row.avg_ticket,
    first_order_at: row.first_order_at,
    last_order_at: row.last_order_at,
  }));
}

// ============================================================================
// EXECUTIVE DASHBOARD
// ============================================================================

export async function getExecutiveDashboard(dateRange: DateRange): Promise<ExecutiveDashboardData> {
  const [sales, crm, financial, inventory] = await Promise.all([
    getSalesKPIs(dateRange),
    getCRMKPIs(dateRange),
    getFinancialKPIs(dateRange),
    getInventoryKPIs(),
  ]);

  const { supabase, orgId } = await getCtx();

  // Recent orders
  const { data: recentOrdersData } = await supabase
    .from("orders")
    .select("id, document_number, total, status, created_at, customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentOrders = (recentOrdersData ?? []).map((o) => ({
    id: o.id,
    documentNumber: o.document_number,
    customerName: (Array.isArray(o.customers) ? o.customers[0] : o.customers as { name: string } | null)?.name ?? null,
    total: Number(o.total),
    status: o.status,
    createdAt: o.created_at,
  }));

  // Upcoming due (next 7 days)
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const { data: upcomingRecv } = await supabase
    .from("receivables")
    .select("id, description, original_amount, amount_received, due_date")
    .eq("organization_id", orgId)
    .not("status", "in", '("cancelled","fully_paid")')
    .gte("due_date", today)
    .lte("due_date", nextWeek)
    .order("due_date")
    .limit(5);

  const { data: upcomingPay } = await supabase
    .from("payables")
    .select("id, description, original_amount, amount_paid, due_date")
    .eq("organization_id", orgId)
    .not("status", "in", '("cancelled","fully_paid")')
    .gte("due_date", today)
    .lte("due_date", nextWeek)
    .order("due_date")
    .limit(5);

  const upcomingDue = [
    ...(upcomingRecv ?? []).map((r) => ({
      id: r.id,
      description: r.description,
      amount: Number(r.original_amount) - Number(r.amount_received),
      dueDate: r.due_date,
      type: "receivable" as const,
    })),
    ...(upcomingPay ?? []).map((p) => ({
      id: p.id,
      description: p.description,
      amount: Number(p.original_amount) - Number(p.amount_paid),
      dueDate: p.due_date,
      type: "payable" as const,
    })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);

  // Stock alerts
  const { data: stockAlertsData } = await supabase
    .from("inventory_balances")
    .select("product_id, quantity_on_hand, quantity_reserved, products!inner(name, minimum_stock, track_inventory)")
    .eq("organization_id", orgId)
    .eq("products.track_inventory", true)
    .limit(20);

  const stockAlerts = (stockAlertsData ?? [])
    .filter((s) => {
      const available = Number(s.quantity_on_hand) - Number(s.quantity_reserved);
      const prod = Array.isArray(s.products) ? s.products[0] : s.products;
      const min = Number((prod as { minimum_stock: number } | null)?.minimum_stock ?? 0);
      return available <= min;
    })
    .slice(0, 5)
    .map((s) => {
      const prod = Array.isArray(s.products) ? s.products[0] : s.products;
      return {
        productId: s.product_id,
        productName: (prod as { name: string } | null)?.name ?? "Produto",
        quantityAvailable: Number(s.quantity_on_hand) - Number(s.quantity_reserved),
        minimumStock: Number((prod as { minimum_stock: number } | null)?.minimum_stock ?? 0),
      };
    });

  return { sales, crm, financial, inventory, recentOrders, upcomingDue, stockAlerts };
}
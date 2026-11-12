import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/auth-context";
import { NexoraTheme } from "../../contexts/theme-context";
import { supabase } from "../../lib/supabase";

interface DashboardStats {
  orders_count: number;
  orders_total: number;
  customers_active: number;
  leads_open: number;
  stock_alerts: number;
  receivables_pending: number;
  payables_pending: number;
  tasks_pending: number;
}

interface OrderRow {
  id: string;
  total: number | string;
}

interface ReceivableRow {
  id: string;
  original_amount: number | string;
  amount_received: number | string;
}

interface PayableRow {
  id: string;
  original_amount: number | string;
  amount_paid: number | string;
}

interface InventoryRow {
  id: string;
  quantity_on_hand: number | string;
  quantity_reserved: number | string;
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DashboardScreen() {
  const { activeOrgId, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    if (!activeOrgId) return;
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [orders, customers, leads, inventory, receivables, payables, tasks] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total")
        .eq("organization_id", activeOrgId)
        .gte("issued_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("customers")
        .select("id")
        .eq("organization_id", activeOrgId)
        .eq("is_active", true),
      supabase
        .from("leads")
        .select("id")
        .eq("organization_id", activeOrgId)
        .neq("status", "won")
        .neq("status", "lost"),
      supabase
        .from("inventory_balances")
        .select("id, quantity_on_hand, quantity_reserved")
        .eq("organization_id", activeOrgId),
      supabase
        .from("receivables")
        .select("id, original_amount, amount_received")
        .eq("organization_id", activeOrgId)
        .neq("status", "received")
        .neq("status", "cancelled"),
      supabase
        .from("payables")
        .select("id, original_amount, amount_paid")
        .eq("organization_id", activeOrgId)
        .neq("status", "paid")
        .neq("status", "cancelled"),
      supabase
        .from("tasks")
        .select("id")
        .eq("organization_id", activeOrgId)
        .neq("status", "done"),
    ]);

    const orderRows = (orders.data ?? []) as OrderRow[];
    const inventoryRows = (inventory.data ?? []) as InventoryRow[];
    const receivableRows = (receivables.data ?? []) as ReceivableRow[];
    const payableRows = (payables.data ?? []) as PayableRow[];

    const stockAlerts = inventoryRows.filter((row) => {
      const onHand = toNumber(row.quantity_on_hand);
      const reserved = toNumber(row.quantity_reserved);
      return onHand - reserved < 5;
    }).length;

    const receivablesPending = receivableRows.reduce((sum, row) => {
      const original = toNumber(row.original_amount);
      const received = toNumber(row.amount_received);
      return sum + Math.max(0, original - received);
    }, 0);

    const payablesPending = payableRows.reduce((sum, row) => {
      const original = toNumber(row.original_amount);
      const paid = toNumber(row.amount_paid);
      return sum + Math.max(0, original - paid);
    }, 0);

    const ordersTotal = orderRows.reduce((sum, row) => sum + toNumber(row.total), 0);

    setStats({
      orders_count: orderRows.length,
      orders_total: ordersTotal,
      customers_active: (customers.data ?? []).length,
      leads_open: (leads.data ?? []).length,
      stock_alerts: stockAlerts,
      receivables_pending: receivablesPending,
      payables_pending: payablesPending,
      tasks_pending: (tasks.data ?? []).length,
    });
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStats();
            }}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Olá, {user?.user_metadata?.full_name ?? "Usuário"}
            </Text>
            <Text style={styles.orgName}>Resumo da empresa</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </Text>
          </View>
        </View>

        {loading && !stats ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={NexoraTheme.colors.blue} />
          </View>
        ) : stats ? (
          <>
            {/* KPI Grid */}
            <View style={styles.grid}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Pedidos (30d)</Text>
                <Text style={styles.cardValue}>{stats.orders_count}</Text>
                <Text style={styles.cardSub}>{fmt(stats.orders_total)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Clientes ativos</Text>
                <Text style={styles.cardValue}>{stats.customers_active}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Leads abertos</Text>
                <Text style={styles.cardValue}>{stats.leads_open}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Estoque baixo</Text>
                <Text
                  style={[styles.cardValue, stats.stock_alerts > 0 && styles.alert]}
                >
                  {stats.stock_alerts}
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>A receber</Text>
                <Text style={styles.cardValue}>{fmt(stats.receivables_pending)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Tarefas pendentes</Text>
                <Text style={styles.cardValue}>{stats.tasks_pending}</Text>
              </View>
            </View>

            {/* Sections */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minhas tarefas</Text>
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {stats.tasks_pending === 0
                    ? "Nenhuma tarefa pendente."
                    : `${stats.tasks_pending} tarefa(s) pendente(s).`}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alertas de estoque</Text>
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {stats.stock_alerts === 0
                    ? "Estoque saudável."
                    : `${stats.stock_alerts} produto(s) com estoque baixo.`}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NexoraTheme.colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 20, fontWeight: "700", color: NexoraTheme.colors.dark },
  orgName: {
    fontSize: 13,
    color: NexoraTheme.colors.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NexoraTheme.colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: NexoraTheme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: NexoraTheme.colors.textSecondary,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: NexoraTheme.colors.dark,
    marginTop: 6,
  },
  cardSub: {
    fontSize: 12,
    color: NexoraTheme.colors.textSecondary,
    marginTop: 2,
  },
  alert: { color: NexoraTheme.colors.error },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NexoraTheme.colors.dark,
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: NexoraTheme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
  },
  emptyText: { fontSize: 13, color: NexoraTheme.colors.textSecondary },
});
import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/auth-context";
import { NexoraTheme } from "../../contexts/theme-context";
import { supabase } from "../../lib/supabase";

interface Order {
  id: string;
  document_number: string;
  status: string;
  total: number | string;
  issued_at: string;
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function VendasScreen() {
  const { activeOrgId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!activeOrgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, document_number, status, total, issued_at")
      .eq("organization_id", activeOrgId)
      .order("issued_at", { ascending: false })
      .limit(50);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const statusColor: Record<string, string> = {
    draft: NexoraTheme.colors.textSecondary,
    confirmed: NexoraTheme.colors.blue,
    preparing: NexoraTheme.colors.warning,
    completed: NexoraTheme.colors.success,
    cancelled: NexoraTheme.colors.error,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendas</Text>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={NexoraTheme.colors.blue} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum pedido encontrado.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.document_number}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    { color: statusColor[item.status] ?? NexoraTheme.colors.textSecondary },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
              <Text style={styles.cardValue}>{fmt(toNumber(item.total))}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.issued_at).toLocaleDateString("pt-BR")}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NexoraTheme.colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: NexoraTheme.colors.dark },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: NexoraTheme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: 15, fontWeight: "600", color: NexoraTheme.colors.dark },
  statusBadge: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  cardValue: { fontSize: 16, fontWeight: "700", color: NexoraTheme.colors.dark, marginTop: 6 },
  cardDate: { fontSize: 12, color: NexoraTheme.colors.textSecondary, marginTop: 4 },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 13, color: NexoraTheme.colors.textSecondary },
});
import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/auth-context";
import { NexoraTheme } from "../../contexts/theme-context";
import { supabase } from "../../lib/supabase";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

export default function ClientesScreen() {
  const { activeOrgId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    if (!activeOrgId) return;
    setLoading(true);
    let query = supabase
      .from("customers")
      .select("id, name, email, phone, is_active")
      .eq("organization_id", activeOrgId)
      .order("name", { ascending: true })
      .limit(100);

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    const { data } = await query;
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, [activeOrgId, search]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente..."
          placeholderTextColor={NexoraTheme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading && customers.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={NexoraTheme.colors.blue} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum cliente encontrado.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                {!item.is_active && <Text style={styles.inactiveBadge}>Inativo</Text>}
              </View>
              {item.email && <Text style={styles.cardDetail}>{item.email}</Text>}
              {item.phone && <Text style={styles.cardDetail}>{item.phone}</Text>}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NexoraTheme.colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: NexoraTheme.colors.dark },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
    borderRadius: NexoraTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: NexoraTheme.colors.text,
  },
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
  inactiveBadge: { fontSize: 10, fontWeight: "600", color: NexoraTheme.colors.textSecondary, backgroundColor: NexoraTheme.colors.bgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardDetail: { fontSize: 12, color: NexoraTheme.colors.textSecondary, marginTop: 4 },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 13, color: NexoraTheme.colors.textSecondary },
});
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Users,
  Package,
  Warehouse,
  ShoppingCart,
  DollarSign,
  CalendarDays,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../../contexts/auth-context";
import { NexoraTheme } from "../../contexts/theme-context";

const MENU_ITEMS = [
  { label: "Leads", icon: Users, route: "/leads", color: "#8B5CF6" },
  { label: "Produtos", icon: Package, route: "/produtos", color: "#F59E0B" },
  { label: "Estoque", icon: Warehouse, route: "/estoque", color: "#EF4444" },
  { label: "Compras", icon: ShoppingCart, route: "/compras", color: "#10B981" },
  { label: "Financeiro", icon: DollarSign, route: "/financeiro", color: "#3B82F6" },
  { label: "Agenda", icon: CalendarDays, route: "/agenda", color: "#EC4899" },
  { label: "Relatórios", icon: BarChart3, route: "/relatorios", color: "#6366F1" },
  { label: "Intelligence", icon: Sparkles, route: "/intelligence", color: "#20C5C9" },
  { label: "Configurações", icon: Settings, route: "/settings", color: "#667085" },
];

export default function MaisScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mais</Text>

        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.menuCard}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as never)}
              >
                <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                  <Icon size={22} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User info + logout */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.email?.[0] ?? "U").toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.user_metadata?.full_name ?? "Usuário"}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={signOut} activeOpacity={0.7}>
            <LogOut size={18} color={NexoraTheme.colors.error} />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NexoraTheme.colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", color: NexoraTheme.colors.dark, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  menuCard: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: NexoraTheme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 12, fontWeight: "600", color: NexoraTheme.colors.dark, textAlign: "center" },
  userSection: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: NexoraTheme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NexoraTheme.colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  userName: { fontSize: 14, fontWeight: "600", color: NexoraTheme.colors.dark },
  userEmail: { fontSize: 12, color: NexoraTheme.colors.textSecondary, marginTop: 2 },
  logoutButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { fontSize: 13, fontWeight: "600", color: NexoraTheme.colors.error },
});
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useAuth } from "../contexts/auth-context";
import { NexoraTheme } from "../contexts/theme-context";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface OrgOption {
 org_id: string;
 org_name: string;
 role: string;
}

export default function SelectOrgScreen() {
 const router = useRouter();
 const { memberships, activeOrgId, setActiveOrg } = useAuth();
 const [orgs, setOrgs] = useState<OrgOption[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 async function load() {
 if (memberships.length === 0) {
 setLoading(false);
 return;
 }

 const orgIds = memberships.map((m) => m.organization_id);
 const { data } = await supabase
 .from("organizations")
 .select("id, name")
 .in("id", orgIds);

 const orgMap = new Map((data ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));

 const options: OrgOption[] = memberships.map((m) => ({
 org_id: m.organization_id,
 org_name: orgMap.get(m.organization_id) ?? "Organização",
 role: m.role,
 }));

 setOrgs(options);
 setLoading(false);

 // If only one org, auto-select and navigate
 if (options.length === 1) {
 setActiveOrg(options[0].org_id);
 router.replace("/(tabs)");
 }
 }
 load();
 }, [memberships]);

 function handleSelect(orgId: string) {
 setActiveOrg(orgId);
 router.replace("/(tabs)");
 }

 if (loading) {
 return (
 <SafeAreaView style={styles.container}>
 <View style={styles.loader}>
 <ActivityIndicator size="large" color={NexoraTheme.colors.blue} />
 </View>
 </SafeAreaView>
 );
 }

 return (
 <SafeAreaView style={styles.container}>
 <View style={styles.content}>
 <View style={styles.logoMark}>
 <Text style={styles.logoText}>N</Text>
 </View>
 <Text style={styles.title}>Selecione sua empresa</Text>
 <Text style={styles.subtitle}>
 Você tem acesso a {orgs.length} organização{orgs.length !== 1 ? "es" : ""}.
 </Text>

 <FlatList
 data={orgs}
 keyExtractor={(item) => item.org_id}
 contentContainerStyle={styles.list}
 renderItem={({ item }) => (
 <TouchableOpacity
 style={[
 styles.orgCard,
 activeOrgId === item.org_id && styles.orgCardActive,
 ]}
 onPress={() => handleSelect(item.org_id)}
 activeOpacity={0.7}
 >
 <View>
 <Text style={styles.orgName}>{item.org_name}</Text>
 <Text style={styles.orgRole}>{item.role}</Text>
 </View>
 {activeOrgId === item.org_id && (
 <Check size={20} color={NexoraTheme.colors.blue} />
 )}
 </TouchableOpacity>
 )}
 />
 </View>
 </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 container: { flex: 1, backgroundColor: NexoraTheme.colors.bg },
 loader: { flex: 1, justifyContent: "center", alignItems: "center" },
 content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
 logoMark: {
 width: 56,
 height: 56,
 borderRadius: 14,
 backgroundColor: NexoraTheme.colors.blue,
 alignItems: "center",
 justifyContent: "center",
 alignSelf: "center",
 marginBottom: 20,
 },
 logoText: { fontSize: 28, fontWeight: "700", color: "#FFFFFF" },
 title: {
 fontSize: 22,
 fontWeight: "700",
 color: NexoraTheme.colors.dark,
 textAlign: "center",
 },
 subtitle: {
 fontSize: 14,
 color: NexoraTheme.colors.textSecondary,
 textAlign: "center",
 marginTop: 6,
 marginBottom: 32,
 },
 list: { gap: 10 },
 orgCard: {
 backgroundColor: "#FFFFFF",
 borderRadius: NexoraTheme.radius.md,
 padding: 16,
 borderWidth: 1,
 borderColor: NexoraTheme.colors.border,
 flexDirection: "row",
 justifyContent: "space-between",
 alignItems: "center",
 },
 orgCardActive: {
 borderColor: NexoraTheme.colors.blue,
 backgroundColor: "#EFF4FF",
 },
 orgName: { fontSize: 15, fontWeight: "600", color: NexoraTheme.colors.dark },
 orgRole: {
 fontSize: 11,
 fontWeight: "600",
 textTransform: "uppercase",
 letterSpacing: 0.5,
 color: NexoraTheme.colors.textSecondary,
 marginTop: 2,
 },
});
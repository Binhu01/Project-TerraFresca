import { Tabs } from "expo-router";
import { Home, Users, ShoppingCart, CheckSquare, Menu } from "lucide-react-native";
import { NexoraTheme } from "../../contexts/theme-context";

export default function TabLayout() {
 return (
 <Tabs
 screenOptions={{
 headerShown: false,
 tabBarActiveTintColor: NexoraTheme.colors.blue,
 tabBarInactiveTintColor: NexoraTheme.colors.textSecondary,
 tabBarStyle: {
 backgroundColor: "#FFFFFF",
 borderTopColor: NexoraTheme.colors.border,
 height: 60,
 paddingBottom: 8,
 paddingTop: 8,
 },
 tabBarLabelStyle: {
 fontSize: 11,
 fontWeight: "500",
 },
 }}
 >
 <Tabs.Screen
 name="index"
 options={{
 title: "Início",
 tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
 }}
 />
 <Tabs.Screen
 name="clientes"
 options={{
 title: "Clientes",
 tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
 }}
 />
 <Tabs.Screen
 name="vendas"
 options={{
 title: "Vendas",
 tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
 }}
 />
 <Tabs.Screen
 name="tarefas"
 options={{
 title: "Tarefas",
 tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
 }}
 />
 <Tabs.Screen
 name="mais"
 options={{
 title: "Mais",
 tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
 }}
 />
 </Tabs>
 );
}
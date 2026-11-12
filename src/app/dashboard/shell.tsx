"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  Users,
  UserSearch,
  ShoppingCart,
  FileText,
  Store,
  Package,
  Warehouse,
  DollarSign,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  Building2,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  Tags,
  Receipt,
  ShieldCheck,
  MailPlus,
  ScrollText,
  CheckSquare,
  CalendarDays,
  Bell,
  Sparkles,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { switchOrganization } from "./actions";
import type { UserRole } from "@/types/database";

interface NavSubItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  children?: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Leads", href: "/dashboard/leads", icon: UserSearch },
  {
    label: "Vendas",
    icon: ShoppingCart,
    children: [
      { label: "Pedidos", href: "/dashboard/vendas/pedidos", icon: FileText },
      { label: "Orçamentos", href: "/dashboard/vendas/orcamentos", icon: FileText },
      { label: "Canais de Venda", href: "/dashboard/vendas/canais", icon: Store },
    ],
  },
  { label: "Produtos", href: "/dashboard/produtos", icon: Package },
  {
    label: "Estoque",
    icon: Warehouse,
    children: [
      { label: "Visão geral", href: "/dashboard/estoque", icon: LayoutDashboard },
      { label: "Depósitos", href: "/dashboard/estoque/depositos", icon: Warehouse },
      { label: "Movimentações", href: "/dashboard/estoque/movimentacoes", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Compras",
    icon: ShoppingCart,
    children: [
      { label: "Visão geral", href: "/dashboard/compras", icon: LayoutDashboard },
      { label: "Fornecedores", href: "/dashboard/compras/fornecedores", icon: Users },
      { label: "Ordens de compra", href: "/dashboard/compras/ordens", icon: FileText },
      { label: "Recebimentos", href: "/dashboard/compras/recebimentos", icon: Package },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    children: [
      { label: "Visão geral", href: "/dashboard/financeiro", icon: LayoutDashboard },
      { label: "Contas a receber", href: "/dashboard/financeiro/receber", icon: TrendingUp },
      { label: "Contas a pagar", href: "/dashboard/financeiro/pagar", icon: TrendingDown },
      { label: "Contas financeiras", href: "/dashboard/financeiro/contas", icon: Landmark },
      { label: "Fluxo de caixa", href: "/dashboard/financeiro/fluxo", icon: ArrowLeftRight },
      { label: "Categorias", href: "/dashboard/financeiro/categorias", icon: Tags },
      { label: "Transações", href: "/dashboard/financeiro/transacoes", icon: Receipt },
    ],
  },
  {
    label: "Equipe",
    icon: UserCog,
    children: [
      { label: "Visão geral", href: "/dashboard/equipe", icon: LayoutDashboard },
      { label: "Funcionários", href: "/dashboard/equipe/funcionarios", icon: Users },
      { label: "Departamentos", href: "/dashboard/equipe/departamentos", icon: Building2 },
      { label: "Cargos e permissões", href: "/dashboard/equipe/cargos", icon: ShieldCheck },
      { label: "Convites", href: "/dashboard/equipe/convites", icon: MailPlus },
      { label: "Auditoria", href: "/dashboard/equipe/auditoria", icon: ScrollText },
    ],
  },
  {
    label: "Tarefas",
    icon: CheckSquare,
    children: [
      { label: "Visão geral", href: "/dashboard/tarefas", icon: LayoutDashboard },
      { label: "Kanban", href: "/dashboard/tarefas/kanban", icon: CheckSquare },
    ],
  },
  { label: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
  { label: "Notificações", href: "/dashboard/notificacoes", icon: Bell },
  {
    label: "Intelligence",
    icon: Sparkles,
    children: [
      { label: "Assistente IA", href: "/dashboard/intelligence", icon: Sparkles },
      { label: "Configurações", href: "/dashboard/intelligence/configuracoes", icon: Settings },
    ],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    children: [
      { label: "Visão geral", href: "/dashboard/relatorios", icon: LayoutDashboard },
      { label: "Comercial", href: "/dashboard/relatorios/vendas", icon: ShoppingCart },
      { label: "CRM", href: "/dashboard/relatorios/crm", icon: Users },
      { label: "Financeiro", href: "/dashboard/relatorios/financeiro", icon: DollarSign },
      { label: "Estoque", href: "/dashboard/relatorios/estoque", icon: Package },
      { label: "Equipe", href: "/dashboard/relatorios/equipe", icon: UserCog },
    ],
  },
  { label: "Minha Assinatura", href: "/dashboard/billing", icon: CreditCard },
  { label: "Admin", href: "/admin", icon: ShieldAlert },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: Settings, comingSoon: true },
];

interface DashboardShellProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  activeOrg: {
    id: string;
    name: string;
    slug: string;
    role: UserRole;
  };
  allOrgs: Array<{ id: string; name: string; slug: string }>;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  activeOrg,
  allOrgs,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function toggleSubmenu(label: string) {
    setOpenSubmenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSwitchOrg(orgId: string) {
    setOrgMenuOpen(false);
    startTransition(async () => {
      const result = await switchOrganization(orgId);
      if (result.success) {
        router.refresh();
      }
    });
  }

  const userInitial = (user.name ?? user.email).charAt(0).toUpperCase();
  const roleName: Record<string, string> = {
    OWNER: "Proprietário",
    ADMIN: "Administrador",
    MANAGER: "Gestor",
    EMPLOYEE: "Colaborador",
  };

  return (
    <div className="flex min-h-screen bg-nexora-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-nexora-border bg-white transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-nexora-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nexora-blue font-display text-sm font-bold text-white">
            N
          </div>
          <span className="font-display text-lg font-bold text-nexora-dark">
            Nexora
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            // Submenu with children (e.g. Vendas)
            if (item.children) {
              const isChildActive = item.children.some(
                (child) => child.href && pathname.startsWith(child.href)
              );
              const isOpen = openSubmenus[item.label] ?? isChildActive;

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isChildActive
                        ? "bg-nexora-blue/10 text-nexora-blue"
                        : "text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-text"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-nexora-border pl-2">
                      {item.children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              childActive
                                ? "bg-nexora-blue/10 text-nexora-blue"
                                : "text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-text"
                            }`}
                          >
                            <child.icon className="h-3.5 w-3.5" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;

            if (item.comingSoon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-nexora-text-secondary/60"
                >
                  <item.icon className="h-4 w-4 opacity-50" />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded bg-nexora-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nexora-text-secondary/70">
                    Em breve
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-nexora-blue/10 text-nexora-blue"
                    : "text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-text"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-nexora-border p-3">
          <Link
            href="/dashboard/perfil"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === "/dashboard/perfil"
                ? "bg-nexora-blue/10 text-nexora-blue"
                : "text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-text"
            }`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-nexora-blue/10 text-xs font-bold text-nexora-blue">
              {userInitial}
            </div>
            <span className="flex-1 truncate">{user.name ?? user.email}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-nexora-text-secondary transition-colors hover:bg-red-50 hover:text-nexora-error"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-nexora-border bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-nexora-text-secondary hover:bg-nexora-bg-secondary md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Org selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-nexora-border px-3 py-1.5 text-sm transition-colors hover:bg-nexora-bg-secondary disabled:opacity-50"
            >
              <Building2 className="h-4 w-4 text-nexora-blue" />
              <span className="max-w-[200px] truncate font-medium text-nexora-text">
                {activeOrg.name}
              </span>
              {allOrgs.length > 1 && (
                <ChevronDown className="h-3.5 w-3.5 text-nexora-text-secondary" />
              )}
            </button>

            {orgMenuOpen && allOrgs.length > 1 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOrgMenuOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-nexora-border bg-white py-1 shadow-lg">
                  {allOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      disabled={isPending}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-nexora-bg-secondary ${
                        org.id === activeOrg.id
                          ? "font-medium text-nexora-blue"
                          : "text-nexora-text"
                      }`}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{org.name}</span>
                      {org.id === activeOrg.id && (
                        <span className="ml-auto text-xs text-nexora-blue">Ativa</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-nexora-text">
                {user.name ?? "Usuário"}
              </p>
              <p className="text-xs text-nexora-text-secondary">
                {roleName[activeOrg.role] ?? activeOrg.role}
              </p>
            </div>
            <Link
              href="/dashboard/perfil"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-nexora-blue/10 text-sm font-medium text-nexora-blue transition-colors hover:bg-nexora-blue/20"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                userInitial
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
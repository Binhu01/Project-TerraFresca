/**
 * Maps dashboard routes to required permission keys.
 * Used by middleware and layout for route-level access control.
 * If a route is not listed, it's accessible to all authenticated members.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  // Dashboard
  "/dashboard": "dashboard.view",

  // CRM
  "/dashboard/clientes": "customers.view",
  "/dashboard/leads": "leads.view",

  // Sales
  "/dashboard/vendas/pedidos": "orders.view",
  "/dashboard/vendas/orcamentos": "quotes.view",
  "/dashboard/vendas/canais": "channels.view",

  // Products & Inventory
  "/dashboard/produtos": "products.view",
  "/dashboard/estoque": "inventory.view",
  "/dashboard/estoque/depositos": "warehouses.view",
  "/dashboard/estoque/movimentacoes": "inventory.view",

  // Financial
  "/dashboard/financeiro": "cashflow.view",
  "/dashboard/financeiro/receber": "receivables.view",
  "/dashboard/financeiro/pagar": "payables.view",
  "/dashboard/financeiro/contas": "accounts.view",
  "/dashboard/financeiro/fluxo": "cashflow.view",
  "/dashboard/financeiro/categorias": "categories.view",
  "/dashboard/financeiro/transacoes": "transactions.view",

  // Team
  "/dashboard/equipe": "team.view",
  "/dashboard/equipe/funcionarios": "team.view",
  "/dashboard/equipe/departamentos": "departments.view",
  "/dashboard/equipe/cargos": "roles.view",
  "/dashboard/equipe/convites": "team.view",
  "/dashboard/equipe/auditoria": "audit.view",
  "/dashboard/equipe/aprovacoes": "approvals.view",

  // Reports
  "/dashboard/relatorios": "reports.view",

  // Settings
  "/dashboard/configuracoes": "settings.org",
};

/**
 * Routes that are always accessible (no permission check).
 */
export const PUBLIC_ROUTES = new Set([
  "/login",
  "/cadastro",
  "/dashboard/onboarding",
  "/dashboard/acesso-negado",
  "/dashboard/perfil",
]);

/**
 * Check if a pathname requires a specific permission.
 * Returns the permission key if required, or null if the route is open.
 */
export function getRequiredPermission(pathname: string): string | null {
  if (PUBLIC_ROUTES.has(pathname)) return null;

  // Exact match first
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];

  // Prefix match for sub-routes (e.g., /dashboard/clientes/123 → customers.view)
  const segments = pathname.split("/");
  for (let i = segments.length; i >= 3; i--) {
    const prefix = segments.slice(0, i).join("/");
    if (ROUTE_PERMISSIONS[prefix]) return ROUTE_PERMISSIONS[prefix];
  }

  return null;
}
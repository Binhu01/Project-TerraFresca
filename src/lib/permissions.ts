import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import type { EffectivePermissions, PermissionModule } from "@/types/team";

/**
 * Permission catalog grouped by module for UI rendering.
 */
export const PERMISSION_CATALOG: Record<PermissionModule, Array<{ key: string; label: string }>> = {
  dashboard: [{ key: "dashboard.view", label: "Visualizar dashboard" }],
  customers: [
    { key: "customers.view", label: "Visualizar clientes" },
    { key: "customers.create", label: "Criar clientes" },
    { key: "customers.edit", label: "Editar clientes" },
    { key: "customers.delete", label: "Arquivar clientes" },
  ],
  leads: [
    { key: "leads.view", label: "Visualizar leads" },
    { key: "leads.create", label: "Criar leads" },
    { key: "leads.edit", label: "Editar leads" },
    { key: "leads.delete", label: "Arquivar leads" },
  ],
  orders: [
    { key: "orders.view", label: "Visualizar pedidos" },
    { key: "orders.create", label: "Criar pedidos" },
    { key: "orders.edit", label: "Editar pedidos" },
    { key: "orders.delete", label: "Cancelar pedidos" },
  ],
  quotes: [
    { key: "quotes.view", label: "Visualizar orçamentos" },
    { key: "quotes.create", label: "Criar orçamentos" },
    { key: "quotes.edit", label: "Editar orçamentos" },
  ],
  channels: [
    { key: "channels.view", label: "Visualizar canais" },
    { key: "channels.manage", label: "Gerenciar canais" },
  ],
  products: [
    { key: "products.view", label: "Visualizar produtos" },
    { key: "products.create", label: "Criar produtos" },
    { key: "products.edit", label: "Editar produtos" },
    { key: "products.delete", label: "Arquivar produtos" },
    { key: "products.change_price", label: "Alterar preços" },
  ],
  inventory: [
    { key: "inventory.view", label: "Visualizar estoque" },
    { key: "inventory.adjust", label: "Ajustar estoque" },
    { key: "inventory.transfer", label: "Transferir estoque" },
  ],
  warehouses: [
    { key: "warehouses.view", label: "Visualizar depósitos" },
    { key: "warehouses.manage", label: "Gerenciar depósitos" },
  ],
  receivables: [
    { key: "receivables.view", label: "Visualizar contas a receber" },
    { key: "receivables.create", label: "Criar contas a receber" },
    { key: "receivables.edit", label: "Editar contas a receber" },
  ],
  payables: [
    { key: "payables.view", label: "Visualizar contas a pagar" },
    { key: "payables.create", label: "Criar contas a pagar" },
    { key: "payables.edit", label: "Editar contas a pagar" },
  ],
  payments: [
    { key: "payments.register_inbound", label: "Registrar recebimentos" },
    { key: "payments.register_outbound", label: "Registrar pagamentos" },
    { key: "payments.reverse", label: "Efetuar estornos" },
  ],
  accounts: [
    { key: "accounts.view", label: "Visualizar contas financeiras" },
    { key: "accounts.manage", label: "Gerenciar contas financeiras" },
  ],
  transfers: [{ key: "transfers.execute", label: "Transferir entre contas" }],
  cashflow: [{ key: "cashflow.view", label: "Visualizar fluxo de caixa" }],
  transactions: [{ key: "transactions.view", label: "Visualizar transações" }],
  categories: [
    { key: "categories.view", label: "Visualizar categorias" },
    { key: "categories.manage", label: "Gerenciar categorias" },
  ],
  team: [
    { key: "team.view", label: "Visualizar equipe" },
    { key: "team.invite", label: "Convidar membros" },
    { key: "team.edit_profile", label: "Editar dados profissionais" },
    { key: "team.edit_role", label: "Alterar papéis" },
    { key: "team.suspend", label: "Suspender membros" },
    { key: "team.remove", label: "Remover membros" },
  ],
  departments: [
    { key: "departments.view", label: "Visualizar departamentos" },
    { key: "departments.manage", label: "Gerenciar departamentos" },
  ],
  roles: [
    { key: "roles.view", label: "Visualizar papéis e permissões" },
    { key: "roles.manage", label: "Gerenciar papéis e permissões" },
  ],
  audit: [{ key: "audit.view", label: "Visualizar auditoria" }],
  approvals: [
    { key: "approvals.view", label: "Visualizar aprovações" },
    { key: "approvals.vote", label: "Votar em aprovações" },
  ],
  settings: [{ key: "settings.org", label: "Editar dados da organização" }],
  reports: [
    { key: "reports.view", label: "Visualizar relatórios" },
    { key: "reports.export", label: "Exportar relatórios" },
  ],
};

const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

/**
 * Check if currentUser can manage targetRole based on hierarchy.
 * Users can only manage roles below their own level.
 * OWNER can manage all roles including other OWNERs (but critical ops require approval).
 */
export function canManageRole(currentUserRole: string, targetRole: string): boolean {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;
  return currentLevel > targetLevel || currentUserRole === "OWNER";
}

/**
 * Get effective permissions for the current user in the active organization.
 * Resolves role permissions + individual overrides (deny wins over grant).
 */
export async function getUserPermissions(): Promise<EffectivePermissions> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const activeData = await getActiveOrganization();
  if (!activeData) return {};

  const orgId = activeData.org.id;
  const userId = user.id;

  // Use the has_permission RPC for each permission would be too slow.
  // Instead, fetch all role_permissions and membership_permissions in one go.
  const membership = activeData.org.membership;

  // Get role_id for the current user's role
  const { data: role } = await supabase
    .from("organization_roles")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", membership.role)
    .maybeSingle();

  if (!role) return {};

  // Fetch role permissions
  const { data: rolePerms } = await supabase
    .from("role_permissions")
    .select("permission_id, granted, permissions!inner(permission_key)")
    .eq("organization_id", orgId)
    .eq("role_id", role.id);

  // Fetch individual overrides
  const { data: memberPerms } = await supabase
    .from("membership_permissions")
    .select("permission_id, effect, permissions!inner(permission_key)")
    .eq("organization_id", orgId)
    .eq("membership_id", membership.id);

  // Build effective permissions map
  const perms: EffectivePermissions = {};

  // Start with role permissions
  if (rolePerms) {
    for (const rp of rolePerms) {
      const perm = rp.permissions as unknown as { permission_key: string };
      if (perm?.permission_key) {
        perms[perm.permission_key] = rp.granted;
      }
    }
  }

  // Apply individual overrides (deny always wins)
  if (memberPerms) {
    for (const mp of memberPerms) {
      const perm = mp.permissions as unknown as { permission_key: string };
      if (perm?.permission_key) {
        if (mp.effect === "deny") {
          perms[perm.permission_key] = false;
        } else if (mp.effect === "grant") {
          perms[perm.permission_key] = true;
        }
      }
    }
  }

  return perms;
}

/**
 * Check if the current user has a specific permission.
 */
export async function checkPermission(permissionKey: string): Promise<boolean> {
  const perms = await getUserPermissions();
  return perms[permissionKey] === true;
}

/**
 * Require a permission — throws if denied.
 * Use at the top of server actions for protected operations.
 */
export async function requirePermission(permissionKey: string): Promise<void> {
  const has = await checkPermission(permissionKey);
  if (!has) {
    throw new Error(`Permissão negada: ${permissionKey}`);
  }
}
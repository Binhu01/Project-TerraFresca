// Nexora Fase 07 — Team & Permissions Types

export type SystemRole = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export type PermissionModule =
  | "dashboard"
  | "customers"
  | "leads"
  | "orders"
  | "quotes"
  | "channels"
  | "products"
  | "inventory"
  | "warehouses"
  | "receivables"
  | "payables"
  | "payments"
  | "accounts"
  | "transfers"
  | "cashflow"
  | "transactions"
  | "categories"
  | "team"
  | "departments"
  | "roles"
  | "audit"
  | "approvals"
  | "settings"
  | "reports";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "manage"
  | "assign"
  | "approve"
  | "adjust"
  | "transfer"
  | "change_price"
  | "register_inbound"
  | "register_outbound"
  | "reverse"
  | "execute"
  | "invite"
  | "edit_profile"
  | "edit_role"
  | "suspend"
  | "remove"
  | "vote"
  | "org"
  | "export";

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeProfile {
  id: string;
  organization_id: string;
  membership_id: string;
  department_id: string | null;
  job_title: string | null;
  professional_phone: string | null;
  start_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRole {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  permission_key: string;
  module: string;
  action: string;
  description: string;
}

export interface RolePermission {
  id: string;
  organization_id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
}

export interface MembershipPermission {
  id: string;
  organization_id: string;
  membership_id: string;
  permission_id: string;
  effect: "grant" | "deny";
  created_by: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role_id: string;
  department_id: string | null;
  job_title: string | null;
  token_hash: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_user_id: string;
  action: string;
  module: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  request_type: "promote_to_owner" | "demote_owner" | "remove_owner" | "transfer_ownership";
  requested_by: string;
  target_membership_id: string;
  description: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  created_at: string;
  resolved_at: string | null;
}

export interface ApprovalVote {
  id: string;
  organization_id: string;
  approval_request_id: string;
  voter_user_id: string;
  decision: "approve" | "reject";
  note: string | null;
  created_at: string;
}

// Extended types with joins
export interface MemberWithDetails {
  membership_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: SystemRole;
  status: "active" | "suspended";
  joined_at: string;
  department_id: string | null;
  department_name: string | null;
  job_title: string | null;
  professional_phone: string | null;
  start_date: string | null;
  notes: string | null;
}

export type EffectivePermissions = Record<string, boolean>;

export interface TeamDashboardStats {
  total_active_members: number;
  pending_invitations: number;
  owner_count: number;
  admin_count: number;
  manager_count: number;
  employee_count: number;
  department_count: number;
  recent_activities: AuditLog[];
}

export interface MemberFilters {
  search?: string;
  role?: string;
  department_id?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export interface InvitationFilters {
  status?: "pending" | "accepted" | "revoked" | "expired";
  page?: number;
  perPage?: number;
}

export interface AuditFilters {
  user_id?: string;
  module?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  perPage?: number;
}

export interface InvitationWithDetails extends Invitation {
  role_name: string;
  department_name: string | null;
  inviter_name: string | null;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  requester_name: string | null;
  target_member_name: string | null;
  votes: Array<{
    voter_name: string | null;
    decision: "approve" | "reject";
    note: string | null;
    created_at: string;
  }>;
}

export interface RoleWithMemberCount extends OrganizationRole {
  member_count: number;
}
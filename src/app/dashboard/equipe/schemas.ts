import { z } from "zod";

// ==== DEPARTMENTS ====

export const createDepartmentSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  description: z.string().max(500).optional().nullable(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.partial();

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// ==== MEMBER PROFILE ====

export const updateMemberProfileSchema = z.object({
  job_title: z.string().max(200).optional().nullable(),
  department_id: z.string().uuid("Departamento inválido").optional().nullable(),
  professional_phone: z.string().max(30).optional().nullable(),
  start_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;

// ==== MEMBER ROLE ====

export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// ==== INVITATIONS ====

export const createInvitationSchema = z.object({
  email: z.string().email("E-mail inválido").min(5).max(255),
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"]),
  department_id: z.string().uuid("Departamento inválido").optional().nullable(),
  job_title: z.string().max(200).optional().nullable(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// ==== CUSTOM ROLES ====

export const createCustomRoleSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  description: z.string().max(500).optional().nullable(),
  permissions: z.array(z.string()).min(1, "Selecione ao menos uma permissão"),
});

export type CreateCustomRoleInput = z.infer<typeof createCustomRoleSchema>;

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

// ==== MEMBERSHIP PERMISSIONS (individual overrides) ====

export const membershipPermissionOverrideSchema = z.object({
  permission_key: z.string().min(1),
  effect: z.enum(["grant", "deny"]),
});

export type MembershipPermissionOverrideInput = z.infer<typeof membershipPermissionOverrideSchema>;

export const updateMemberPermissionsSchema = z.object({
  overrides: z.array(membershipPermissionOverrideSchema),
});

export type UpdateMemberPermissionsInput = z.infer<typeof updateMemberPermissionsSchema>;

// ==== APPROVAL REQUESTS ====

export const createApprovalRequestSchema = z.object({
  request_type: z.enum(["promote_to_owner", "demote_owner", "remove_owner", "transfer_ownership"]),
  target_membership_id: z.string().uuid("Membro alvo inválido"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(2000),
});

export type CreateApprovalRequestInput = z.infer<typeof createApprovalRequestSchema>;

export const voteOnApprovalSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(1000).optional().nullable(),
});

export type VoteOnApprovalInput = z.infer<typeof voteOnApprovalSchema>;

// ==== AUDIT FILTERS ====

export const auditFilterSchema = z.object({
  user_id: z.string().uuid().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditFilterInput = z.infer<typeof auditFilterSchema>;

// ==== MEMBER FILTERS ====

export const memberFilterSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  department_id: z.string().uuid().optional(),
  status: z.enum(["active", "suspended"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemberFilterInput = z.infer<typeof memberFilterSchema>;
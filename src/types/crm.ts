export type CustomerType = "pf" | "pj";
export type CustomerStatus = "active" | "inactive";
export type LeadStatus = "open" | "won" | "lost" | "archived";
export type InteractionType = "call" | "message" | "email" | "meeting" | "note" | "other";

export interface Customer {
  id: string;
  organization_id: string;
  customer_type: CustomerType;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  primary_contact_name: string | null;
  source: string | null;
  category: string | null;
  notes: string | null;
  status: CustomerStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  organization_id: string;
  pipeline_id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  pipeline_id: string;
  stage_id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  source: string | null;
  interest: string | null;
  estimated_value: number | null;
  assigned_to: string | null;
  expected_return_at: string | null;
  status: LeadStatus;
  notes: string | null;
  converted_customer_id: string | null;
  converted_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  organization_id: string;
  customer_id: string | null;
  lead_id: string | null;
  type: InteractionType;
  description: string;
  created_by: string;
  occurred_at: string;
  created_at: string;
}

/** Lead enriched with its current stage for Kanban display */
export interface LeadWithStage extends Lead {
  stage: PipelineStage;
}
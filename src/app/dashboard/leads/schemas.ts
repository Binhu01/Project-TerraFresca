import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company_name: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  source: z.string().optional(),
  interest: z.string().optional(),
  estimated_value: z.number().positive().optional(),
  assigned_to: z.string().uuid().optional(),
  expected_return_at: z.string().datetime().optional(),
  notes: z.string().optional(),
  stage_id: z.string().uuid(),
});

export const updateLeadSchema = createLeadSchema.partial();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
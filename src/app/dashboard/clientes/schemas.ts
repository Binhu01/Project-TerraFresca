import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  customer_type: z.enum(["pf", "pj"] as const),
  document: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const digits = val.replace(/\D/g, "");
        return digits.length === 11 || digits.length === 14;
      },
      { message: "Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos" }
    ),
  email: z.string().email("E-mail inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  primary_contact_name: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"] as const),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
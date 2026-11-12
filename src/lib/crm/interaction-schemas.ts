import { z } from "zod";

export const createInteractionSchema = z
  .object({
    type: z.enum(["call", "message", "email", "meeting", "note", "other"]),
    description: z.string().min(1, "Description is required"),
    customerId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .refine((data) => Boolean(data.customerId) !== Boolean(data.leadId), {
    message: "Exactly one of customerId or leadId must be provided",
  });

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
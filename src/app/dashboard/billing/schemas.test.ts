import { describe, it, expect } from "vitest";
import {
 createPlanSchema,
 updatePlanSchema,
 createPlanVersionSchema,
 requestPlanChangeSchema,
 createSupportTicketSchema,
} from "./schemas";

describe("Billing Schemas", () => {
 // ===========================================================================
 // createPlanSchema
 // ===========================================================================
 describe("createPlanSchema", () => {
 const validInput = {
 slug: "pro-plan",
 name: "Plano Pro",
 monthly_price: 99.9,
 annual_price: 999.0,
 entitlements: [
 { feature_key: "team.users", is_enabled: true, limit_value: 10 },
 ],
 };

 it("deve validar entrada correta", () => {
 const result = createPlanSchema.safeParse(validInput);
 expect(result.success).toBe(true);
 });

 it("deve rejeitar slug inválido (caracteres especiais)", () => {
 const result = createPlanSchema.safeParse({ ...validInput, slug: "Pro Plan!" });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar slug vazio", () => {
 const result = createPlanSchema.safeParse({ ...validInput, slug: "" });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar preço mensal negativo", () => {
 const result = createPlanSchema.safeParse({ ...validInput, monthly_price: -10 });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar lista vazia de entitlements", () => {
 const result = createPlanSchema.safeParse({ ...validInput, entitlements: [] });
 expect(result.success).toBe(false);
 });

 it("deve aceitar valores opcionais como undefined", () => {
 const minimal = {
 slug: "free",
 name: "Grátis",
 monthly_price: 0,
 annual_price: 0,
 entitlements: [{ feature_key: "team.users", is_enabled: true }],
 };
 const result = createPlanSchema.safeParse(minimal);
 expect(result.success).toBe(true);
 });

 it("deve rejeitar trial_days acima de 365", () => {
 const result = createPlanSchema.safeParse({ ...validInput, trial_days: 400 });
 expect(result.success).toBe(false);
 });
 });

 // ===========================================================================
 // updatePlanSchema
 // ===========================================================================
 describe("updatePlanSchema", () => {
 it("deve aceitar objeto parcial", () => {
 const result = updatePlanSchema.safeParse({ name: "Novo Nome" });
 expect(result.success).toBe(true);
 });

 it("deve aceitar objeto vazio", () => {
 const result = updatePlanSchema.safeParse({});
 expect(result.success).toBe(true);
 });

 it("deve rejeitar nome muito curto", () => {
 const result = updatePlanSchema.safeParse({ name: "A" });
 expect(result.success).toBe(false);
 });
 });

 // ===========================================================================
 // createPlanVersionSchema
 // ===========================================================================
 describe("createPlanVersionSchema", () => {
 const validVersion = {
 plan_id: "550e8400-e29b-41d4-a716-446655440000",
 monthly_price: 149.9,
 annual_price: 1499.0,
 entitlements: [
 { feature_key: "crm.customers", is_enabled: true, limit_value: 500 },
 ],
 };

 it("deve validar entrada correta", () => {
 const result = createPlanVersionSchema.safeParse(validVersion);
 expect(result.success).toBe(true);
 });

 it("deve rejeitar UUID inválido", () => {
 const result = createPlanVersionSchema.safeParse({ ...validVersion, plan_id: "not-a-uuid" });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar entitlements vazios", () => {
 const result = createPlanVersionSchema.safeParse({ ...validVersion, entitlements: [] });
 expect(result.success).toBe(false);
 });
 });

 // ===========================================================================
 // requestPlanChangeSchema
 // ===========================================================================
 describe("requestPlanChangeSchema", () => {
 it("deve validar entrada mensal correta", () => {
 const result = requestPlanChangeSchema.safeParse({
 requested_plan_version_id: "550e8400-e29b-41d4-a716-446655440000",
 billing_interval: "monthly",
 });
 expect(result.success).toBe(true);
 });

 it("deve validar entrada anual correta", () => {
 const result = requestPlanChangeSchema.safeParse({
 requested_plan_version_id: "550e8400-e29b-41d4-a716-446655440000",
 billing_interval: "annual",
 });
 expect(result.success).toBe(true);
 });

 it("deve rejeitar billing_interval inválido", () => {
 const result = requestPlanChangeSchema.safeParse({
 requested_plan_version_id: "550e8400-e29b-41d4-a716-446655440000",
 billing_interval: "weekly",
 });
 expect(result.success).toBe(false);
 });
 });

 // ===========================================================================
 // createSupportTicketSchema
 // ===========================================================================
 describe("createSupportTicketSchema", () => {
 it("deve validar ticket correto", () => {
 const result = createSupportTicketSchema.safeParse({
 subject: "Erro na cobrança",
 description: "Minha fatura veio com valor incorreto neste mês.",
 priority: "high",
 });
 expect(result.success).toBe(true);
 });

 it("deve rejeitar assunto muito curto", () => {
 const result = createSupportTicketSchema.safeParse({
 subject: "Erro",
 description: "Descrição detalhada do problema encontrado.",
 });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar descrição muito curta", () => {
 const result = createSupportTicketSchema.safeParse({
 subject: "Erro na cobrança",
 description: "Curta",
 });
 expect(result.success).toBe(false);
 });

 it("deve aceitar sem prioridade (opcional)", () => {
 const result = createSupportTicketSchema.safeParse({
 subject: "Dúvida sobre plano",
 description: "Gostaria de saber mais sobre o plano Business.",
 });
 expect(result.success).toBe(true);
 });
 });
});
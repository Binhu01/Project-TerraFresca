import { describe, it, expect } from "vitest";
import {
 createSupplierSchema,
 updateSupplierSchema,
 createPurchaseOrderSchema,
 createReceiptSchema,
} from "./schemas";

describe("Compras Schemas", () => {
 // ===========================================================================
 // createSupplierSchema
 // ===========================================================================
 describe("createSupplierSchema", () => {
 const validSupplier = {
 name: "Fornecedor ABC Ltda",
 cnpj: "12.345.678/0001-90",
 email: "contato@abc.com.br",
 phone: "(11) 99999-0000",
 };

 it("deve validar fornecedor correto", () => {
 const result = createSupplierSchema.safeParse(validSupplier);
 expect(result.success).toBe(true);
 });

 it("deve rejeitar nome vazio", () => {
 const result = createSupplierSchema.safeParse({ ...validSupplier, name: "" });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar email inválido", () => {
 const result = createSupplierSchema.safeParse({ ...validSupplier, email: "nao-e-email" });
 expect(result.success).toBe(false);
 });

 it("deve aceitar email vazio como string literal", () => {
 const result = createSupplierSchema.safeParse({ ...validSupplier, email: "" });
 expect(result.success).toBe(true);
 });

 it("deve aceitar apenas campos obrigatórios", () => {
 const result = createSupplierSchema.safeParse({ name: "Fornecedor Simples" });
 expect(result.success).toBe(true);
 });
 });

 // ===========================================================================
 // updateSupplierSchema
 // ===========================================================================
 describe("updateSupplierSchema", () => {
 it("deve aceitar atualização parcial", () => {
 const result = updateSupplierSchema.safeParse({ phone: "(21) 98888-7777" });
 expect(result.success).toBe(true);
 });

 it("deve aceitar objeto vazio", () => {
 const result = updateSupplierSchema.safeParse({});
 expect(result.success).toBe(true);
 });
 });

 // ===========================================================================
 // createPurchaseOrderSchema
 // ===========================================================================
 describe("createPurchaseOrderSchema", () => {
 const validPO = {
 supplier_id: "550e8400-e29b-41d4-a716-446655440000",
 items: [
 {
 product_id: "660e8400-e29b-41d4-a716-446655440001",
 quantity: 10,
 unit_cost: 25.5,
 },
 ],
 };

 it("deve validar ordem de compra correta", () => {
 const result = createPurchaseOrderSchema.safeParse(validPO);
 expect(result.success).toBe(true);
 });

 it("deve rejeitar sem itens", () => {
 const result = createPurchaseOrderSchema.safeParse({ ...validPO, items: [] });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar quantidade zero ou negativa", () => {
 const result = createPurchaseOrderSchema.safeParse({
 ...validPO,
 items: [{ product_id: "660e8400-e29b-41d4-a716-446655440001", quantity: 0, unit_cost: 10 }],
 });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar custo unitário negativo", () => {
 const result = createPurchaseOrderSchema.safeParse({
 ...validPO,
 items: [{ product_id: "660e8400-e29b-41d4-a716-446655440001", quantity: 5, unit_cost: -1 }],
 });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar supplier_id inválido", () => {
 const result = createPurchaseOrderSchema.safeParse({ ...validPO, supplier_id: "invalid" });
 expect(result.success).toBe(false);
 });
 });

 // ===========================================================================
 // createReceiptSchema
 // ===========================================================================
 describe("createReceiptSchema", () => {
 const validReceipt = {
 purchase_order_id: "550e8400-e29b-41d4-a716-446655440000",
 items: [
 {
 purchase_order_item_id: "770e8400-e29b-41d4-a716-446655440002",
 quantity_received: 10,
 warehouse_id: "880e8400-e29b-41d4-a716-446655440003",
 },
 ],
 };

 it("deve validar recebimento correto", () => {
 const result = createReceiptSchema.safeParse(validReceipt);
 expect(result.success).toBe(true);
 });

 it("deve rejeitar sem itens recebidos", () => {
 const result = createReceiptSchema.safeParse({ ...validReceipt, items: [] });
 expect(result.success).toBe(false);
 });

 it("deve rejeitar quantidade recebida zero", () => {
 const result = createReceiptSchema.safeParse({
 ...validReceipt,
 items: [{
 purchase_order_item_id: "770e8400-e29b-41d4-a716-446655440002",
 quantity_received: 0,
 warehouse_id: "880e8400-e29b-41d4-a716-446655440003",
 }],
 });
 expect(result.success).toBe(false);
 });
 });
});
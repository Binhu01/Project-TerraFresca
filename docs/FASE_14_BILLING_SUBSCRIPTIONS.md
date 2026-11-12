# NEXORA FASE 14 — Planos, Assinaturas e Administração SaaS

## Visão Geral

Esta fase implementa a infraestrutura comercial completa da plataforma Nexora como SaaS multi-tenant: catálogo de planos com versionamento imutável, sistema de assinaturas recorrentes via Mercado Pago, enforcement de limites por entitlements, painel administrativo interno (Nexora Admin), tickets de suporte e logs de auditoria da plataforma.

## Arquitetura

### Separação de Ambientes Administrativos

| Ambiente | Acesso | Propósito |
|----------|--------|-----------|
| **Dashboard da Empresa** (`/dashboard/billing`) | OWNER/ADMIN da organização | Gerenciar assinatura, faturas, uso e suporte da própria empresa |
| **Nexora Admin** (`/admin/*`) | Platform Admins (tabela `platform_admins`) | Gerenciar todas as organizações, planos, suporte e auditoria da plataforma |

### Fluxo de Assinatura

```
Empresa se cadastra → Trial gratuito (14 dias) → Aprova pagamento no MP
→ Assinatura ativa → Webhook confirma → Entitlements liberados
→ Uso monitorado → Upgrade/Downgrade → Ciclo seguinte
```

### Estados da Assinatura

| Status | Descrição |
|--------|-----------|
| `trialing` | Período de teste gratuito |
| `active` | Pagamento confirmado, acesso total |
| `past_due` | Falha no pagamento, aguardando retry |
| `grace_period` | Carência após falha persistente |
| `paused` | Pausada pelo admin ou usuário |
| `canceled` | Cancelada definitivamente |
| `expired` | Trial expirou sem conversão |
| `incomplete` | Checkout iniciado mas não concluído |

## Banco de Dados (Migration 011)

### Tabelas Criadas (13)

| Tabela | Descrição |
|--------|-----------|
| `subscription_plans` | Catálogo de planos (FREE, PRO, BUSINESS) |
| `subscription_plan_versions` | Versões imutáveis com preços e trial |
| `plan_entitlements` | Limites e features por versão de plano |
| `billing_customers` | Mapeamento org → customer no MP |
| `subscriptions` | Assinaturas ativas com status e período |
| `subscription_events` | Timeline de eventos da assinatura |
| `subscription_invoices` | Faturas emitidas |
| `subscription_payment_events` | Eventos de pagamento idempotentes |
| `plan_changes` | Solicitações de upgrade/downgrade |
| `organization_usage_records` | Uso mensal por feature |
| `platform_admins` | Admins internos da Nexora |
| `platform_audit_logs` | Log imutável de operações admin |
| `support_tickets` | Tickets de suporte das empresas |

### Funções SECURITY DEFINER (5)

- `is_platform_admin()` — Verifica se o usuário é admin da plataforma
- `check_entitlement(p_org_id, p_feature_key)` — Retorna boolean de acesso
- `get_entitlement_limit(p_org_id, p_feature_key)` — Retorna limite numérico
- `log_platform_audit(...)` — Insere log de auditoria da plataforma
- `record_subscription_event(...)` — Registra evento na timeline da assinatura

## Arquivos Criados

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/011_billing_subscriptions_admin.sql` | Migration completa com tabelas, RLS, funções, seeds |
| `src/types/billing.ts` | Tipos TypeScript para todo o módulo billing |
| `src/lib/billing/entitlements.ts` | Serviço de verificação e enforcement de limites |
| `src/lib/billing/mercado-pago.ts` | Adaptador Mercado Pago para assinaturas SaaS |
| `src/app/api/billing/webhook/route.ts` | Endpoint webhook para eventos do MP |
| `src/app/dashboard/billing/actions.ts` | Server actions: catálogo, assinatura, admin, suporte |

### Frontend — Empresa

| Arquivo | Descrição |
|---------|-----------|
| `src/app/(public)/planos/page.tsx` | Página comercial com cards e tabela comparativa |
| `src/app/dashboard/billing/page.tsx` | Área "Minha Assinatura" com uso, faturas e histórico |

### Frontend — Nexora Admin

| Arquivo | Descrição |
|---------|-----------|
| `src/app/admin/layout.tsx` | Layout com navegação e verificação de acesso |
| `src/app/admin/page.tsx` | Dashboard com stats e distribuição de planos |
| `src/app/admin/organizacoes/page.tsx` | Lista de organizações com plano e status |
| `src/app/admin/planos/page.tsx` | Catálogo de planos com versões e preços |
| `src/app/admin/suporte/page.tsx` | Tickets de suporte com prioridade e status |
| `src/app/admin/audit/page.tsx` | Logs de auditoria da plataforma |

### Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/app/dashboard/shell.tsx` | Adicionados itens "Minha Assinatura" e "Admin" |

## Variáveis de Ambiente

```env
# Mercado Pago SaaS Billing (credenciais da Nexora como merchant)
MP_SAAS_ACCESS_TOKEN=APP_USR-xxxx...
MP_SAAS_WEBHOOK_SECRET=webhook-secret-here
MP_SAAS_API_URL=https://api.mercadopago.com  # opcional, default já configurado

# URL pública da aplicação
NEXT_PUBLIC_APP_URL=https://nexora.app
```

## Enforcement de Limites

O sistema de entitlements usa RPCs SECURITY DEFINER para garantir consistência:

```typescript
// Verificar se a feature está habilitada
const canUseAI = await hasEntitlement("ai.assistant");

// Obter limite numérico
const maxUsers = await getEntitlementLimit("team.users");

// Lançar erro se limite atingido
await enforceLimit("crm.customers", currentCustomerCount);

// Proteção especial para owners (mínimo 2 garantidos)
await validateOwnerProtection(targetPlanVersionId);
```

### Feature Keys Disponíveis

| Key | Descrição |
|-----|-----------|
| `team.users` | Usuários na equipe |
| `team.owners` | Proprietários (mínimo 2) |
| `crm.customers` | Clientes no CRM |
| `crm.leads` | Leads no funil |
| `sales.orders` | Pedidos por mês |
| `inventory.products` | Produtos cadastrados |
| `inventory.warehouses` | Depósitos |
| `finance.receivables` | Contas a receber |
| `finance.payables` | Contas a pagar |
| `reports.basic` | Relatórios básicos |
| `reports.advanced` | Relatórios avançados |
| `ai.assistant` | Assistente IA |
| `integrations.whatsapp` | Integração WhatsApp |
| `integrations.instagram` | Integração Instagram |
| `automations.rules` | Regras de automação |

## Webhook do Mercado Pago

Endpoint: `POST /api/billing/webhook`

Eventos processados:
- `payment` → Atualiza status da assinatura, registra fatura
- `subscription_preapproval` → Sincroniza status (authorized/paused/cancelled)

Idempotência garantida via constraint UNIQUE em `event_id`.

## Testes Obrigatórios (56 cenários)

### Catálogo de Planos
1. Listar planos ativos públicos
2. Ver detalhes com entitlements
3. Admin criar novo plano
4. Admin publicar nova versão de plano
5. Admin desativar plano
6. Versionamento preserva preços históricos

### Assinaturas
7. Criar assinatura com trial
8. Webhook confirma pagamento → status active
9. Webhook falha pagamento → status past_due
10. Upgrade imediato com cobrança proporcional
11. Downgrade no próximo ciclo
12. Cancelamento no fim do período
13. Reativação de assinatura cancelada
14. Pausa e retomada

### Entitlements
15. Feature habilitada retorna true
16. Feature desabilitada retorna false
17. Limite numérico respeitado
18. Limite ilimitado (0) permite tudo
19. Proteção de owners impede downgrade abaixo de 2
20. Usage record atualizado mensalmente

### Mercado Pago
21. Customer criado no MP ao iniciar checkout
22. Preapproval plan criado/reutilizado
23. Checkout URL gerada corretamente
24. Webhook signature verificada
25. Evento duplicado ignorado (idempotente)
26. Sync manual reconcilia status

### Nexora Admin
27. Dashboard mostra stats corretos
28. Lista organizações com filtro
29. Visualizar detalhes de assinatura
30. Alterar status manualmente
31. Criar/editar planos
32. Responder tickets de suporte
33. Audit log registra todas as ações
34. Acesso negado para não-admins

### Página Comercial
35. Cards exibem preços e features
36. Tabela comparativa completa
37. CTA direciona para signup
38. Plano destacado visualmente

### Minha Assinatura
39. Exibe status e dados do plano
40. Barras de uso com alertas
41. Faturas listadas com status
42. Timeline de eventos
43. Ticket de suporte criado
44. Sem assinatura mostra CTA

### Segurança
45. RLS impede acesso cross-org
46. Platform admin requer `platform_admins`
47. Mutação requer role OWNER/ADMIN
48. Webhook rejeita assinatura inválida
49. Audit log é append-only
50. Tokens MP nunca expostos no client

### Edge Cases
51. Org sem assinatura acessa página billing
52. Trial expira sem pagamento
53. Múltiplos webhooks simultâneos
54. Plano inativo não aparece publicamente
55. Owner protection com 3+ owners
56. Concurrent plan change requests bloqueadas

## Próximos Passos (Fora do Escopo da Fase 14)

- Integração real com Mercado Pago (testes em sandbox)
- Email transacional para faturas e alertas
- Portal do cliente para autoatendimento
- Métricas de MRR/ARR/churn
- API REST para integrações externas
- Otimização de performance e caching
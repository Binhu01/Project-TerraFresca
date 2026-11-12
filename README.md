# Nexora — Plataforma SaaS Multi-Tenant para PMEs Brasileiras

Nexora é uma plataforma completa de gestão empresarial (ERP + CRM) desenvolvida com **Next.js 16**, **Supabase** e **TypeScript**, projetada para micro, pequenas e médias empresas brasileiras.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend | Supabase (Auth, Database, RLS, Edge Functions) |
| Linguagem | TypeScript strict mode |
| Validação | Zod schemas em todos os server actions |
| Pagamentos | Mercado Pago (clientes + billing SaaS) |
| IA | Anthropic Claude API (assistente inteligente) |
| Mobile | React Native + Expo SDK 52 |
| Deploy | Vercel (web) + EAS Build (mobile) |

## Fases Implementadas

### ✅ Fase 01 — Fundação & Autenticação
- Auth multi-tenant com Supabase SSR
- Criação de organizações e memberships
- Middleware de proteção de rotas
- Onboarding guiado

### ✅ Fase 02 — CRM (Clientes, Leads & Pipeline)
- CRUD completo de clientes com timeline de interações
- Gestão de leads com pipeline Kanban
- Conversão lead → cliente
- Interações: notas, ligações, emails, reuniões

### ✅ Fase 03 — Vendas (Pedidos, Orçamentos & Canais)
- Catálogo de produtos integrado a pedidos
- Orçamentos com conversão para pedido
- Canais de venda (loja física, online, WhatsApp, etc.)
- Status flow: draft → confirmed → preparing → delivered

### ✅ Fase 04 — Produtos & Estoque
- Cadastro de produtos com SKU, preço de custo/venda
- Múltiplos depósitos/warehouses
- Ajustes de estoque (entrada/saída/perda)
- Transferências entre depósitos
- Saldo disponível = quantity_on_hand - quantity_reserved

### ✅ Fase 05 — Financeiro (Contas, Recebíveis, Pagáveis)
- Contas financeiras múltiplas
- Contas a receber e a pagar
- Registro de pagamentos e recebimentos
- Fluxo de caixa projetado
- Categorias financeiras hierárquicas
- Transações com conciliação

### ✅ Fase 06 — Compras & Fornecedores
- Cadastro de fornecedores
- Ordens de compra com itens
- Recebimento parcial e total
- Integração com estoque (entrada automática)

### ✅ Fase 07 — Equipe, Permissões & Auditoria
- Departamentos e cargos profissionais
- Convites por email com token seguro
- Matriz de permissões granular (~60 permissões)
- Roles customizáveis com herança
- Overrides individuais (grant/deny)
- Aprovações multi-owner para operações críticas
- Audit log imutável

### ✅ Fase 08 — Business Intelligence & Relatórios
- Views materializadas no Supabase
- Dashboard financeiro consolidado
- Relatórios de vendas, estoque, CRM
- Exportação para Excel/CSV

### ✅ Fase 09 — Tarefas, Agenda & Notificações
- Sistema de tarefas com prioridade e prazo
- Calendário integrado
- Notificações in-app
- Kanban board

### ✅ Fase 10 — Inteligência Artificial
- Assistente IA com streaming SSE
- Tool-use para consultar dados da plataforma
- Configurações admin (limites, roles permitidas)
- Histórico de conversas por organização

### ✅ Fase 11 — App Mobile (React Native + Expo)
- Dashboard mobile com métricas em tempo real
- Navegação por abas (Home, Vendas, Clientes, Tarefas, Mais)
- Auth compartilhado com web app
- Tema claro/escuro

### ✅ Fase 12 — Integração Mercado Pago (Clientes)
- Checkout transparente para vendas
- Webhook de confirmação de pagamento
- Conciliação automática com pedidos

### ✅ Fase 13 — Planos, Assinaturas & Administração SaaS
- Catálogo de planos com versionamento imutável (FREE/PRO/BUSINESS)
- Sistema de entitlements com enforcement via RPC
- Assinaturas recorrentes via Mercado Pago
- Webhook idempotente para eventos de pagamento
- Página comercial `/planos` com tabela comparativa
- Área "Minha Assinatura" com uso, faturas e histórico
- Painel Nexora Admin (`/admin/*`) completo
- Tickets de suporte
- Audit log da plataforma
- Proteção de owners (mínimo 2 garantidos)

## Estrutura do Projeto

```
src/
├── app/
│   ├── (public)/          # Rotas públicas (landing, planos)
│   ├── admin/             # Painel Nexora Admin (platform admins)
│   ├── api/               # API routes (webhooks, AI chat)
│   ├── auth/              # Login, cadastro, onboarding
│   └── dashboard/         # App principal (multi-tenant)
│       ├── billing/       # Minha Assinatura
│       ├── clientes/      # CRM
│       ├── compras/       # Compras & Fornecedores
│       ├── equipe/        # Equipe, Permissões, Auditoria
│       ├── estoque/       # Produtos & Estoque
│       ├── financeiro/    # Contas, Recebíveis, Pagáveis
│       ├── intelligence/  # Assistente IA
│       ├── relatorios/    # BI & Relatórios
│       ├── tarefas/       # Tarefas & Agenda
│       └── vendas/        # Pedidos, Orçamentos, Canais
├── lib/
│   ├── ai/                # Provider Anthropic + tools
│   ├── billing/           # Entitlements + Mercado Pago adapter
│   ├── crm/               # Conversão + interações
│   ├── supabase/          # Client SSR + middleware
│   ├── organizations.ts   # Context helpers
│   └── permissions.ts     # Authorization service
└── types/                 # TypeScript interfaces por módulo

supabase/migrations/
├── 001_initial_schema.sql
├── 002_crm_schema.sql
├── 003_sales_schema.sql
├── 004_inventory_schema.sql
├── 005_financial_schema.sql
├── 006_team_permissions.sql
├── 007_bi_views.sql
├── 008_purchases_schema.sql
├── 009_tasks_calendar_notifications.sql
├── 010_ai_intelligence.sql
└── 011_billing_subscriptions_admin.sql

apps/mobile/               # React Native + Expo
docs/                      # Documentação por fase
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e configure:

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Nexora

# Mercado Pago SaaS Billing (obrigatório para assinaturas)
MP_SAAS_ACCESS_TOKEN=APP_USR-xxxx...
MP_SAAS_WEBHOOK_SECRET=webhook-secret

# Anthropic AI (obrigatório para assistente IA)
ANTHROPIC_API_KEY=sk-ant-xxxx...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar migrations
supabase db push

# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Segurança

- **RLS (Row Level Security)** em todas as tabelas tenant-scoped
- **SECURITY DEFINER** functions com `SET search_path = public`
- **Zod validation** em todos os server actions de mutação
- **Middleware** protege `/dashboard/*` e `/admin/*`
- **Platform Admin** separado de org OWNER/ADMIN
- **Audit logs** imutáveis para todas as operações críticas
- **Webhook signature verification** para Mercado Pago
- **Idempotência** via constraints UNIQUE em payment events

## Licença

Proprietário — Todos os direitos reservados.
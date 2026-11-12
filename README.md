# Nexora

**Gestão que impulsiona.**

Plataforma SaaS de gestão empresarial e CRM para pequenas e médias empresas.

## Tecnologias

- **Framework:** Next.js 16 com App Router
- **Linguagem:** TypeScript (strict mode)
- **Estilização:** Tailwind CSS v4
- **Backend/Auth:** Supabase (PostgreSQL + Auth)
- **Validação:** Zod + React Hook Form
- **Ícones:** Lucide React
- **Componentes:** shadcn/ui (preparado)

## Requisitos

- Node.js 20+
- npm ou pnpm
- Conta no [Supabase](https://supabase.com)

## Instalação

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
```

## Configuração do Supabase

1. Crie um novo projeto em [supabase.com](https://supabase.com/dashboard)
2. No SQL Editor, execute o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Copie as credenciais do projeto:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (apenas server-side)
4. Preencha o arquivo `.env.local` com os valores reais

### Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (server-only) | Para operações admin |
| `NEXT_PUBLIC_APP_URL` | URL da aplicação | Não (default: localhost:3000) |

## Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Verificar tipos TypeScript
npm run type-check

# Executar lint
npm run lint

# Build de produção
npm run build
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── page.tsx           # Página pública inicial
│   ├── login/             # Tela de login
│   ├── cadastro/          # Tela de cadastro
│   └── dashboard/         # Área autenticada
│       ├── layout.tsx     # Layout com sidebar
│       └── page.tsx       # Dashboard inicial
├── lib/
│   └── supabase/          # Clientes Supabase
│       ├── client.ts      # Browser client
│       ├── server.ts      # Server client
│       └── middleware.ts  # Session management
├── types/                 # Tipos compartilhados
│   └── database.ts        # Interfaces do banco
└── middleware.ts          # Route protection

supabase/
├── functions/             # Edge Functions (Deno)
│   ├── criar-pagamento/
│   └── pagamento-webhook/
└── migrations/            # Migrações SQL
    └── 001_initial_schema.sql
```

## Estado Atual (Fase 01 — Fundação)

### ✅ Implementado
- Aplicação Next.js estruturada com App Router
- Identidade visual Nexora aplicada (paleta, tipografia Montserrat + Inter)
- Página pública institucional com slogan e CTAs
- Telas de login e cadastro com validação Zod + React Hook Form
- Integração preparada com Supabase Auth
- Middleware de proteção de rotas
- Layout autenticado com sidebar responsiva e navegação
- Dashboard de boas-vindas
- Schema SQL multi-tenant (profiles, organizations, memberships)
- Políticas RLS para isolamento de dados por organização
- Trigger para criação automática de perfil no signup
- Tipos TypeScript para entidades do banco
- Variáveis de ambiente documentadas

### ⏳ Pendente (Próximas Fases)
- Onboarding completo de criação de organização
- Módulos de CRM (clientes, leads)
- Vendas, pedidos e orçamentos
- Produtos e estoque
- Financeiro
- Fornecedores e compras
- Gestão de equipe e permissões avançadas
- Relatórios e indicadores
- Tema escuro
- Aplicativo mobile (React Native / Expo)

## Segurança

- **RLS ativo** em todas as tabelas empresariais
- **Service role key** nunca exposta no navegador
- **Middleware** redireciona usuários não autenticados
- **Validação Zod** em todos os formulários
- **Tokens JWT** gerenciados pelo Supabase Auth

## Licença

Proprietário — Todos os direitos reservados © Nexora.
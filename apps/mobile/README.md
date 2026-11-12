# Nexora Mobile

Aplicativo oficial da Nexora para Android e iOS, desenvolvido com React Native e Expo.

## Tecnologias

- **Framework:** React Native + Expo SDK 52
- **Navegação:** Expo Router 4
- **Linguagem:** TypeScript (strict mode)
- **Backend/Auth:** Supabase (mesmo projeto da versão Web)
- **Estado:** TanStack Query v5
- **Armazenamento seguro:** Expo SecureStore
- **Notificações:** Expo Notifications
- **Validação:** Zod
- **Build:** EAS Build

## Requisitos

- Node.js 20+
- npm ou pnpm
- Conta no [Supabase](https://supabase.com) (mesmo projeto da Nexora Web)
- Conta na [Expo](https://expo.dev) para builds com EAS
- Android Studio (para build local Android) ou Xcode (para build local iOS)

## Instalação

```bash
cd apps/mobile

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
```

Preencha `.env.local` com as mesmas credenciais Supabase usadas pela Nexora Web:

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave anônima (anon key) do Supabase |

> ⚠️ **Nunca** coloque `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` ou qualquer segredo de provedor externo nas variáveis `EXPO_PUBLIC_*`.

## Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npx expo start

# Executar no Android (requer emulador ou dispositivo conectado)
npx expo run:android

# Executar no iOS (requer simulador ou dispositivo conectado, macOS apenas)
npx expo run:ios
```

### Verificações

```bash
# TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Diagnóstico do Expo
npx expo-doctor
```

## Estrutura do Projeto

```
apps/mobile/
├── src/
│   ├── app/                  # Expo Router (file-based routing)
│   │   ├── _layout.tsx       # Layout raiz (providers, auth gate)
│   │   ├── login.tsx         # Tela de login
│   │   ├── select-org.tsx    # Seleção de organização
│   │   └── (tabs)/           # Navegação por abas
│   │       ├── _layout.tsx   # Configuração das tabs
│   │       ├── index.tsx     # Dashboard
│   │       ├── clientes.tsx  # Clientes
│   │       ├── vendas.tsx    # Vendas/Pedidos
│   │       ├── tarefas.tsx   # Tarefas
│   │       └── mais.tsx      # Menu secundário
│   ├── contexts/
│   │   ├── auth-context.tsx  # Autenticação + sessão + organizações
│   │   └── theme-context.tsx # Tokens de identidade visual Nexora
│   └── lib/
│       └── supabase.ts       # Cliente Supabase com SecureStore
├── assets/                   # Ícones, splash screen, imagens
├── app.json                  # Configuração do Expo
├── eas.json                  # Perfis de build EAS
├── tsconfig.json             # TypeScript config
├── package.json              # Dependências
└── .env.example              # Template de variáveis de ambiente
```

## Telas Implementadas

| Tela | Descrição |
|------|-----------|
| Login | Autenticação com e-mail/senha via Supabase Auth |
| Seleção de Organização | Escolha da empresa ativa (multi-tenant) |
| Dashboard | Indicadores: pedidos, clientes, leads, estoque, financeiro, tarefas |
| Clientes | Listagem com busca, detalhes, status ativo/inativo |
| Vendas | Pedidos recentes com status e valores |
| Tarefas | Minhas tarefas pendentes com prioridade e prazo |
| Mais | Acesso a Leads, Produtos, Estoque, Compras, Financeiro, Agenda, Relatórios, Intelligence, Configurações |

## Integração com Supabase

O app consome o **mesmo banco de dados e RLS** da Nexora Web:

- Autenticação via `supabase.auth` (email/password)
- Sessão persistida no SecureStore (tokens seguros)
- Todas as consultas filtradas por `organization_id` da organização ativa
- Permissões aplicadas via RLS no banco — o app nunca contorna regras de acesso
- Troca de organização limpa cache e recarrega dados

## Notificações Push

Configurado com `expo-notifications`:

- Solicita permissão ao usuário
- Registra token do dispositivo vinculado ao usuário autenticado
- Funciona em foreground, background e app fechado (com build de desenvolvimento real)
- Deep links abrem o registro correspondente ao tocar na notificação

> ⚠️ Expo Go **não** suporta push notifications em SDKs recentes. Use development builds (`eas build --profile development`) para testar.

## Builds com EAS

### Development (testes internos)

```bash
npx eas build --profile development --platform android
npx eas build --profile development --platform ios
```

### Preview (APK / TestFlight interno)

```bash
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios
```

### Production

```bash
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
```

> Configure `projectId` em `app.json` com o ID do seu projeto EAS (`npx eas init`).

## Identificadores dos Apps

| Plataforma | Bundle ID / Package | Configurável em |
|------------|---------------------|-----------------|
| Android | `com.nexora.app` | `app.json` → `android.package` |
| iOS | `com.nexora.app` | `app.json` → `ios.bundleIdentifier` |

> ⚠️ Verifique a disponibilidade dos identificadores nas lojas antes de publicar. Os valores atuais são placeholders.

## Segurança

- Tokens armazenados exclusivamente no SecureStore (nunca em AsyncStorage ou localStorage)
- Nenhuma credencial administrativa (`service_role`) no app
- Toda operação sensível validada por RLS no Supabase
- Deep links protegidos contra redirecionamentos não autorizados
- Logs sem dados sensíveis ou tokens

## Pendências Externas

- [ ] Criar conta EAS e configurar `projectId`
- [ ] Gerar ícone e splash screen oficiais (substituir placeholders)
- [ ] Configurar deep links no Supabase Auth (redirect URLs)
- [ ] Configurar serviço de push no Supabase Edge Functions
- [ ] Contas de desenvolvedor Google Play e Apple Developer para publicação
- [ ] Certificados de assinatura Android e iOS

## Funcionalidades Somente na Web

As seguintes funcionalidades permanecem exclusivas da versão Web nesta fase:

- Administração de equipe e permissões avançadas
- Configurações de integrações externas
- Motor de automações
- Auditoria completa
- Relatórios exportáveis
- Nexora Intelligence (chat completo — acessível via menu "Mais" mas com interface simplificada)
- Gestão financeira avançada (contas, categorias, fluxo de caixa detalhado)
# 🌿 Terra Fresca

Marketplace que conecta produtores de assentamentos agroecológicos a consumidores urbanos — várias lojas parceiras reunidas num só lugar, com carrinho, pedidos, pagamento, avaliações e um painel próprio para cada papel (comprador, vendedor e administrador).

Projeto nascido como um site institucional estático e evoluído, ao longo do desenvolvimento, para uma aplicação completa com backend real (Supabase), autenticação, banco de dados com regras de segurança de verdade (Row Level Security) e três painéis distintos.

---

## Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Papéis de usuário](#papéis-de-usuário)
- [Como rodar localmente](#como-rodar-localmente)
- [Configuração do Supabase](#configuração-do-supabase)
- [Segurança](#segurança)
- [Identidade visual](#identidade-visual)
- [Deploy](#deploy)
- [Limitações conhecidas e próximos passos](#limitações-conhecidas-e-próximos-passos)
- [Autor](#autor)

---

## Sobre o projeto

O Terra Fresca reúne três lojas parceiras — **Vida Pura**, **Da Terra** e **BotaniCare** — numa mesma plataforma, com carrinho de compras unificado (um comprador pode levar produtos de mais de uma loja no mesmo pedido). O site institucional (Tela Inicial, Sobre, Serviços, Contato) apresenta o projeto; o cardápio de cada loja é onde a compra acontece de fato.

Não existe backend próprio em Node/Python — toda a lógica de servidor (autenticação, banco de dados, regras de negócio sensíveis, upload de arquivo, e-mail transacional) roda em cima do **Supabase**, usando Postgres, Row Level Security e Edge Functions.

## Funcionalidades

- **Cadastro e login** — e-mail/senha e login social (Google e GitHub ativos na tela; Facebook e LinkedIn configurados no Supabase, mas com o botão retirado da interface)
- **Catálogo de produtos dinâmico** — cada loja busca seus próprios produtos direto do banco, com favoritos e média de avaliação exibidos no card
- **Carrinho persistente** — salvo por usuário no banco, não se perde ao fechar a aba, e é o mesmo carrinho nas três lojas
- **Favoritos** — com uma página própria (`/favoritos`) reunindo tudo que foi salvo, de qualquer loja
- **Pedidos** — criados por uma função de banco (`finalizar_pedido`) que recalcula o preço de cada item no momento da compra, ignorando qualquer valor vindo do navegador
- **Pagamento** — hoje simulado (sorteio local de aprovação/recusa, sem gateway real); há uma integração com **Mercado Pago** já implementada (Edge Functions + webhook) que pode ser reativada quando a conta do Mercado Pago estiver disponível — veja [Limitações conhecidas](#limitações-conhecidas-e-próximos-passos)
- **Cupom de desconto** — código percentual ou fixo, com limite de uso, validade e possibilidade de restringir a uma loja específica
- **Cálculo de frete** — valor configurável por loja, somado por loja presente no pedido (um pedido com itens de duas lojas paga o frete das duas)
- **Avaliações de produto** — só é possível avaliar um produto de um pedido já marcado como **entregue**, regra aplicada no próprio banco
- **Painel do Vendedor** (`/painel`) — CRUD de produtos com upload de imagem de verdade (Supabase Storage), controle de estoque, e visão dos pedidos que contêm produtos da própria loja
- **Painel Administrativo** (`/admin`) — dashboard de vendas com gráficos (Chart.js), gestão de vendedores (busca por e-mail, vincula a uma loja), visão e alteração de status de todos os pedidos, e gestão de cupons/frete
- **Política de Privacidade e Termos de Uso** (`/privacidade`) — conteúdo real orientado à LGPD

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end (site institucional e páginas utilitárias) | HTML, CSS e JavaScript puros (sem framework) |
| Front-end (cardápio das lojas) | Tailwind CSS (compilado via CLI) |
| Backend / banco de dados | [Supabase](https://supabase.com) — Postgres, Auth, Storage, Edge Functions, Row Level Security |
| Pagamento (integrado, hoje pausado) | Mercado Pago (Checkout Pro) |
| Gráficos | Chart.js |
| Ícones | Font Awesome |
| Fontes | Rye, Bevan e Work Sans (Google Fonts) |
| Hospedagem sugerida | Netlify (deploy estático, sem build) |

## Estrutura de pastas:

```
Project-TerraFresca-main/
├── index.html              # redireciona para main.html (hospedagens esperam index.html na raiz)
├── main.html, sobre.html, servicos.html, contato.html
├── css/style.css           # estilo do site institucional (identidade "cordel/xilogravura")
├── js/
│   ├── supabase-client.js  # instância única do cliente Supabase, usada em todo o site
│   ├── auth-nav.js         # troca "Fazer Login" por menu do usuário conforme a sessão
│   ├── main.js              # abrir/fechar menu mobile
│   └── interacoes.js        # animações de entrada/rolagem do site institucional
├── login/                  # tela de login/cadastro (e-mail/senha + social)
├── cardapio/                # as 3 lojas (Tailwind) + carrinho + avaliação + favoritos no card
│   ├── vidapura.html, daterra.html, botanicare.html
│   ├── produtos.js           # busca produtos, favoritos e avaliações do banco
│   ├── script.js             # carrinho, cupom, frete e checkout
│   └── assets/                # imagens dos produtos "de fábrica"
├── painel/                  # painel do vendedor
├── admin/                    # painel administrativo
├── favoritos/, pedidos/     # páginas do comprador
├── privacidade/              # Política de Privacidade e Termos de Uso
├── supabase/functions/      # Edge Functions (integração Mercado Pago)
└── package.json
```

## Papéis de usuário:

O sistema tem três papéis, todos usando a **mesma tabela de login** — o que diferencia é a presença de uma linha nas tabelas de controle:

| Papel | Como se torna | O que pode fazer |
|---|---|---|
| **Comprador** | Qualquer cadastro novo | Comprar, favoritar, avaliar produtos recebidos, ver o próprio histórico |
| **Vendedor** | Um admin vincula o usuário a uma loja (tabela `vendedores`) | Cadastrar/editar produtos da própria loja, ver os pedidos que contêm produtos dela |
| **Administrador** | Inserido manualmente na tabela `admins` (passo único, feito direto no SQL Editor) | Tudo do vendedor + gerenciar todas as lojas, todos os pedidos, cupons e frete |


## Configuração do Supabase:

O projeto depende de várias tabelas, funções e políticas de segurança criadas via SQL, na seguinte ordem lógica (migrações não versionadas neste repositório como arquivo — foram aplicadas diretamente pelo SQL Editor do Supabase ao longo do desenvolvimento):

1. **Produtos** — tabela `produtos`, leitura pública
2. **Vendedores** — tabela `vendedores`, liga um usuário a uma loja; libera CRUD de produto só pra quem é dono da loja
3. **Carrinho e Favoritos** — tabelas `carrinho_itens` e `favoritos`, cada uma só visível/editável pelo próprio dono
4. **Pedidos e Pagamentos** — tabelas `pedidos`, `pedido_itens`, `pagamentos`; gatilho que dá baixa de estoque automaticamente quando um pagamento é aprovado
5. **Administração** — tabela `profiles` (espelha o e-mail do usuário), tabela `admins`, função `is_admin()`
6. **Avaliações** — tabela `avaliacoes`, com regra de que só quem tem pedido **entregue** daquele produto pode avaliar
7. **Storage de imagens** — bucket `produtos` (público para leitura; upload restrito ao vendedor daquela loja)
8. **Segurança do checkout** — função `finalizar_pedido()`, que recalcula o preço de cada item no banco (não confia no navegador) e é o único ponto de criação de pedido
9. **Cupom e Frete** — tabelas `cupons` e `config_frete`, e a função `validar_cupom()`; `finalizar_pedido()` foi atualizada para calcular frete por loja e aplicar cupom
10. *(Opcional, pausado)* **Mercado Pago** — Edge Functions em `supabase/functions/` (`criar-pagamento` e `pagamento-webhook`), que criam a cobrança e recebem a confirmação de pagamento

## Segurança:

Pontos que valem destaque, porque não são óbvios:

- **RLS em todas as tabelas.** Nenhuma tabela depende só da interface para proteger dados — cada política é aplicada pelo próprio Postgres.
- **Preço nunca vem do navegador.** A criação de pedido passa exclusivamente pela função `finalizar_pedido`, que lê o preço, o frete e valida o cupom direto do banco no momento da compra — o cliente só manda `produto_id` e `quantidade`.
- **`pagamentos` não aceita insert direto do navegador** quando o pagamento real (Mercado Pago) está ativo — só o webhook, autenticado com a chave de serviço, pode gravar um pagamento aprovado. (Hoje, com o pagamento simulado reativado como solução temporária, essa política foi temporariamente reaberta — ver `12_reverter_para_simulado.sql` no histórico do projeto.)
- **Funções `SECURITY DEFINER` usadas com parcimônia** — só onde um usuário comum precisa de um resultado (ex: saber se é admin, validar um cupom) sem ter permissão de leitura direta na tabela envolvida.

## Identidade visual:

O site institucional, o cardápio e a tela de login seguem uma identidade inspirada em **xilogravura e literatura de cordel** — traço grosso, sombra sólida deslocada (ao invés de sombra suave desfocada), tipografia entalhada (Rye e Bevan) — como uma extensão natural da logo original do projeto, que já é uma gravura em madeira. Mantém a paleta de cores original (verde-mata, nude, mel).

> Os painéis internos (Vendedor, Admin, Meus Pedidos, Favoritos) ainda não receberam essa mesma reforma visual — veja a próxima seção.

## Deploy

O projeto está pronto para hospedagem estática (sem build):

1. Extraia a pasta do projeto.
2. Arraste a pasta (não o zip) para [app.netlify.com/drop](https://app.netlify.com/drop).
3. Adicione a URL gerada em **Authentication → URL Configuration** no Supabase (Site URL e Redirect URLs).

## Limitações conhecidas e próximos passos

- **Mercado Pago está pausado.** A integração (Edge Functions + webhook) já está implementada, mas a criação da aplicação no painel de desenvolvedor do Mercado Pago ficou travada por um erro do lado deles. O checkout está, por enquanto, revertido para pagamento simulado.
- **"Loja" ainda é um valor fixo** (`vidapura`, `daterra`, `botanicare` como *enum*), não uma tabela própria. Transformar isso numa tabela `lojas` de verdade é o que destravaria o modelo de vender essa base para múltiplos produtores diferentes.
- **Painéis internos com identidade visual antiga** — Painel do Vendedor, Admin, Meus Pedidos e Favoritos ainda usam o visual anterior (cantos arredondados, sombra suave), enquanto o site institucional, o login e o cardápio já foram atualizados para a identidade "cordel".
- **Sem notificação por e-mail** — mudanças de status de pedido só são visíveis entrando em "Meus Pedidos".
- **Vendedor não altera status do próprio pedido** — hoje isso é exclusivo do admin, porque um mesmo pedido pode conter itens de mais de uma loja (carrinho unificado).

## Autor

Desenvolvido por **Glauber Luigi**.

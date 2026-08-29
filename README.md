## Terra Fresca

Marketplace criado para conectar produtores de assentamentos agroecológicos a consumidores urbanos.

A plataforma reúne diferentes lojas em um só lugar, permitindo que o usuário navegue pelos produtos, adicione itens ao carrinho, faça pedidos, avalie produtos e acompanhe suas compras.

O projeto começou como um site institucional e evoluiu para uma aplicação completa, com autenticação, banco de dados, pagamentos, controle de usuários e painéis para compradores, vendedores e administradores.

##Funcionalidades:

Cadastro e login com e-mail e redes sociais
Catálogo de produtos
Carrinho de compras compartilhado entre as lojas
Favoritos
Sistema de pedidos
Cupons de desconto
Cálculo de frete por loja
Avaliação de produtos
Painel do vendedor
Painel administrativo
Controle de estoque
Upload de imagens
Política de Privacidade e Termos de Uso

Atualmente, o pagamento está simulado, mas a integração com o Mercado Pago já foi desenvolvida.

## Tecnologias:
HTML, CSS e JavaScript
Tailwind CSS
Supabase
PostgreSQL
Authentication
Storage
Edge Functions
Row Level Security (RLS)
Chart.js
Font Awesome
Mercado Pago

📁 Estrutura
TerraFresca/
├── index.html
├── main.html
├── sobre.html
├── servicos.html
├── contato.html
├── css/
├── js/
├── login/
├── cardapio/
├── painel/
├── admin/
├── favoritos/
├── pedidos/
├── privacidade/
├── supabase/
└── package.json
## Tipos de usuário:

Comprador

Compra produtos
Adiciona favoritos
Avalia produtos recebidos
Acompanha seus pedidos

Vendedor

Gerencia os produtos da própria loja
Controla estoque
Visualiza pedidos relacionados à sua loja

## Segurança:

O projeto utiliza Row Level Security (RLS) para controlar o acesso aos dados diretamente no banco.

O checkout também não confia nos preços enviados pelo navegador. O banco recalcula os valores, frete e descontos no momento da criação do pedido.

## Identidade visual:

A identidade do Terra Fresca foi inspirada em xilogravura e literatura de cordel, utilizando elementos como traços marcantes, sombras sólidas e tipografias inspiradas em madeira entalhada.

A proposta busca conectar a estética do projeto com a cultura e a origem dos produtores.

##📌 Próximos Passos:

Ativar o pagamento real com Mercado Pago
Criar uma estrutura própria para as lojas
Atualizar o visual dos painéis internos
Adicionar notificações por e-mail
Permitir que vendedores atualizem o status dos pedidos
👨‍💻 Autor

##Desenvolvido por Glauber Luigi.

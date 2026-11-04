-- ============================================================
-- TERRA FRESCA — Schema completo do Supabase (unificado)
-- Execute no SQL Editor para configurar ou recriar o ambiente.
-- Idempotente: seguro para reexecução.
-- ============================================================

-- 1. VENDEDORES (base para RLS das demais tabelas)
CREATE TABLE IF NOT EXISTS vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loja TEXT NOT NULL CHECK (loja IN ('vidapura', 'daterra', 'botanicare')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, loja)
);

ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê apenas suas próprias lojas" ON vendedores;
CREATE POLICY "Usuário vê apenas suas próprias lojas"
    ON vendedores FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 2. PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja TEXT NOT NULL CHECK (loja IN ('vidapura', 'daterra', 'botanicare')),
    categoria TEXT NOT NULL DEFAULT 'produtos' CHECK (categoria IN ('produtos', 'bebidas')),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL,
    imagem TEXT NOT NULL,
    estoque INTEGER NOT NULL DEFAULT 100,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (loja, nome)
);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Produtos são públicos para leitura" ON produtos;
CREATE POLICY "Produtos são públicos para leitura"
    ON produtos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendedor pode cadastrar produto da própria loja" ON produtos;
CREATE POLICY "Vendedor pode cadastrar produto da própria loja"
    ON produtos FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = produtos.loja));

DROP POLICY IF EXISTS "Vendedor pode editar produto da própria loja" ON produtos;
CREATE POLICY "Vendedor pode editar produto da própria loja"
    ON produtos FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = produtos.loja))
    WITH CHECK (EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = produtos.loja));

DROP POLICY IF EXISTS "Vendedor pode apagar produto da própria loja" ON produtos;
CREATE POLICY "Vendedor pode apagar produto da própria loja"
    ON produtos FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = produtos.loja));

-- 3. PEDIDOS — Policies de visibilidade para vendedores
DROP POLICY IF EXISTS "Vendedor vê itens da própria loja" ON pedido_itens;
CREATE POLICY "Vendedor vê itens da própria loja"
    ON pedido_itens FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = pedido_itens.loja));

DROP POLICY IF EXISTS "Vendedor vê pedidos com itens da própria loja" ON pedidos;
CREATE POLICY "Vendedor vê pedidos com itens da própria loja"
    ON pedidos FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pedido_itens pi
        JOIN vendedores v ON v.loja = pi.loja
        WHERE pi.pedido_id = pedidos.id AND v.user_id = auth.uid()
    ));

-- 4. PEDIDO_LOJA_STATUS — Status individual por loja dentro de cada pedido
CREATE TABLE IF NOT EXISTS pedido_loja_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    loja TEXT NOT NULL CHECK (loja IN ('vidapura', 'daterra', 'botanicare')),
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'pago', 'enviado', 'entregue', 'cancelado')),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pedido_id, loja)
);

CREATE INDEX IF NOT EXISTS idx_pedido_loja_status_pedido ON pedido_loja_status(pedido_id);

ALTER TABLE pedido_loja_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendedores_leem_status_propria_loja" ON pedido_loja_status;
CREATE POLICY "vendedores_leem_status_propria_loja"
    ON pedido_loja_status FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pedido_itens pi
        WHERE pi.pedido_id = pedido_loja_status.pedido_id
        AND pi.loja = pedido_loja_status.loja
        AND pi.loja IN (SELECT loja FROM vendedores WHERE user_id = auth.uid())
    ));

DROP POLICY IF EXISTS "vendedores_atualizam_status_propria_loja" ON pedido_loja_status;
CREATE POLICY "vendedores_atualizam_status_propria_loja"
    ON pedido_loja_status FOR ALL TO authenticated
    USING (loja IN (SELECT loja FROM vendedores WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "admins_acesso_total_pedido_loja_status" ON pedido_loja_status;
CREATE POLICY "admins_acesso_total_pedido_loja_status"
    ON pedido_loja_status FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "service_role_pedido_loja_status" ON pedido_loja_status;
CREATE POLICY "service_role_pedido_loja_status"
    ON pedido_loja_status FOR ALL TO service_role
    WITH CHECK (true);

-- 5. CONFIG_FRETE — Tabela de configuração de frete por loja
CREATE TABLE IF NOT EXISTS config_frete (
    loja TEXT PRIMARY KEY CHECK (loja IN ('vidapura', 'daterra', 'botanicare')),
    valor_frete NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE config_frete ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_frete_leitura_publica" ON config_frete;
CREATE POLICY "config_frete_leitura_publica"
    ON config_frete FOR SELECT USING (true);

DROP POLICY IF EXISTS "vendedores_atualizam_config_propria_loja" ON config_frete;
CREATE POLICY "vendedores_atualizam_config_propria_loja"
    ON config_frete FOR ALL TO authenticated
    USING (loja IN (SELECT loja FROM vendedores WHERE user_id = auth.uid()));

-- SEED — Valores padrão de frete
INSERT INTO config_frete (loja, valor_frete) VALUES
    ('vidapura', 8.00),
    ('daterra', 8.00),
    ('botanicare', 10.00)
ON CONFLICT (loja) DO NOTHING;

-- 6. PAGAMENTOS — Colunas adicionais
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT
    CHECK (metodo_pagamento IN ('pix', 'credito', 'debito'));

CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_mp_payment_id_idx
    ON pagamentos (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- 6. STORAGE — Bucket de imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Leitura publica das imagens de produto" ON storage.objects;
CREATE POLICY "Leitura publica das imagens de produto"
    ON storage.objects FOR SELECT USING (bucket_id = 'produtos');

DROP POLICY IF EXISTS "Vendedor envia imagem da propria loja" ON storage.objects;
CREATE POLICY "Vendedor envia imagem da propria loja"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'produtos'
        AND EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = (storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "Vendedor atualiza imagem da propria loja" ON storage.objects;
CREATE POLICY "Vendedor atualiza imagem da propria loja"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'produtos'
        AND EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = (storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "Vendedor apaga imagem da propria loja" ON storage.objects;
CREATE POLICY "Vendedor apaga imagem da propria loja"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'produtos'
        AND EXISTS (SELECT 1 FROM vendedores v WHERE v.user_id = auth.uid() AND v.loja = (storage.foldername(name))[1])
    );

-- 7. FUNCTION: finalizar_pedido
CREATE OR REPLACE FUNCTION public.finalizar_pedido(p_endereco TEXT, p_itens JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pedido_id UUID;
    v_total NUMERIC(10, 2) := 0;
    v_subtotal NUMERIC(10, 2) := 0;
    v_frete NUMERIC(10, 2) := 0;
    v_desconto NUMERIC(10, 2) := 0;
    v_item JSONB;
    v_produto_id UUID;
    v_quantidade INTEGER;
    v_preco NUMERIC(10, 2);
    v_nome TEXT;
    v_loja TEXT;
    v_lojas_distintas TEXT[];
    v_valor_frete_loja NUMERIC(10, 2);
BEGIN
    IF p_endereco IS NULL OR TRIM(p_endereco) = '' THEN
        RAISE EXCEPTION 'Endereço obrigatório';
    END IF;

    IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
        RAISE EXCEPTION 'Carrinho vazio';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item ->> 'produto_id')::UUID;
        v_quantidade := (v_item ->> 'quantidade')::INTEGER;

        IF v_quantidade IS NULL OR v_quantidade <= 0 THEN
            RAISE EXCEPTION 'Quantidade inválida para um dos itens';
        END IF;

        SELECT preco INTO v_preco FROM produtos WHERE id = v_produto_id;

        IF v_preco IS NULL THEN
            RAISE EXCEPTION 'Produto não encontrado: %', v_produto_id;
        END IF;

        v_subtotal := v_subtotal + (v_preco * v_quantidade);
    END LOOP;

    v_lojas_distintas := ARRAY(
        SELECT DISTINCT (SELECT loja FROM produtos WHERE id = (item ->> 'produto_id')::UUID)
        FROM jsonb_array_elements(p_itens) AS item
    );

    FOR v_loja IN SELECT UNNEST(v_lojas_distintas) LOOP
        SELECT valor_frete INTO v_valor_frete_loja FROM config_frete WHERE loja = v_loja;
        IF v_valor_frete_loja IS NOT NULL THEN
            v_frete := v_frete + v_valor_frete_loja;
        END IF;
    END LOOP;

    v_total := v_subtotal + v_frete - v_desconto;

    INSERT INTO pedidos (user_id, endereco, status, subtotal, frete, desconto, total)
    VALUES (auth.uid(), p_endereco, 'pendente', v_subtotal, v_frete, v_desconto, v_total)
    RETURNING id INTO v_pedido_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item ->> 'produto_id')::UUID;
        v_quantidade := (v_item ->> 'quantidade')::INTEGER;

        SELECT preco, nome, loja INTO v_preco, v_nome, v_loja
        FROM produtos WHERE id = v_produto_id;

        INSERT INTO pedido_itens (pedido_id, produto_id, loja, nome_produto, preco_unitario, quantidade)
        VALUES (v_pedido_id, v_produto_id, v_loja, v_nome, v_preco, v_quantidade);
    END LOOP;

    RETURN v_pedido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalizar_pedido(TEXT, JSONB) TO authenticated;

-- 8. TRIGGER: popular pedido_loja_status ao inserir itens
CREATE OR REPLACE FUNCTION popular_pedido_loja_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO pedido_loja_status (pedido_id, loja, status)
    SELECT DISTINCT NEW.pedido_id, pi.loja, 'pendente'
    FROM pedido_itens pi
    WHERE pi.pedido_id = NEW.pedido_id
    ON CONFLICT (pedido_id, loja) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_popular_pedido_loja_status ON pedido_itens;
CREATE TRIGGER trigger_popular_pedido_loja_status
    AFTER INSERT ON pedido_itens
    FOR EACH ROW EXECUTE FUNCTION popular_pedido_loja_status();

-- 9. SEED — Produtos iniciais
INSERT INTO produtos (loja, categoria, nome, descricao, preco, imagem, estoque) VALUES
('vidapura', 'produtos', 'Cenoura (KG)', 'Cenouras naturais cultivadas sem agrotóxicos, fresquinhas e cheias de sabor. Perfeitas para suas receitas saudáveis e nutritivas. Vendidas por quilo!', 7.90, 'cenoura.jpg', 100),
('vidapura', 'produtos', 'Cebola (KG)', 'Cebolas naturais e frescas, cultivadas sem agrotóxicos, com sabor marcante e qualidade incomparável. Peça agora por quilo e transforme sua cozinha!', 4.90, 'cebola.jpg', 100),
('vidapura', 'produtos', 'Alface (KG)', 'Alface fresquinho, cultivado sem agrotóxicos, com folhas crocantes e cheias de sabor natural. Peça agora e leve saúde para sua mesa!', 9.90, 'alface.jpg', 100),
('vidapura', 'produtos', 'Couve (KG)', 'Couve fresca e natural, cultivada sem agrotóxicos, com folhas vibrantes e cheias de sabor. Garanta mais saúde e sabor no seu prato!', 8.90, 'couve.jpg', 100),
('vidapura', 'bebidas', 'Achocolatado Orgânico (400g)', 'Achocolatado Native: sabor irresistível e 100% orgânico! Feito com ingredientes naturais e sustentáveis, perfeito para começar o dia com energia.', 24.90, 'achocolatado.webp', 100),
('vidapura', 'bebidas', 'Cerveja SteinHaus (500ml)', 'Cerveja SteinHaus: tradição e qualidade em cada gole. Produzida artesanalmente, com ingredientes selecionados, sabor único e equilibrado.', 20.90, 'cerveja.jpg', 100),
('daterra', 'produtos', 'Goiaba (KG)', 'Goiabas frescas e suculentas, cultivadas sem agrotóxicos, com sabor doce e natural. Saúde e qualidade direto do campo para a sua mesa!', 24.90, 'goiaba.jpg', 100),
('daterra', 'produtos', 'Laranja (KG)', 'Laranjas frescas, sem agrotóxicos, repletas de suco e sabor natural. Garantia de frescor e qualidade em cada pedaço!', 13.90, 'laranja.jpg', 100),
('daterra', 'produtos', 'Maçã (KG)', 'Maçãs frescas e crocantes, cultivadas sem agrotóxicos, com sabor doce e natural. Qualidade e frescor em cada mordida!', 14.90, 'maçã.jpg', 100),
('daterra', 'produtos', 'Uva (KG)', 'Uvas frescas e doces, cultivadas sem agrotóxicos, com sabor intenso e natural. Sinta o frescor e a qualidade em cada cacho!', 15.90, 'uva.webp', 100),
('daterra', 'produtos', 'Maracujá (KG)', 'Maracujás frescos e aromáticos, cultivados sem agrotóxicos, com sabor intenso e refrescante. Sinta a energia e o frescor em cada fruta!', 19.90, 'maracujá.jpg', 100),
('daterra', 'produtos', 'Morango (KG)', 'Morangos fresquinhos, doces e suculentos, cultivados sem agrotóxicos. Sabor natural e frescor em cada fruta!', 34.90, 'morango.jpg', 100),
('daterra', 'bebidas', 'Água de Coco (500ml)', 'Água de coco natural, refrescante e cheia de sabor! Ideal para hidratar e revitalizar seu corpo, direto da natureza.', 6.90, 'água coco.webp', 100),
('daterra', 'bebidas', 'Energético Wewi (269ml)', 'Energético Wewi: a dose de energia que você precisa para o dia todo, com ingredientes naturais e sem aditivos artificiais.', 7.90, 'wewi.webp', 100),
('botanicare', 'produtos', 'Sabonete Facial (60g)', 'Sabonete natural de arroz + aveia: hidrata, limpa delicadamente e promove renovação celular. Livre de químicos e ideal para todos os tipos de pele!', 33.90, 'sabonete facial.webp', 100),
('botanicare', 'produtos', 'Sabonete Natural', 'Sabonete em barra com extrato de camomila: calma e cuidado para sua pele, com propriedades suavizantes. 100% natural e livre de químicos!', 24.50, 'sabonete natural.webp', 100),
('botanicare', 'produtos', 'Shampoo em Barra (80g)', 'Cuidado sustentável para os cabelos. Limpa suavemente enquanto nutre e fortalece os fios. Prático, ecológico e livre de químicos.', 24.50, 'shampoo em barra.webp', 100),
('botanicare', 'produtos', 'Shampoo Natural (140g)', 'Cuidado puro para os seus cabelos. Livre de sulfatos, parabenos e químicos agressivos, promove saúde e brilho de forma sustentável.', 24.90, 'shampoo natural.webp', 100),
('botanicare', 'produtos', 'Creme Dental (75g)', 'Cuidado bucal saudável e sustentável, ajuda a combater cáries e manter o hálito fresco. Livre de flúor, parabenos e químicos agressivos.', 11.90, 'creme dental.webp', 100),
('botanicare', 'produtos', 'Hidratante Natural (90g)', 'Óleo de coco e extrato de romã orgânico: hidrata profundamente e protege contra os danos dos radicais livres. 100% natural e orgânico.', 24.90, 'hidratante.png', 100)
ON CONFLICT (loja, nome) DO NOTHING;

-- 10. SEED — Vendedores iniciais (substitua pelo UUID real)
INSERT INTO vendedores (user_id, loja) VALUES
    ('a09711b3-b14c-49e4-8fe2-1aead274f926', 'vidapura'),
    ('a09711b3-b14c-49e4-8fe2-1aead274f926', 'daterra'),
    ('a09711b3-b14c-49e4-8fe2-1aead274f926', 'botanicare')
ON CONFLICT (user_id, loja) DO NOTHING;

-- 11. MIGRAÇÃO — Popular pedido_loja_status para pedidos existentes
INSERT INTO pedido_loja_status (pedido_id, loja, status)
SELECT DISTINCT p.id, pi.loja, p.status
FROM pedidos p
JOIN pedido_itens pi ON pi.pedido_id = p.id
ON CONFLICT (pedido_id, loja) DO NOTHING;

-- 12. FAVORITOS — Persistência de favoritos entre dispositivos
CREATE TABLE IF NOT EXISTS favoritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_favoritos_user_id ON favoritos(user_id);
CREATE INDEX IF NOT EXISTS idx_favoritos_produto_id ON favoritos(produto_id);

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_leem_proprios_favoritos" ON favoritos;
CREATE POLICY "usuarios_leem_proprios_favoritos"
    ON favoritos FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "usuarios_inserem_proprios_favoritos" ON favoritos;
CREATE POLICY "usuarios_inserem_proprios_favoritos"
    ON favoritos FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "usuarios_removem_proprios_favoritos" ON favoritos;
CREATE POLICY "usuarios_removem_proprios_favoritos"
    ON favoritos FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 13. AVALIAÇÕES — Notas e comentários sobre produtos
CREATE TABLE IF NOT EXISTS avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_produto_id ON avaliacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_user_id ON avaliacoes(user_id);

ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_publica_avaliacoes" ON avaliacoes;
CREATE POLICY "leitura_publica_avaliacoes"
    ON avaliacoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "usuarios_inserem_proprias_avaliacoes" ON avaliacoes;
CREATE POLICY "usuarios_inserem_proprias_avaliacoes"
    ON avaliacoes FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "usuarios_atualizam_proprias_avaliacoes" ON avaliacoes;
CREATE POLICY "usuarios_atualizam_proprias_avaliacoes"
    ON avaliacoes FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "usuarios_removem_proprias_avaliacoes" ON avaliacoes;
CREATE POLICY "usuarios_removem_proprias_avaliacoes"
    ON avaliacoes FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 14. DEPOIMENTOS — Depoimentos de clientes exibidos na página inicial
CREATE TABLE IF NOT EXISTS depoimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    texto TEXT NOT NULL,
    nota SMALLINT NOT NULL DEFAULT 5 CHECK (nota BETWEEN 1 AND 5),
    foto_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem SMALLINT NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_depoimentos_ativo_ordem ON depoimentos(ativo, ordem);

ALTER TABLE depoimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_publica_depoimentos" ON depoimentos;
CREATE POLICY "leitura_publica_depoimentos"
    ON depoimentos FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "admins_gerenciam_depoimentos" ON depoimentos;
CREATE POLICY "admins_gerenciam_depoimentos"
    ON depoimentos FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- SEED — Depoimentos iniciais (migração dos dados estáticos do main.html)
INSERT INTO depoimentos (nome, texto, nota, foto_url, ordem) VALUES
    ('Kaylane', 'Os produtos da Terra Fresca são simplesmente incríveis! A qualidade é visível desde o aroma até o sabor. Saber que vêm de práticas sustentáveis e direto de pequenos agricultores faz toda a diferença na hora de escolher para minha família.', 4, 'img/kay.jpg', 1),
    ('Clara', 'Descobrir a Terra Fresca mudou minha rotina. Produtos naturais, sem química e com um toque de cuidado especial. Amo saber que estou ajudando famílias e ainda colocando o melhor na minha mesa!', 5, 'img/clara.jpg', 2),
    ('Henrique', 'Trabalhar com os ingredientes da Terra Fresca é um privilégio! A frescura e o sabor são incomparáveis, e ainda posso contar uma história de sustentabilidade e impacto social nos pratos que crio.', 5, 'img/henrique.jpg', 3)
ON CONFLICT DO NOTHING;


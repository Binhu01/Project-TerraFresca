// ======================================================
// Storefront Pública — Lógica de carregamento por slug
// ======================================================

const lojaCarregando = document.getElementById("loja-carregando");
const lojaNaoEncontrada = document.getElementById("loja-nao-encontrada");
const lojaConteudo = document.getElementById("loja-conteudo");

const lojaBanner = document.getElementById("loja-banner");
const lojaLogo = document.getElementById("loja-logo");
const lojaNome = document.getElementById("loja-nome");
const lojaDescricao = document.getElementById("loja-descricao");
const lojaProdutosGrid = document.getElementById("loja-produtos-grid");
const lojaBusca = document.getElementById("loja-busca");
const lojaCategoria = document.getElementById("loja-categoria");

let todosProdutos = [];
let lojaAtual = null;

// ======================================================
// Extrair slug da URL: /loja/index.html?slug=xxx ou /loja/xxx
// ======================================================
function extrairSlug() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("slug")) return params.get("slug");

    // Fallback: pegar do path se a URL for /loja/sitio-sao-jorge
    const partes = window.location.pathname.split("/");
    const ultima = partes[partes.length - 1];
    if (ultima && ultima !== "index.html" && ultima !== "") return ultima;

    return null;
}

// ======================================================
// Carregar dados da loja
// ======================================================
async function carregarLoja() {
    const slug = extrairSlug();

    if (!slug) {
        mostrarNaoEncontrada();
        return;
    }

    const { data: loja, error } = await supabaseClient
        .from("lojas")
        .select("*")
        .eq("slug", slug)
        .eq("status", "aprovada")
        .maybeSingle();

    lojaCarregando.classList.add("hidden");

    if (error || !loja) {
        mostrarNaoEncontrada();
        return;
    }

    lojaAtual = loja;
    aplicarBrandingWhiteLabel(loja);
    renderizarLoja(loja);
    atualizarSEO(loja);
    carregarProdutos(loja.slug);
}

// ======================================================
// White-label: aplicar branding customizado da loja
// ======================================================
function aplicarBrandingWhiteLabel(loja) {
    const root = document.documentElement;

    // Cores customizadas (com fallback para as cores padrão do Terra Fresca)
    if (loja.cor_primaria) {
        root.style.setProperty("--forest", loja.cor_primaria);
    }
    if (loja.cor_secundaria) {
        root.style.setProperty("--honey", loja.cor_secundaria);
    }
    if (loja.cor_fundo) {
        root.style.setProperty("--cream", loja.cor_fundo);
    }

    // Fontes customizadas via Google Fonts (carregamento dinâmico)
    const fontesParaCarregar = [];
    if (loja.fonte_heading && loja.fonte_heading !== "Bevan") {
        fontesParaCarregar.push(loja.fonte_heading);
        root.style.setProperty("--font-heading", `"${loja.fonte_heading}", serif`);
    }
    if (loja.fonte_body && loja.fonte_body !== "Inter") {
        fontesParaCarregar.push(loja.fonte_body);
        root.style.setProperty("--font-body", `"${loja.fonte_body}", sans-serif`);
    }

    if (fontesParaCarregar.length > 0) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${fontesParaCarregar.map(f => `family=${encodeURIComponent(f)}:wght@400;700`).join("&")}&display=swap`;
        document.head.appendChild(link);
    }

    // Título da página com nome da loja como marca principal
    if (loja.dominio_custom) {
        document.title = loja.nome;
    } else {
        document.title = `${loja.nome} - Terra Fresca`;
    }
}

function mostrarNaoEncontrada() {
    lojaNaoEncontrada.classList.remove("hidden");
}

// ======================================================
// Renderizar banner e informações da loja
// ======================================================
function renderizarLoja(loja) {
    lojaConteudo.classList.remove("hidden");

    lojaNome.textContent = loja.nome;
    lojaDescricao.textContent = loja.descricao || "";

    if (loja.logo_url) {
        lojaLogo.src = loja.logo_url;
        lojaLogo.alt = loja.nome;
        lojaLogo.classList.remove("hidden");
    }

    if (loja.capa_url) {
        lojaBanner.style.backgroundImage = `url("${loja.capa_url}")`;
    }

    document.title = `${loja.nome} - Terra Fresca`;
}

// ======================================================
// SEO dinâmico
// ======================================================
function atualizarSEO(loja) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/loja/index.html?slug=${loja.slug}`;
    const descricao = loja.descricao || `Produtos orgânicos e naturais na loja ${loja.nome} no Terra Fresca.`;
    const imagem = loja.logo_url || `${baseUrl}/img/assentamento 2.png`;

    // Meta tags
    atualizarMeta("description", descricao);
    atualizarMeta("og:title", `${loja.nome} - Terra Fresca`);
    atualizarMeta("og:description", descricao);
    atualizarMeta("og:url", url);
    atualizarMeta("og:image", imagem);
    atualizarMeta("twitter:title", `${loja.nome} - Terra Fresca`);
    atualizarMeta("twitter:description", descricao);
    atualizarMeta("twitter:image", imagem);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
    }
    canonical.href = url;

    // JSON-LD (Store schema.org)
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Store",
        name: loja.nome,
        description: descricao,
        url: url,
        image: imagem,
        priceRange: "$$",
        parentOrganization: {
            "@type": "Organization",
            name: "Terra Fresca",
        },
    };

    let scriptLd = document.getElementById("json-ld-loja");
    if (!scriptLd) {
        scriptLd = document.createElement("script");
        scriptLd.id = "json-ld-loja";
        scriptLd.type = "application/ld+json";
        document.head.appendChild(scriptLd);
    }
    scriptLd.textContent = JSON.stringify(jsonLd);
}

function atualizarMeta(name, content) {
    // Tenta og: primeiro, depois name padrão
    let el = document.querySelector(`meta[property="${name}"]`) ||
             document.querySelector(`meta[name="${name}"]`);
    if (el) {
        el.setAttribute("content", content);
    }
}

// ======================================================
// Carregar produtos da loja
// ======================================================
async function carregarProdutos(slugLoja) {
    // Produtos podem estar vinculados pelo nome da loja (legado)
    // ou pelo slug da loja customizada. Buscamos ambos.
    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .or(`loja.eq.${slugLoja},loja.eq.${lojaAtual.nome}`)
        .order("nome");

    if (error) {
        lojaProdutosGrid.innerHTML = '<p class="painel-vazio">Não foi possível carregar os produtos.</p>';
        console.error(error);
        return;
    }

    todosProdutos = data || [];

    if (todosProdutos.length === 0) {
        lojaProdutosGrid.innerHTML = '<p class="painel-vazio">Esta loja ainda não tem produtos cadastrados.</p>';
        return;
    }

    renderizarProdutos(todosProdutos);
}

// ======================================================
// Renderizar grid de produtos (reusa padrão dos cardápios)
// ======================================================
function renderizarProdutos(produtos) {
    if (produtos.length === 0) {
        lojaProdutosGrid.innerHTML = '<p class="painel-vazio">Nenhum produto encontrado.</p>';
        return;
    }

    lojaProdutosGrid.innerHTML = "";

    produtos.forEach((produto) => {
        const card = document.createElement("div");
        card.className = "cardapio-item";

        const srcImagem = produto.imagem && produto.imagem.startsWith("http")
            ? produto.imagem
            : "../cardapio/assets/" + (produto.imagem || "");

        const precoFormatado = Number(produto.preco).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

        card.innerHTML = `
            <img src="${srcImagem}" alt="${produto.nome}" loading="lazy">
            <div class="cardapio-info">
                <h3>${produto.nome}</h3>
                <p class="cardapio-desc">${produto.descricao || ""}</p>
                <div class="cardapio-preco-linha">
                    <span class="cardapio-preco">${precoFormatado}</span>
                    ${produto.estoque <= 0 ? '<span class="cardapio-esgotado">Esgotado</span>' : ""}
                </div>
                <button class="btn cardapio-btn-add"
                        data-id="${produto.id}"
                        data-nome="${produto.nome}"
                        data-preco="${produto.preco}"
                        data-imagem="${produto.imagem || ""}"
                        data-loja="${produto.loja}"
                        ${produto.estoque <= 0 ? "disabled" : ""}>
                    Adicionar
                </button>
            </div>
        `;

        lojaProdutosGrid.appendChild(card);
    });

    // Vincular eventos de adicionar ao carrinho
    lojaProdutosGrid.querySelectorAll(".cardapio-btn-add").forEach((btn) => {
        btn.addEventListener("click", () => adicionarAoCarrinho(btn));
    });
}

// ======================================================
// Filtros: busca e categoria
// ======================================================
function aplicarFiltros() {
    const termo = lojaBusca.value.toLowerCase().trim();
    const categoria = lojaCategoria.value;

    const filtrados = todosProdutos.filter((p) => {
        const matchBusca = !termo || p.nome.toLowerCase().includes(termo) ||
                          (p.descricao && p.descricao.toLowerCase().includes(termo));
        const matchCategoria = !categoria || p.categoria === categoria;
        return matchBusca && matchCategoria;
    });

    renderizarProdutos(filtrados);
}

lojaBusca.addEventListener("input", aplicarFiltros);
lojaCategoria.addEventListener("change", aplicarFiltros);

// ======================================================
// Carrinho (integração com carrinho unificado existente)
// ======================================================
function adicionarAoCarrinho(btn) {
    const item = {
        id: btn.dataset.id,
        nome: btn.dataset.nome,
        preco: parseFloat(btn.dataset.preco),
        imagem: btn.dataset.imagem,
        loja: btn.dataset.loja,
        quantidade: 1,
    };

    // Ler carrinho do localStorage
    let carrinho = JSON.parse(localStorage.getItem("tf_carrinho") || "[]");

    // Verificar se já existe
    const existente = carrinho.find((c) => c.id === item.id);
    if (existente) {
        existente.quantidade += 1;
    } else {
        carrinho.push(item);
    }

    localStorage.setItem("tf_carrinho", JSON.stringify(carrinho));

    // Feedback visual
    const textoOriginal = btn.textContent;
    btn.textContent = "Adicionado!";
    btn.disabled = true;
    setTimeout(() => {
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }, 1200);

    // Atualizar contador do carrinho na navbar (se existir)
    if (typeof window.atualizarContadorCarrinho === "function") {
        window.atualizarContadorCarrinho();
    }
}

// ======================================================
// Inicialização
// ======================================================
carregarLoja();
// ======================================================
// Busca os produtos da loja no Supabase e monta os cards
// dinamicamente. Também marca quais produtos já estão nos
// favoritos do usuário logado (se houver um logado).
// ======================================================

let usuarioAtual = null;
let favoritosDoUsuario = new Set();
let avaliacoesPorProduto = new Map();
let todosProdutos = []; // armazena produtos + bebidas para busca em tempo real
let filtroCategoriaAtual = "todos";
let ordenacaoAtual = "nome";

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

// Produtos antigos guardam só o nome do arquivo (mora em ./assets/);
// produtos cadastrados pelo painel guardam a URL pública do Storage.
function resolverSrcImagem(imagem) {
    if (!imagem) return "";
    return imagem.startsWith("http") ? imagem : "./assets/" + imagem;
}

function avisarPrecisaLogin(mensagem) {
    if (window.Toastify) {
        Toastify({
            text: mensagem,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: { background: "#1E3320" },
        }).showToast();
    } else {
        alert(mensagem);
    }
}

async function alternarFavorito(produto, botaoIcone) {
    if (!usuarioAtual) {
        avisarPrecisaLogin("Faça login para favoritar produtos.");
        return;
    }

    const jaFavoritado = favoritosDoUsuario.has(produto.id);

    if (jaFavoritado) {
        await supabaseClient
            .from("favoritos")
            .delete()
            .eq("user_id", usuarioAtual.id)
            .eq("produto_id", produto.id);
        favoritosDoUsuario.delete(produto.id);
        botaoIcone.className = "fa-solid fa-heart";
        botaoIcone.parentElement.classList.remove("text-honey");
        botaoIcone.parentElement.classList.add("text-sage");
    } else {
        await supabaseClient
            .from("favoritos")
            .insert({ user_id: usuarioAtual.id, produto_id: produto.id });
        favoritosDoUsuario.add(produto.id);
        botaoIcone.className = "fa-solid fa-heart";
        botaoIcone.parentElement.classList.remove("text-sage");
        botaoIcone.parentElement.classList.add("text-honey");
    }
}

function criarCardProduto(produto, indice) {
    const article = document.createElement("article");
    const rotacao = indice % 2 === 0 ? "-rotate-1" : "rotate-1";
    article.className =
        "group bg-white rounded-lg border-[3px] border-forest shadow-[6px_6px_0_0_#B8863B] overflow-hidden flex gap-4 p-4 hover:shadow-[10px_10px_0_0_#B8863B] hover:-translate-y-1 hover:rotate-0 transition duration-300 " +
        rotacao;

    // Imagem + botão de favorito (posicionado sobre a imagem)
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "relative shrink-0";

    const img = document.createElement("img");
    img.src = resolverSrcImagem(produto.imagem);
    img.alt = produto.nome;
    img.className = "w-24 h-24 md:w-28 md:h-28 rounded object-cover border-2 border-forest";

    const favoritado = favoritosDoUsuario.has(produto.id);

    const btnFavorito = document.createElement("button");
    btnFavorito.type = "button";
    btnFavorito.title = "Favoritar";
    btnFavorito.className =
        "absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-forest flex items-center justify-center transition hover:scale-110 " +
        (favoritado ? "text-honey" : "text-sage");

    const iconeFavorito = document.createElement("i");
    iconeFavorito.className = "fa-solid fa-heart text-xs";
    btnFavorito.appendChild(iconeFavorito);

    btnFavorito.addEventListener("click", () => alternarFavorito(produto, iconeFavorito));

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(btnFavorito);

    // Texto + preço + botão de carrinho
    const info = document.createElement("div");
    info.className = "flex flex-col flex-1 min-w-0";

    const nome = document.createElement("p");
    nome.className = "font-serif text-lg text-forest";
    nome.textContent = produto.nome;

    const avaliacao = avaliacoesPorProduto.get(produto.id);
    const estrelasEl = document.createElement("div");
    estrelasEl.className = "flex items-center gap-0.5 text-xs";

    if (avaliacao) {
        const estrelasCheias = Math.round(avaliacao.media);
        for (let i = 1; i <= 5; i++) {
            const icone = document.createElement("i");
            icone.className = "fa-solid fa-star " + (i <= estrelasCheias ? "text-honey" : "text-sage/40");
            estrelasEl.appendChild(icone);
        }
        const contagem = document.createElement("span");
        contagem.className = "text-ink/50 ml-1";
        contagem.textContent = `(${avaliacao.total})`;
        estrelasEl.appendChild(contagem);
    } else {
        const semAvaliacao = document.createElement("span");
        semAvaliacao.className = "text-ink/40";
        semAvaliacao.textContent = "Sem avaliações ainda";
        estrelasEl.appendChild(semAvaliacao);
    }

    const descricao = document.createElement("p");
    descricao.className = "text-sm text-ink/70 leading-relaxed";
    descricao.textContent = produto.descricao || "";

    const rodape = document.createElement("div");
    rodape.className = "mt-auto pt-3 flex items-center justify-between";

    const preco = document.createElement("p");
    preco.className = "font-serif text-lg text-forest";
    preco.textContent = formatarPreco(produto.preco);

    const semEstoque = produto.estoque !== null && produto.estoque <= 0;

    const botao = document.createElement("button");
    botao.setAttribute("data-id", produto.id);
    botao.setAttribute("data-name", produto.nome);
    botao.setAttribute("data-price", produto.preco);
    botao.setAttribute("data-loja", produto.loja);

    if (semEstoque) {
        botao.disabled = true;
        botao.className =
            "bg-sage/40 text-forest/60 border-2 border-sage px-4 h-11 rounded flex items-center justify-center text-xs font-semibold cursor-not-allowed";
        botao.textContent = "Esgotado";
    } else {
        botao.className =
            "bg-moss hover:bg-honey text-cream w-11 h-11 rounded border-2 border-forest shadow-[3px_3px_0_0_#1E3320] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] flex items-center justify-center transition add-to-cart-btn";
        botao.innerHTML = '<i class="fa fa-cart-plus"></i>';
    }

    rodape.appendChild(preco);
    rodape.appendChild(botao);

    info.appendChild(nome);
    info.appendChild(estrelasEl);
    info.appendChild(descricao);
    info.appendChild(rodape);

    article.appendChild(imgWrapper);
    article.appendChild(info);

    return article;
}

async function carregarProdutos() {
    const loja = document.body.dataset.loja;
    const produtosGrid = document.getElementById("grid-produtos");
    const bebidasSection = document.getElementById("secao-bebidas");
    const bebidasGrid = document.getElementById("grid-bebidas");

    if (!loja || !produtosGrid) return;

    produtosGrid.innerHTML =
        '<p class="col-span-full text-center text-ink/60">Carregando produtos...</p>';

    const { data: { session } } = await supabaseClient.auth.getSession();
    usuarioAtual = session ? session.user : null;

    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .eq("loja", loja)
        .order("nome");

    if (error) {
        produtosGrid.innerHTML =
            '<p class="col-span-full text-center text-ink/60">Não foi possível carregar os produtos agora. Tente novamente em instantes.</p>';
        console.error("Erro ao buscar produtos:", error);
        return;
    }

    if (usuarioAtual && data.length > 0) {
        const ids = data.map((p) => p.id);
        const { data: favoritos } = await supabaseClient
            .from("favoritos")
            .select("produto_id")
            .eq("user_id", usuarioAtual.id)
            .in("produto_id", ids);
        favoritosDoUsuario = new Set((favoritos || []).map((f) => f.produto_id));
    }

    if (data.length > 0) {
        const ids = data.map((p) => p.id);
        const { data: avaliacoes } = await supabaseClient
            .from("avaliacoes")
            .select("produto_id, nota")
            .in("produto_id", ids);

        const agrupado = {};
        (avaliacoes || []).forEach((a) => {
            if (!agrupado[a.produto_id]) agrupado[a.produto_id] = [];
            agrupado[a.produto_id].push(a.nota);
        });

        avaliacoesPorProduto = new Map();
        Object.entries(agrupado).forEach(([produtoId, notas]) => {
            const media = notas.reduce((soma, n) => soma + n, 0) / notas.length;
            avaliacoesPorProduto.set(produtoId, { media, total: notas.length });
        });
    }

    const produtos = data.filter((p) => p.categoria === "produtos");
    const bebidas = data.filter((p) => p.categoria === "bebidas");

    produtosGrid.innerHTML = "";

    if (produtos.length === 0) {
        produtosGrid.innerHTML =
            '<p class="col-span-full text-center text-ink/60">Nenhum produto cadastrado ainda.</p>';
    } else {
        produtos.forEach((produto, indice) => {
            produtosGrid.appendChild(criarCardProduto(produto, indice));
        });
    }

    // Armazena todos os produtos para busca em tempo real
    todosProdutos = data;

    if (bebidas.length > 0 && bebidasSection && bebidasGrid) {
        bebidasSection.classList.remove("hidden");
        bebidas.forEach((produto, indice) => {
            bebidasGrid.appendChild(criarCardProduto(produto, indice));
        });
    }

    // Ativa o campo de busca após carregar os produtos
    const buscaInput = document.getElementById("busca-produtos");
    if (buscaInput) {
        buscaInput.addEventListener("input", filtrarProdutos);
    }

    // Ativa filtros de categoria e ordenação
    inicializarFiltrosEOrdenacao();
}

// ======================================================
// Filtro por categoria e ordenação — trabalha junto com
// a busca em tempo real. Sempre que qualquer um muda,
// reaplicamos tudo sobre todosProdutos.
// ======================================================
function inicializarFiltrosEOrdenacao() {
    const botoesCategoria = document.querySelectorAll(".filtro-categoria-btn");
    const selectOrdenacao = document.getElementById("ordenar-produtos");

    botoesCategoria.forEach((btn) => {
        btn.addEventListener("click", () => {
            filtroCategoriaAtual = btn.getAttribute("data-filtro-categoria");

            // Atualiza estilo ativo
            botoesCategoria.forEach((b) => {
                b.classList.remove("active", "bg-forest", "text-cream");
                b.classList.add("bg-white", "text-forest");
            });
            btn.classList.remove("bg-white", "text-forest");
            btn.classList.add("active", "bg-forest", "text-cream");

            aplicarFiltrosEOrdenacao();
        });
    });

    if (selectOrdenacao) {
        selectOrdenacao.addEventListener("change", (evento) => {
            ordenacaoAtual = evento.target.value;
            aplicarFiltrosEOrdenacao();
        });
    }
}

function obterTermoBuscaAtual() {
    const buscaInput = document.getElementById("busca-produtos");
    return buscaInput ? buscaInput.value.trim().toLowerCase() : "";
}

function aplicarFiltrosEOrdenacao() {
    const termo = obterTermoBuscaAtual();
    const produtosGrid = document.getElementById("grid-produtos");
    const bebidasSection = document.getElementById("secao-bebidas");
    const bebidasGrid = document.getElementById("grid-bebidas");
    const buscaVazia = document.getElementById("busca-vazia");

    if (!produtosGrid) return;

    // 1. Filtra por termo de busca
    let lista = todosProdutos;
    if (termo) {
        lista = lista.filter((p) => {
            const nome = (p.nome || "").toLowerCase();
            const descricao = (p.descricao || "").toLowerCase();
            return nome.includes(termo) || descricao.includes(termo);
        });
    }

    // 2. Filtra por categoria
    if (filtroCategoriaAtual === "produtos") {
        lista = lista.filter((p) => p.categoria === "produtos");
    } else if (filtroCategoriaAtual === "bebidas") {
        lista = lista.filter((p) => p.categoria === "bebidas");
    }
    // "todos" não filtra nada

    // 3. Ordena
    lista = ordenarLista(lista, ordenacaoAtual);

    // 4. Separa por categoria para renderizar
    const produtosFiltrados = lista.filter((p) => p.categoria === "produtos");
    const bebidasFiltradas = lista.filter((p) => p.categoria === "bebidas");

    // Se o filtro é "bebidas", esconde grid de produtos e mostra só bebidas
    // Se o filtro é "produtos", mostra grid de produtos e esconde bebidas
    // Se o filtro é "todos", mostra ambos conforme conteúdo
    if (filtroCategoriaAtual === "bebidas") {
        produtosGrid.innerHTML = "";
        if (bebidasSection && bebidasGrid) {
            bebidasSection.classList.remove("hidden");
            renderizarProdutosFiltrados(bebidasFiltradas, bebidasGrid);
        }
    } else if (filtroCategoriaAtual === "produtos") {
        renderizarProdutosFiltrados(produtosFiltrados, produtosGrid);
        if (bebidasSection) bebidasSection.classList.add("hidden");
    } else {
        renderizarProdutosFiltrados(produtosFiltrados, produtosGrid);
        if (bebidasFiltradas.length > 0 && bebidasSection && bebidasGrid) {
            bebidasSection.classList.remove("hidden");
            renderizarProdutosFiltrados(bebidasFiltradas, bebidasGrid);
        } else if (bebidasSection) {
            bebidasSection.classList.add("hidden");
        }
    }

    const nenhumResultado = lista.length === 0;
    if (buscaVazia) {
        buscaVazia.classList.toggle("hidden", !nenhumResultado);
    }
}

function ordenarLista(lista, criterio) {
    const copia = [...lista];

    switch (criterio) {
        case "preco-asc":
            copia.sort((a, b) => Number(a.preco) - Number(b.preco));
            break;
        case "preco-desc":
            copia.sort((a, b) => Number(b.preco) - Number(a.preco));
            break;
        case "avaliacao":
            copia.sort((a, b) => {
                const avalA = avaliacoesPorProduto.get(a.id);
                const avalB = avaliacoesPorProduto.get(b.id);
                const mediaA = avalA ? avalA.media : 0;
                const mediaB = avalB ? avalB.media : 0;
                return mediaB - mediaA;
            });
            break;
        case "nome":
        default:
            copia.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
            break;
    }

    return copia;
}

// ======================================================
// Busca em tempo real — filtra produtos e bebidas pelo
// nome ou descrição, escondendo cards que não combinam
// e mostrando mensagem quando nada é encontrado.
// ======================================================
function filtrarProdutos(evento) {
    const termo = evento.target.value.trim().toLowerCase();
    const produtosGrid = document.getElementById("grid-produtos");
    const bebidasSection = document.getElementById("secao-bebidas");
    const bebidasGrid = document.getElementById("grid-bebidas");
    const buscaVazia = document.getElementById("busca-vazia");

    if (!termo) {
        // Limpa busca: re-renderiza tudo como estava
        renderizarProdutosFiltrados(todosProdutos.filter((p) => p.categoria === "produtos"), produtosGrid);
        const bebidas = todosProdutos.filter((p) => p.categoria === "bebidas");
        if (bebidas.length > 0 && bebidasSection && bebidasGrid) {
            bebidasSection.classList.remove("hidden");
            renderizarProdutosFiltrados(bebidas, bebidasGrid);
        } else if (bebidasSection) {
            bebidasSection.classList.add("hidden");
        }
        if (buscaVazia) buscaVazia.classList.add("hidden");
        return;
    }

    const combinam = todosProdutos.filter((p) => {
        const nome = (p.nome || "").toLowerCase();
        const descricao = (p.descricao || "").toLowerCase();
        return nome.includes(termo) || descricao.includes(termo);
    });

    const produtosFiltrados = combinam.filter((p) => p.categoria === "produtos");
    const bebidasFiltradas = combinam.filter((p) => p.categoria === "bebidas");

    renderizarProdutosFiltrados(produtosFiltrados, produtosGrid);

    if (bebidasFiltradas.length > 0 && bebidasSection && bebidasGrid) {
        bebidasSection.classList.remove("hidden");
        renderizarProdutosFiltrados(bebidasFiltradas, bebidasGrid);
    } else if (bebidasSection) {
        bebidasSection.classList.add("hidden");
    }

    const nenhumResultado = combinam.length === 0;
    if (buscaVazia) {
        buscaVazia.classList.toggle("hidden", !nenhumResultado);
    }
}

function renderizarProdutosFiltrados(lista, container) {
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-ink/60">Nenhum produto nesta categoria.</p>';
        return;
    }
    lista.forEach((produto, indice) => {
        container.appendChild(criarCardProduto(produto, indice));
    });
}

carregarProdutos();

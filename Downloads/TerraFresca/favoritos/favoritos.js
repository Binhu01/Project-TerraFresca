const NOMES_LOJA = {
    vidapura: "Vida Pura",
    daterra: "Da Terra",
    botanicare: "BotaniCare",
};

const listaEl = document.getElementById("favoritos-lista");

// Produtos antigos guardam só o nome do arquivo (mora em ../cardapio/assets/);
// produtos cadastrados pelo painel guardam a URL pública do Storage.
function resolverSrcImagem(imagem) {
    if (!imagem) return "";
    return imagem.startsWith("http") ? imagem : "../cardapio/assets/" + imagem;
}

async function carregarFavoritos() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login/index.html";
        return;
    }

    const { data, error } = await supabaseClient
        .from("favoritos")
        .select("id, produtos(id, nome, preco, imagem, loja)")
        .eq("user_id", session.user.id)
        .order("criado_em", { ascending: false });

    if (error) {
        listaEl.innerHTML = '<p class="painel-vazio">Não foi possível carregar seus favoritos.</p>';
        console.error(error);
        return;
    }

    const favoritos = (data || []).filter((f) => f.produtos);

    if (favoritos.length === 0) {
        listaEl.innerHTML = '<p class="painel-vazio">Você ainda não favoritou nenhum produto. Vá até uma das nossas lojas e clique no coração de um produto para salvá-lo aqui.</p>';
        return;
    }

    listaEl.innerHTML = "";
    favoritos.forEach((favorito) => {
        listaEl.appendChild(criarCardFavorito(favorito));
    });
}

function criarCardFavorito(favorito) {
    const produto = favorito.produtos;

    const card = document.createElement("div");
    card.className = "favorito-card";

    const img = document.createElement("img");
    img.src = resolverSrcImagem(produto.imagem);
    img.alt = produto.nome;

    const corpo = document.createElement("div");
    corpo.className = "favorito-card-corpo";

    const loja = document.createElement("span");
    loja.className = "favorito-card-loja";
    loja.textContent = NOMES_LOJA[produto.loja] || produto.loja;

    const nome = document.createElement("p");
    nome.className = "favorito-card-nome";
    nome.textContent = produto.nome;

    const preco = document.createElement("p");
    preco.className = "favorito-card-preco";
    preco.textContent = Number(produto.preco).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });

    const acoes = document.createElement("div");
    acoes.className = "favorito-card-acoes";

    const linkLoja = document.createElement("a");
    linkLoja.href = "../cardapio/" + produto.loja + ".html";
    linkLoja.textContent = "Ver na loja →";

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.textContent = "Remover";
    btnRemover.addEventListener("click", async () => {
        await supabaseClient.from("favoritos").delete().eq("id", favorito.id);
        card.remove();
        if (listaEl.children.length === 0) {
            listaEl.innerHTML = '<p class="painel-vazio">Você ainda não favoritou nenhum produto.</p>';
        }
    });

    acoes.appendChild(linkLoja);
    acoes.appendChild(btnRemover);

    corpo.appendChild(loja);
    corpo.appendChild(nome);
    corpo.appendChild(preco);
    corpo.appendChild(acoes);

    card.appendChild(img);
    card.appendChild(corpo);

    return card;
}

carregarFavoritos();

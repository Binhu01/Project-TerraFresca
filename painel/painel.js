// ======================================================
// Elementos da página
// ======================================================
const estadoCarregando = document.getElementById("estado-carregando");
const estadoSemAcesso = document.getElementById("estado-sem-acesso");
const painelConteudo = document.getElementById("painel-conteudo");

const lojaSelectWrapper = document.getElementById("painel-loja-select-wrapper");
const lojaSelect = document.getElementById("painel-loja-select");

const form = document.getElementById("produto-form");
const formTitulo = document.getElementById("form-titulo");
const formMensagem = document.getElementById("form-mensagem");
const btnSalvar = document.getElementById("btn-salvar");
const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");

const campoId = document.getElementById("produto-id");
const campoNome = document.getElementById("campo-nome");
const campoCategoria = document.getElementById("campo-categoria");
const campoPreco = document.getElementById("campo-preco");
const campoEstoque = document.getElementById("campo-estoque");
const campoImagemArquivo = document.getElementById("campo-imagem-arquivo");
const campoImagemAtual = document.getElementById("campo-imagem-atual");
const previewImagem = document.getElementById("preview-imagem");
const previewImagemImg = document.getElementById("preview-imagem-img");
const campoDescricao = document.getElementById("campo-descricao");

const listaProdutos = document.getElementById("lista-produtos");
const listaPedidosVendedor = document.getElementById("lista-pedidos-vendedor");

const NOMES_LOJA = {
    vidapura: "Vida Pura",
    daterra: "Da Terra",
    botanicare: "BotaniCare",
};

const STATUS_LABEL = {
    pendente: "Pendente",
    pago: "Pago",
    recusado: "Pagamento recusado",
    enviado: "Enviado",
    entregue: "Entregue",
    cancelado: "Cancelado",
};

let lojasDoVendedor = [];
let lojaAtual = null;

// Produtos antigos guardam só o nome do arquivo (ex: "cenoura.jpg"),
// que mora em cardapio/assets/. Produtos cadastrados a partir de agora
// guardam a URL pública inteira do Supabase Storage. Essa função lida
// com os dois casos.
function resolverSrcImagem(imagem) {
    if (!imagem) return "";
    return imagem.startsWith("http") ? imagem : "../cardapio/assets/" + imagem;
}

campoImagemArquivo.addEventListener("change", () => {
    const arquivo = campoImagemArquivo.files[0];
    if (!arquivo) return;

    const url = URL.createObjectURL(arquivo);
    previewImagemImg.src = url;
    previewImagem.classList.remove("hidden");
});

// ======================================================
// Passo 1: checar sessão e quais lojas o usuário gerencia
// ======================================================
async function iniciarPainel() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login/index.html";
        return;
    }

    const { data, error } = await supabaseClient
        .from("vendedores")
        .select("loja")
        .eq("user_id", session.user.id);

    estadoCarregando.classList.add("hidden");

    if (error || !data || data.length === 0) {
        estadoSemAcesso.classList.remove("hidden");
        return;
    }

    lojasDoVendedor = data.map((linha) => linha.loja);
    lojaAtual = lojasDoVendedor[0];

    montarSeletorDeLoja();
    painelConteudo.classList.remove("hidden");
    carregarProdutosDoVendedor();
    carregarPedidosDaLoja();
}

function montarSeletorDeLoja() {
    if (lojasDoVendedor.length <= 1) {
        lojaSelectWrapper.classList.add("hidden");
        return;
    }

    lojaSelect.innerHTML = "";
    lojasDoVendedor.forEach((loja) => {
        const option = document.createElement("option");
        option.value = loja;
        option.textContent = NOMES_LOJA[loja] || loja;
        lojaSelect.appendChild(option);
    });

    lojaSelect.addEventListener("change", () => {
        lojaAtual = lojaSelect.value;
        cancelarEdicao();
        carregarProdutosDoVendedor();
        carregarPedidosDaLoja();
    });
}

// ======================================================
// Passo 2: listar os produtos da loja selecionada
// ======================================================
async function carregarProdutosDoVendedor() {
    listaProdutos.innerHTML = '<p class="painel-vazio">Carregando produtos...</p>';

    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .eq("loja", lojaAtual)
        .order("nome");

    if (error) {
        listaProdutos.innerHTML = '<p class="painel-vazio">Não foi possível carregar os produtos.</p>';
        console.error(error);
        return;
    }

    if (data.length === 0) {
        listaProdutos.innerHTML = '<p class="painel-vazio">Nenhum produto cadastrado nessa loja ainda.</p>';
        return;
    }

    listaProdutos.innerHTML = "";
    data.forEach((produto) => {
        listaProdutos.appendChild(criarItemLista(produto));
    });
}

function criarItemLista(produto) {
    const item = document.createElement("div");
    item.className = "painel-produto-item";

    const img = document.createElement("img");
    img.src = resolverSrcImagem(produto.imagem);
    img.alt = produto.nome;

    const info = document.createElement("div");
    info.className = "painel-produto-info";

    const nome = document.createElement("p");
    nome.className = "nome";
    nome.textContent = produto.nome;

    const detalhes = document.createElement("p");
    detalhes.className = "detalhes";
    const precoFormatado = Number(produto.preco).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
    const categoriaLabel = produto.categoria === "bebidas" ? "Bebida" : "Produto";
    detalhes.textContent = `${categoriaLabel} · ${precoFormatado} · Estoque: ${produto.estoque}`;

    info.appendChild(nome);
    info.appendChild(detalhes);

    const acoes = document.createElement("div");
    acoes.className = "painel-produto-acoes";

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => preencherFormularioParaEdicao(produto));

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "excluir";
    btnExcluir.textContent = "Excluir";
    btnExcluir.addEventListener("click", () => excluirProduto(produto));

    acoes.appendChild(btnEditar);
    acoes.appendChild(btnExcluir);

    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(acoes);

    return item;
}

// ======================================================
// Passo 3: criar / editar produto
// ======================================================
function preencherFormularioParaEdicao(produto) {
    campoId.value = produto.id;
    campoNome.value = produto.nome;
    campoCategoria.value = produto.categoria;
    campoPreco.value = produto.preco;
    campoEstoque.value = produto.estoque;
    campoDescricao.value = produto.descricao || "";

    campoImagemArquivo.value = "";
    campoImagemAtual.value = produto.imagem;
    previewImagemImg.src = resolverSrcImagem(produto.imagem);
    previewImagem.classList.remove("hidden");

    formTitulo.textContent = "Editando: " + produto.nome;
    btnSalvar.textContent = "Salvar alterações";
    btnCancelarEdicao.classList.remove("hidden");
    formMensagem.textContent = "";
    formMensagem.className = "auth-message";

    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelarEdicao() {
    form.reset();
    campoId.value = "";
    campoImagemAtual.value = "";
    previewImagem.classList.add("hidden");
    previewImagemImg.src = "";
    formTitulo.textContent = "Adicionar novo produto";
    btnSalvar.textContent = "Cadastrar produto";
    btnCancelarEdicao.classList.add("hidden");
    formMensagem.textContent = "";
    formMensagem.className = "auth-message";
}

btnCancelarEdicao.addEventListener("click", cancelarEdicao);

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const arquivoImagem = campoImagemArquivo.files[0];

    if (!arquivoImagem && !campoImagemAtual.value) {
        formMensagem.textContent = "Escolha uma imagem para o produto.";
        formMensagem.className = "auth-message error";
        return;
    }

    btnSalvar.disabled = true;
    let imagemFinal = campoImagemAtual.value;

    if (arquivoImagem) {
        formMensagem.textContent = "Enviando imagem...";
        formMensagem.className = "auth-message success";

        const nomeArquivo = `${lojaAtual}/${Date.now()}-${arquivoImagem.name.replace(/\s+/g, "-")}`;

        const { error: erroUpload } = await supabaseClient.storage
            .from("produtos")
            .upload(nomeArquivo, arquivoImagem);

        if (erroUpload) {
            formMensagem.textContent = "Erro ao enviar imagem: " + erroUpload.message;
            formMensagem.className = "auth-message error";
            btnSalvar.disabled = false;
            return;
        }

        const { data: urlPublica } = supabaseClient.storage
            .from("produtos")
            .getPublicUrl(nomeArquivo);

        imagemFinal = urlPublica.publicUrl;
    }

    const dadosProduto = {
        loja: lojaAtual,
        nome: campoNome.value.trim(),
        categoria: campoCategoria.value,
        preco: parseFloat(campoPreco.value),
        estoque: parseInt(campoEstoque.value, 10),
        imagem: imagemFinal,
        descricao: campoDescricao.value.trim(),
    };

    formMensagem.textContent = "Salvando...";
    formMensagem.className = "auth-message success";

    let resultado;
    if (campoId.value) {
        resultado = await supabaseClient
            .from("produtos")
            .update(dadosProduto)
            .eq("id", campoId.value);
    } else {
        resultado = await supabaseClient
            .from("produtos")
            .insert(dadosProduto);
    }

    btnSalvar.disabled = false;

    if (resultado.error) {
        formMensagem.textContent = "Erro ao salvar: " + resultado.error.message;
        formMensagem.className = "auth-message error";
        return;
    }

    formMensagem.textContent = "Produto salvo com sucesso!";
    formMensagem.className = "auth-message success";

    cancelarEdicao();
    carregarProdutosDoVendedor();
});

// ======================================================
// Passo 4: excluir produto
// ======================================================
async function excluirProduto(produto) {
    const confirmar = window.confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`);
    if (!confirmar) return;

    const { error } = await supabaseClient
        .from("produtos")
        .delete()
        .eq("id", produto.id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
    }

    carregarProdutosDoVendedor();
}

// ======================================================
// Passo 5: pedidos que contêm produto da loja selecionada
// (mostra só os itens da própria loja dentro de cada
// pedido — o pedido pode ter itens de outras lojas também,
// já que o carrinho é unificado)
// ======================================================
async function carregarPedidosDaLoja() {
    listaPedidosVendedor.innerHTML = '<p class="painel-vazio">Carregando pedidos...</p>';

    const { data: itens, error: erroItens } = await supabaseClient
        .from("pedido_itens")
        .select("pedido_id, nome_produto, preco_unitario, quantidade")
        .eq("loja", lojaAtual);

    if (erroItens) {
        listaPedidosVendedor.innerHTML = '<p class="painel-vazio">Não foi possível carregar os pedidos.</p>';
        console.error(erroItens);
        return;
    }

    if (!itens || itens.length === 0) {
        listaPedidosVendedor.innerHTML = '<p class="painel-vazio">Nenhum pedido com produtos dessa loja ainda.</p>';
        return;
    }

    const pedidoIds = [...new Set(itens.map((i) => i.pedido_id))];

    const { data: pedidos, error: erroPedidos } = await supabaseClient
        .from("pedidos")
        .select("id, status, endereco, criado_em, user_id")
        .in("id", pedidoIds)
        .order("criado_em", { ascending: false });

    if (erroPedidos) {
        listaPedidosVendedor.innerHTML = '<p class="painel-vazio">Não foi possível carregar os pedidos.</p>';
        console.error(erroPedidos);
        return;
    }

    // "pedidos" não tem FK direta pra "profiles" — buscamos os
    // e-mails separadamente e juntamos aqui (mesma solução usada
    // no painel administrativo).
    const userIds = [...new Set(pedidos.map((p) => p.user_id))];
    const { data: perfis } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
    const emailPorUserId = new Map((perfis || []).map((p) => [p.id, p.email]));

    listaPedidosVendedor.innerHTML = "";
    pedidos.forEach((pedido) => {
        const itensDoPedido = itens.filter((i) => i.pedido_id === pedido.id);
        listaPedidosVendedor.appendChild(
            criarCardPedidoVendedor(pedido, itensDoPedido, emailPorUserId.get(pedido.user_id))
        );
    });
}

function criarCardPedidoVendedor(pedido, itens, emailComprador) {
    const card = document.createElement("div");
    card.className = "pedido-card";

    const topo = document.createElement("div");
    topo.className = "pedido-card-topo";

    const dataFormatada = new Date(pedido.criado_em).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const infoTopo = document.createElement("div");
    infoTopo.innerHTML = `<p class="pedido-numero">${dataFormatada}</p>
                           <p class="pedido-comprador">${emailComprador || "Usuário removido"}</p>`;

    const statusEl = document.createElement("span");
    statusEl.className = "pedido-status " + pedido.status;
    statusEl.textContent = STATUS_LABEL[pedido.status] || pedido.status;

    topo.appendChild(infoTopo);
    topo.appendChild(statusEl);

    const itensLista = document.createElement("div");
    itensLista.className = "pedido-itens-lista";

    itens.forEach((item) => {
        const precoFormatado = (item.preco_unitario * item.quantidade).toLocaleString("pt-BR", {
            style: "currency", currency: "BRL",
        });
        const linha = document.createElement("div");
        linha.className = "pedido-item-linha";
        linha.innerHTML = `<span>${item.quantidade}x ${item.nome_produto}</span><span>${precoFormatado}</span>`;
        itensLista.appendChild(linha);
    });

    const rodape = document.createElement("div");
    rodape.className = "pedido-card-rodape";
    rodape.innerHTML = `<p class="pedido-endereco">${pedido.endereco}</p>`;

    card.appendChild(topo);
    card.appendChild(itensLista);
    card.appendChild(rodape);

    return card;
}

// ======================================================
// Início
// ======================================================
iniciarPainel();

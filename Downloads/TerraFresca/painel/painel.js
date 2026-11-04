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
    carregarDashboard();
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
        carregarDashboard();
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

    // Carregar status por loja para cada pedido
    let statusPorPedido = {};
    if (pedidos.length > 0) {
        const { data: lojasStatus } = await supabaseClient
            .from("pedido_loja_status")
            .select("pedido_id, loja, status")
            .in("pedido_id", pedidoIds)
            .eq("loja", lojaAtual);

        if (lojasStatus) {
            lojasStatus.forEach((ls) => {
                statusPorPedido[ls.pedido_id] = ls.status;
            });
        }
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
            criarCardPedidoVendedor(pedido, itensDoPedido, emailPorUserId.get(pedido.user_id), statusPorPedido)
        );
    });
}

function criarCardPedidoVendedor(pedido, itens, emailComprador, statusPorPedido) {
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

    // Dropdown de status por loja (substitui o badge read-only)
    const statusAtualLoja = statusPorPedido[pedido.id] || "pendente";
    const selectStatus = document.createElement("select");
    selectStatus.className = "pedido-loja-status-select";

    const opcoesStatus = [
        { valor: "pendente", label: "Pendente" },
        { valor: "pago", label: "Pago" },
        { valor: "enviado", label: "Enviado" },
        { valor: "entregue", label: "Entregue" },
    ];

    opcoesStatus.forEach((op) => {
        const option = document.createElement("option");
        option.value = op.valor;
        option.textContent = op.label;
        if (op.valor === statusAtualLoja) option.selected = true;
        selectStatus.appendChild(option);
    });

    selectStatus.addEventListener("change", async () => {
        const novoStatus = selectStatus.value;
        selectStatus.disabled = true;

        try {
            const { error } = await supabaseClient.functions.invoke("atualizar-status-loja", {
                body: { pedido_id: pedido.id, loja: lojaAtual, novo_status: novoStatus },
            });

            if (error) {
                alert("Erro ao atualizar status: " + error.message);
                selectStatus.value = statusAtualLoja;
            } else {
                alert("Status da sua loja atualizado com sucesso!");
            }
        } catch (err) {
            alert("Erro ao atualizar status: " + err.message);
            selectStatus.value = statusAtualLoja;
        } finally {
            selectStatus.disabled = false;
        }
    });

    topo.appendChild(infoTopo);
    topo.appendChild(selectStatus);

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
// Dashboard de Analytics do Vendedor
// ======================================================
async function carregarDashboard() {
    if (!lojaAtual) return;

    const statPedidos = document.getElementById("stat-total-pedidos");
    const statConcluidos = document.getElementById("stat-pedidos-concluidos");
    const statFaturamento = document.getElementById("stat-faturamento");
    const statAvaliacao = document.getElementById("stat-avaliacao-media");
    const chartCanvas = document.getElementById("dashboard-chart");
    const chartVazio = document.getElementById("dashboard-chart-vazio");

    if (!statPedidos || !chartCanvas) return;

    // Resetar valores
    statPedidos.textContent = "—";
    statConcluidos.textContent = "—";
    statFaturamento.textContent = "—";
    statAvaliacao.textContent = "—";

    // Buscar itens de pedido desta loja nos últimos 30 dias
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const { data: itensLoja, error: itensError } = await supabaseClient
        .from("pedido_itens")
        .select("pedido_id, preco_unitario, quantidade")
        .eq("loja", lojaAtual);

    if (itensError || !itensLoja || itensLoja.length === 0) {
        desenharGraficoVendas(chartCanvas, [], chartVazio);
        return;
    }

    const pedidoIds = [...new Set(itensLoja.map((i) => i.pedido_id))];

    // Buscar dados dos pedidos correspondentes
    const { data: pedidos } = await supabaseClient
        .from("pedidos")
        .select("id, status, total, criado_em")
        .in("id", pedidoIds)
        .gte("criado_em", trintaDiasAtras.toISOString());

    const pedidosValidos = pedidos || [];

    // Métricas
    const totalPedidos = pedidosValidos.length;
    const concluidos = pedidosValidos.filter(
        (p) => p.status === "entregue" || p.status === "enviado"
    ).length;

    // Faturamento estimado: soma dos itens desta loja (não o total do pedido)
    const itensDosPedidosValidos = itensLoja.filter((i) =>
        pedidosValidos.some((p) => p.id === i.pedido_id)
    );
    const faturamento = itensDosPedidosValidos.reduce(
        (soma, i) => soma + Number(i.preco_unitario) * Number(i.quantidade),
        0
    );

    statPedidos.textContent = totalPedidos;
    statConcluidos.textContent = concluidos;
    statFaturamento.textContent = formatarPreco(faturamento);

    // Avaliação média dos produtos desta loja
    const { data: produtosLoja } = await supabaseClient
        .from("produtos")
        .select("id")
        .eq("loja", lojaAtual);

    if (produtosLoja && produtosLoja.length > 0) {
        const produtoIds = produtosLoja.map((p) => p.id);
        const { data: avaliacoes } = await supabaseClient
            .from("avaliacoes")
            .select("nota")
            .in("produto_id", produtoIds);

        if (avaliacoes && avaliacoes.length > 0) {
            const media =
                avaliacoes.reduce((s, a) => s + Number(a.nota), 0) /
                avaliacoes.length;
            statAvaliacao.textContent = media.toFixed(1) + " ★";
        } else {
            statAvaliacao.textContent = "Sem avaliações";
        }
    } else {
        statAvaliacao.textContent = "—";
    }

    // Gráfico de vendas por dia (últimos 14 dias)
    const quatorzeDiasAtras = new Date();
    quatorzeDiasAtras.setDate(quatorzeDiasAtras.getDate() - 14);

    const pedidosRecentes = pedidosValidos.filter(
        (p) => new Date(p.criado_em) >= quatorzeDiasAtras
    );

    // Agrupar faturamento por dia
    const vendasPorDia = new Map();
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const chave = d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
        });
        vendasPorDia.set(chave, 0);
    }

    pedidosRecentes.forEach((p) => {
        const chave = new Date(p.criado_em).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
        });
        if (vendasPorDia.has(chave)) {
            // Soma apenas os itens desta loja neste pedido
            const itensDoPedidoNestaLoja = itensLoja.filter(
                (i) => i.pedido_id === p.id
            );
            const valorLoja = itensDoPedidoNestaLoja.reduce(
                (s, i) => s + Number(i.preco_unitario) * Number(i.quantidade),
                0
            );
            vendasPorDia.set(chave, vendasPorDia.get(chave) + valorLoja);
        }
    });

    desenharGraficoVendas(chartCanvas, vendasPorDia, chartVazio);
}

function desenharGraficoVendas(canvas, dadosMap, elVazio) {
    const ctx = canvas.getContext("2d");
    const labels = [...dadosMap.keys()];
    const valores = [...dadosMap.values()];
    const maxVal = Math.max(...valores, 1);
    const temDados = valores.some((v) => v > 0);

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!temDados) {
        if (elVazio) elVazio.classList.remove("hidden");
        return;
    }
    if (elVazio) elVazio.classList.add("hidden");

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const w = canvas.width - padding.left - padding.right;
    const h = canvas.height - padding.top - padding.bottom;
    const barWidth = w / labels.length - 4;

    // Cor do tema
    const corBarra = "#1E3320"; // forest
    const corTexto = "#5C5346"; // ink-soft
    const corGrid = "#E9DCC7"; // nude-light

    // Linhas de grade horizontais
    ctx.strokeStyle = corGrid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();

        // Rótulos do eixo Y
        ctx.fillStyle = corTexto;
        ctx.font = "11px Work Sans, sans-serif";
        ctx.textAlign = "right";
        const valLabel = Math.round(maxVal - (maxVal / 4) * i);
        ctx.fillText("R$" + valLabel, padding.left - 8, y + 4);
    }

    // Barras
    labels.forEach((label, i) => {
        const x = padding.left + i * (w / labels.length) + 2;
        const barH = (valores[i] / maxVal) * h;
        const y = padding.top + h - barH;

        // Barra
        ctx.fillStyle = corBarra;
        ctx.fillRect(x, y, barWidth, barH);

        // Sombra estilo cordel
        ctx.fillStyle = "#B8863B"; // honey
        ctx.fillRect(x + barWidth, y + 3, 3, barH);
        ctx.fillRect(x + 3, y + barH, barWidth, 3);

        // Rótulo do eixo X
        ctx.fillStyle = corTexto;
        ctx.font = "10px Work Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - 8);
        ctx.rotate(-0.4);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });
}

// ======================================================
// Notificação de novos pedidos — polling a cada 30s para
// detectar pedidos pendentes da loja. Toca um som curto
// e mostra um badge pulsante no título da seção quando
// há pedidos novos desde a última verificação.
// ======================================================
let idsPedidosConhecidos = new Set();
let notificacaoInicializada = false;

async function verificarNovosPedidos() {
    if (!lojaAtual) return;

    const { data: itens } = await supabaseClient
        .from("pedido_itens")
        .select("pedido_id")
        .eq("loja", lojaAtual);

    if (!itens || itens.length === 0) return;

    const pedidoIds = [...new Set(itens.map((i) => i.pedido_id))];

    // Busca apenas os pendentes (novos)
    const { data: pendentes } = await supabaseClient
        .from("pedidos")
        .select("id")
        .in("id", pedidoIds)
        .eq("status", "pendente");

    const idsPendentes = new Set((pendentes || []).map((p) => p.id));

    if (!notificacaoInicializada) {
        // Primeira carga: registra os existentes sem notificar
        idsPedidosConhecidos = idsPendentes;
        notificacaoInicializada = true;
        atualizarBadgeNotificacao(0);
        return;
    }

    // Detecta pedidos novos que não estavam na verificação anterior
    let novosCount = 0;
    idsPendentes.forEach((id) => {
        if (!idsPedidosConhecidos.has(id)) {
            novosCount++;
        }
    });

    if (novosCount > 0) {
        tocarSomNotificacao();
        mostrarToastNovoPedido(novosCount);
    }

    idsPedidosConhecidos = idsPendentes;
    atualizarBadgeNotificacao(idsPendentes.size);
}

function atualizarBadgeNotificacao(count) {
    let badge = document.getElementById("badge-novos-pedidos");

    if (!badge) {
        // O <h2> é o primeiro filho da section que contém #lista-pedidos-vendedor
        const secaoPedidos = document.querySelector("#lista-pedidos-vendedor")?.closest("section");
        const tituloPedidos = secaoPedidos ? secaoPedidos.querySelector("h2") : null;
        if (!tituloPedidos) return;

        badge = document.createElement("span");
        badge.id = "badge-novos-pedidos";
        badge.className = "badge-notificacao hidden";
        tituloPedidos.style.display = "inline-flex";
        tituloPedidos.style.alignItems = "center";
        tituloPedidos.style.gap = "10px";
        tituloPedidos.appendChild(badge);
    }

    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("hidden");
        badge.classList.add("pulse");
    } else {
        badge.classList.add("hidden");
        badge.classList.remove("pulse");
    }
}

function tocarSomNotificacao() {
    // Som curto de notificação gerado via Web Audio API
    // (sem dependência de arquivo externo)
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        // Web Audio API não suportada ou bloqueada — ignora silenciosamente
        console.warn("Não foi possível tocar som de notificação:", e);
    }
}

function mostrarToastNovoPedido(count) {
    const mensagem = count === 1
        ? "🔔 Novo pedido recebido!"
        : `🔔 ${count} novos pedidos recebidos!`;

    if (window.Toastify) {
        Toastify({
            text: mensagem,
            duration: 5000,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: { background: "#1E3320" },
        }).showToast();
    }
}

function iniciarPollingPedidos() {
    // Verifica imediatamente e depois a cada 30 segundos
    verificarNovosPedidos();
    setInterval(verificarNovosPedidos, 30000);
}

// ======================================================
// Início
// ======================================================
iniciarPainel();
iniciarPollingPedidos();

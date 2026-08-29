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

const listaEl = document.getElementById("pedidos-lista");

let usuarioId = null;
let produtosJaAvaliados = new Set();

function formatarData(dataIso) {
    const data = new Date(dataIso);
    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

async function carregarPedidos() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login/index.html";
        return;
    }

    usuarioId = session.user.id;

    const { data: avaliacoes } = await supabaseClient
        .from("avaliacoes")
        .select("produto_id")
        .eq("user_id", usuarioId);

    produtosJaAvaliados = new Set((avaliacoes || []).map((a) => a.produto_id));

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("id, status, endereco, total, subtotal, desconto, frete, cupom_codigo, criado_em, pedido_itens(produto_id, nome_produto, loja, preco_unitario, quantidade)")
        .eq("user_id", usuarioId)
        .order("criado_em", { ascending: false });

    if (error) {
        listaEl.innerHTML = '<p class="painel-vazio">Não foi possível carregar seus pedidos.</p>';
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        listaEl.innerHTML = '<p class="painel-vazio">Você ainda não fez nenhum pedido. Que tal dar uma olhada no cardápio de uma das nossas lojas?</p>';
        return;
    }

    listaEl.innerHTML = "";
    data.forEach((pedido, index) => {
        listaEl.appendChild(criarCardPedido(pedido, data.length - index));
    });
}

function criarCardPedido(pedido, numero) {
    const card = document.createElement("div");
    card.className = "pedido-card";

    const topo = document.createElement("div");
    topo.className = "pedido-card-topo";

    const numeroEl = document.createElement("p");
    numeroEl.className = "pedido-numero";
    numeroEl.textContent = "Pedido #" + numero;

    const dataEl = document.createElement("p");
    dataEl.className = "pedido-data";
    dataEl.textContent = formatarData(pedido.criado_em);

    const statusEl = document.createElement("span");
    statusEl.className = "pedido-status " + pedido.status;
    statusEl.textContent = STATUS_LABEL[pedido.status] || pedido.status;

    const infoTopo = document.createElement("div");
    infoTopo.appendChild(numeroEl);
    infoTopo.appendChild(dataEl);

    topo.appendChild(infoTopo);
    topo.appendChild(statusEl);

    const itensLista = document.createElement("div");
    itensLista.className = "pedido-itens-lista";

    (pedido.pedido_itens || []).forEach((item) => {
        itensLista.appendChild(criarLinhaItem(item, pedido.status));
    });

    const rodape = document.createElement("div");
    rodape.className = "pedido-card-rodape";

    const resumo = document.createElement("div");

    const endereco = document.createElement("p");
    endereco.className = "pedido-endereco";
    endereco.textContent = pedido.endereco;
    resumo.appendChild(endereco);

    if (pedido.subtotal != null && (pedido.frete || pedido.desconto)) {
        const detalhes = document.createElement("p");
        detalhes.className = "pedido-endereco";
        const partes = [`Subtotal: ${formatarPreco(pedido.subtotal)}`];
        if (pedido.frete) partes.push(`Frete: ${formatarPreco(pedido.frete)}`);
        if (pedido.desconto) partes.push(`Cupom ${pedido.cupom_codigo || ""}: -${formatarPreco(pedido.desconto)}`);
        detalhes.textContent = partes.join(" · ");
        resumo.appendChild(detalhes);
    }

    const total = document.createElement("p");
    total.className = "pedido-total";
    total.textContent = formatarPreco(pedido.total);

    rodape.appendChild(resumo);
    rodape.appendChild(total);

    card.appendChild(topo);
    card.appendChild(itensLista);
    card.appendChild(rodape);

    return card;
}

function criarLinhaItem(item, statusPedido) {
    const wrapper = document.createElement("div");

    const linha = document.createElement("div");
    linha.className = "pedido-item-linha";

    const nomeSpan = document.createElement("span");
    nomeSpan.innerHTML = `${item.quantidade}x ${item.nome_produto} <span class="loja">· ${NOMES_LOJA[item.loja] || item.loja}</span>`;

    const ladoDireito = document.createElement("span");
    ladoDireito.className = "flex items-center gap-3";

    const precoSpan = document.createElement("span");
    precoSpan.textContent = formatarPreco(item.preco_unitario * item.quantidade);
    ladoDireito.appendChild(precoSpan);

    linha.appendChild(nomeSpan);
    linha.appendChild(ladoDireito);
    wrapper.appendChild(linha);

    // Só pode avaliar quem recebeu o pedido, e só uma vez por produto
    const podeAvaliar = statusPedido === "entregue" && item.produto_id && !produtosJaAvaliados.has(item.produto_id);

    if (podeAvaliar) {
        const areaAvaliacao = document.createElement("div");
        areaAvaliacao.className = "avaliacao-area";

        const btnAvaliar = document.createElement("button");
        btnAvaliar.type = "button";
        btnAvaliar.className = "avaliacao-btn-abrir";
        btnAvaliar.textContent = "Avaliar este produto";

        btnAvaliar.addEventListener("click", () => {
            areaAvaliacao.innerHTML = "";
            areaAvaliacao.appendChild(criarFormularioAvaliacao(item, wrapper));
        });

        areaAvaliacao.appendChild(btnAvaliar);
        wrapper.appendChild(areaAvaliacao);
    } else if (item.produto_id && produtosJaAvaliados.has(item.produto_id)) {
        const jaAvaliado = document.createElement("p");
        jaAvaliado.className = "avaliacao-ja-feita";
        jaAvaliado.textContent = "Você já avaliou este produto. Obrigado!";
        wrapper.appendChild(jaAvaliado);
    }

    return wrapper;
}

function criarFormularioAvaliacao(item, wrapperItem) {
    const form = document.createElement("form");
    form.className = "avaliacao-form";

    const estrelasWrapper = document.createElement("div");
    estrelasWrapper.className = "avaliacao-estrelas";
    let notaEscolhida = 0;

    for (let i = 1; i <= 5; i++) {
        const estrela = document.createElement("button");
        estrela.type = "button";
        estrela.className = "fa fa-star";
        estrela.dataset.valor = i;
        estrela.addEventListener("click", () => {
            notaEscolhida = i;
            [...estrelasWrapper.children].forEach((el, idx) => {
                el.classList.toggle("selecionada", idx < notaEscolhida);
            });
        });
        estrelasWrapper.appendChild(estrela);
    }

    const comentario = document.createElement("textarea");
    comentario.rows = 2;
    comentario.placeholder = "Conte como foi sua experiência com o produto (opcional)";

    const mensagem = document.createElement("p");
    mensagem.className = "avaliacao-mensagem";

    const btnEnviar = document.createElement("button");
    btnEnviar.type = "submit";
    btnEnviar.className = "btn";
    btnEnviar.textContent = "Enviar avaliação";

    form.appendChild(estrelasWrapper);
    form.appendChild(comentario);
    form.appendChild(mensagem);
    form.appendChild(btnEnviar);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (notaEscolhida === 0) {
            mensagem.textContent = "Escolha de 1 a 5 estrelas antes de enviar.";
            mensagem.classList.add("erro");
            return;
        }

        const { error } = await supabaseClient.from("avaliacoes").insert({
            produto_id: item.produto_id,
            user_id: usuarioId,
            nota: notaEscolhida,
            comentario: comentario.value.trim() || null,
        });

        if (error) {
            mensagem.textContent = "Não foi possível enviar sua avaliação.";
            mensagem.classList.add("erro");
            console.error(error);
            return;
        }

        produtosJaAvaliados.add(item.produto_id);

        const sucesso = document.createElement("p");
        sucesso.className = "avaliacao-ja-feita";
        sucesso.textContent = "Avaliação enviada — obrigado por avaliar!";

        wrapperItem.querySelector(".avaliacao-area").replaceWith(sucesso);
    });

    return form;
}

carregarPedidos();

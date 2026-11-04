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

const estadoCarregando = document.getElementById("estado-carregando");
const estadoSemAcesso = document.getElementById("estado-sem-acesso");
const adminConteudo = document.getElementById("admin-conteudo");

const statsEl = document.getElementById("admin-stats");
const buscaEmailInput = document.getElementById("busca-email");
const btnBuscar = document.getElementById("btn-buscar");
const resultadoBuscaEl = document.getElementById("resultado-busca");
const listaVendedoresEl = document.getElementById("lista-vendedores");
const listaPedidosEl = document.getElementById("admin-pedidos-lista");
const formCupom = document.getElementById("form-cupom");
const cupomFormMensagem = document.getElementById("cupom-form-mensagem");
const listaCupomEl = document.getElementById("lista-cupons");
const listaFretesEl = document.getElementById("lista-fretes");

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataIso) {
    return new Date(dataIso).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

// ======================================================
// Passo 1: só entra quem for admin de verdade
// (a checagem de segurança real está nas policies do
// banco — isso aqui só decide o que mostrar na tela)
// ======================================================
async function iniciarAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login/index.html";
        return;
    }

    const { data: souAdmin, error } = await supabaseClient.rpc("is_admin");

    estadoCarregando.classList.add("hidden");

    if (error || !souAdmin) {
        estadoSemAcesso.classList.remove("hidden");
        return;
    }

    adminConteudo.classList.remove("hidden");
    carregarEstatisticas();
    carregarGraficos();
    carregarVendedores();
    carregarPedidos();
    carregarCupons();
    carregarFretes();
}

// ======================================================
// Estatísticas rápidas
// ======================================================
async function carregarEstatisticas() {
    const { data: pedidos } = await supabaseClient.from("pedidos").select("status, total");

    const total = pedidos ? pedidos.length : 0;
    const pagos = (pedidos || []).filter((p) => p.status === "pago" || p.status === "enviado" || p.status === "entregue");
    const somaVendida = pagos.reduce((soma, p) => soma + Number(p.total), 0);

    statsEl.innerHTML = "";
    const cards = [
        { valor: total, rotulo: "Pedidos no total" },
        { valor: pagos.length, rotulo: "Pedidos pagos" },
        { valor: formatarPreco(somaVendida), rotulo: "Total vendido" },
    ];

    cards.forEach((c) => {
        const div = document.createElement("div");
        div.className = "admin-stat-card";
        div.innerHTML = `<p class="valor">${c.valor}</p><p class="rotulo">${c.rotulo}</p>`;
        statsEl.appendChild(div);
    });
}

// ======================================================
// Dashboard de vendas — gráfico de vendas por dia e de
// produtos mais vendidos. Considera só pedidos que viraram
// venda de verdade (pago, enviado ou entregue).
// ======================================================
async function carregarGraficos() {
    const { data: pedidos, error } = await supabaseClient
        .from("pedidos")
        .select("total, criado_em, pedido_itens(nome_produto, quantidade)")
        .in("status", ["pago", "enviado", "entregue"])
        .order("criado_em", { ascending: true });

    if (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        return;
    }

    desenharGraficoVendasPorDia(pedidos || []);
    desenharGraficoTopProdutos(pedidos || []);
}

function desenharGraficoVendasPorDia(pedidos) {
    const dias = [];
    const totalPorDia = new Map();

    for (let i = 13; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const chave = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        dias.push(chave);
        totalPorDia.set(chave, 0);
    }

    pedidos.forEach((pedido) => {
        const chave = new Date(pedido.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (totalPorDia.has(chave)) {
            totalPorDia.set(chave, totalPorDia.get(chave) + Number(pedido.total));
        }
    });

    const valores = dias.map((dia) => totalPorDia.get(dia));
    const semVendas = valores.every((v) => v === 0);

    document.getElementById("vendas-vazio").classList.toggle("hidden", !semVendas);
    if (semVendas) return;

    new Chart(document.getElementById("grafico-vendas-dia"), {
        type: "line",
        data: {
            labels: dias,
            datasets: [{
                label: "Vendas (R$)",
                data: valores,
                borderColor: "#1E3320",
                backgroundColor: "#B8863B",
                borderWidth: 3,
                pointBackgroundColor: "#B8863B",
                pointBorderColor: "#1E3320",
                pointBorderWidth: 2,
                pointRadius: 4,
                tension: 0,
                fill: false,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: (v) => "R$ " + v } },
            },
        },
    });
}

function desenharGraficoTopProdutos(pedidos) {
    const quantidadePorProduto = new Map();

    pedidos.forEach((pedido) => {
        (pedido.pedido_itens || []).forEach((item) => {
            const atual = quantidadePorProduto.get(item.nome_produto) || 0;
            quantidadePorProduto.set(item.nome_produto, atual + item.quantidade);
        });
    });

    document.getElementById("produtos-vazio").classList.toggle("hidden", quantidadePorProduto.size > 0);
    if (quantidadePorProduto.size === 0) return;

    const top5 = [...quantidadePorProduto.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    new Chart(document.getElementById("grafico-top-produtos"), {
        type: "bar",
        data: {
            labels: top5.map(([nome]) => nome),
            datasets: [{
                label: "Unidades vendidas",
                data: top5.map(([, quantidade]) => quantidade),
                backgroundColor: "#B8863B",
                borderColor: "#1E3320",
                borderWidth: 2,
                borderRadius: 0,
            }],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { precision: 0 } },
            },
        },
    });
}

// ======================================================
// Cupons de desconto
// ======================================================
formCupom.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = document.getElementById("cupom-codigo").value.trim().toUpperCase();
    const tipo = document.getElementById("cupom-tipo").value;
    const valor = parseFloat(document.getElementById("cupom-valor").value);
    const loja = document.getElementById("cupom-loja").value || null;
    const usosMaximosRaw = document.getElementById("cupom-usos-maximos").value;
    const validadeRaw = document.getElementById("cupom-validade").value;

    cupomFormMensagem.textContent = "Salvando...";
    cupomFormMensagem.className = "auth-message success";

    const { error } = await supabaseClient.from("cupons").insert({
        codigo,
        tipo,
        valor,
        loja,
        usos_maximos: usosMaximosRaw ? parseInt(usosMaximosRaw, 10) : null,
        valido_ate: validadeRaw ? new Date(validadeRaw + "T23:59:59").toISOString() : null,
    });

    if (error) {
        cupomFormMensagem.textContent = "Erro ao criar cupom: " + error.message;
        cupomFormMensagem.className = "auth-message error";
        return;
    }

    cupomFormMensagem.textContent = "Cupom criado!";
    cupomFormMensagem.className = "auth-message success";
    formCupom.reset();
    carregarCupons();
});

async function carregarCupons() {
    const { data, error } = await supabaseClient
        .from("cupons")
        .select("*")
        .order("criado_em", { ascending: false });

    if (error) {
        listaCupomEl.innerHTML = '<p class="painel-vazio">Não foi possível carregar os cupons.</p>';
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        listaCupomEl.innerHTML = '<p class="painel-vazio">Nenhum cupom cadastrado ainda.</p>';
        return;
    }

    listaCupomEl.innerHTML = "";
    data.forEach((cupom) => {
        listaCupomEl.appendChild(criarItemCupom(cupom));
    });
}

function criarItemCupom(cupom) {
    const item = document.createElement("div");
    item.className = "cupom-item" + (cupom.ativo ? "" : " inativo");

    const info = document.createElement("div");

    const codigo = document.createElement("p");
    codigo.className = "codigo";
    codigo.textContent = cupom.codigo;

    const valorTexto = cupom.tipo === "percentual" ? `${cupom.valor}%` : formatarPreco(cupom.valor);
    const lojaTexto = cupom.loja ? NOMES_LOJA[cupom.loja] || cupom.loja : "Qualquer loja";
    const usosTexto = cupom.usos_maximos ? `${cupom.usos_atuais}/${cupom.usos_maximos} usos` : `${cupom.usos_atuais} usos`;
    const validadeTexto = cupom.valido_ate
        ? "válido até " + new Date(cupom.valido_ate).toLocaleDateString("pt-BR")
        : "sem validade";

    const detalhes = document.createElement("p");
    detalhes.className = "detalhes";
    detalhes.textContent = `${valorTexto} de desconto · ${lojaTexto} · ${usosTexto} · ${validadeTexto}`;

    info.appendChild(codigo);
    info.appendChild(detalhes);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cupom.ativo ? "Desativar" : "Reativar";
    btn.addEventListener("click", async () => {
        await supabaseClient.from("cupons").update({ ativo: !cupom.ativo }).eq("id", cupom.id);
        carregarCupons();
    });

    item.appendChild(info);
    item.appendChild(btn);

    return item;
}

// ======================================================
// Frete por loja
// ======================================================
async function carregarFretes() {
    const { data, error } = await supabaseClient
        .from("config_frete")
        .select("loja, valor_frete")
        .order("loja");

    if (error) {
        listaFretesEl.innerHTML = '<p class="painel-vazio">Não foi possível carregar o frete.</p>';
        console.error(error);
        return;
    }

    listaFretesEl.innerHTML = "";
    (data || []).forEach((linha) => {
        listaFretesEl.appendChild(criarItemFrete(linha));
    });
}

function criarItemFrete(linha) {
    const item = document.createElement("div");
    item.className = "admin-frete-item";

    const nomeLoja = document.createElement("span");
    nomeLoja.className = "loja";
    nomeLoja.textContent = NOMES_LOJA[linha.loja] || linha.loja;

    const campo = document.createElement("div");
    campo.className = "campo-frete";

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.min = "0";
    input.value = linha.valor_frete;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Salvar";
    btn.addEventListener("click", async () => {
        const novoValor = parseFloat(input.value);
        if (isNaN(novoValor) || novoValor < 0) return;

        await supabaseClient
            .from("config_frete")
            .update({ valor_frete: novoValor })
            .eq("loja", linha.loja);

        btn.textContent = "Salvo!";
        setTimeout(() => (btn.textContent = "Salvar"), 1500);
    });

    campo.appendChild(input);
    campo.appendChild(btn);

    item.appendChild(nomeLoja);
    item.appendChild(campo);

    return item;
}

// ======================================================
// Passo 2: buscar usuário por e-mail e torná-lo vendedor
// ======================================================
btnBuscar.addEventListener("click", buscarUsuario);
buscaEmailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscarUsuario();
});

async function buscarUsuario() {
    const termo = buscaEmailInput.value.trim();
    if (!termo) return;

    resultadoBuscaEl.innerHTML = '<p class="painel-vazio">Buscando...</p>';

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, email, full_name")
        .ilike("email", `%${termo}%`)
        .limit(5);

    if (error || !data || data.length === 0) {
        resultadoBuscaEl.innerHTML = '<p class="painel-vazio">Nenhum usuário encontrado com esse e-mail.</p>';
        return;
    }

    resultadoBuscaEl.innerHTML = "";
    data.forEach((usuario) => {
        resultadoBuscaEl.appendChild(criarItemBusca(usuario));
    });
}

function criarItemBusca(usuario) {
    const item = document.createElement("div");
    item.className = "admin-resultado-item";

    const email = document.createElement("span");
    email.className = "email";
    email.textContent = usuario.email || usuario.id;

    const acoes = document.createElement("div");
    acoes.className = "admin-resultado-acoes";

    const select = document.createElement("select");
    Object.entries(NOMES_LOJA).forEach(([valor, nome]) => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = nome;
        select.appendChild(option);
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Tornar vendedor";
    btn.addEventListener("click", async () => {
        const { error } = await supabaseClient
            .from("vendedores")
            .insert({ user_id: usuario.id, loja: select.value });

        if (error) {
            alert("Erro ao vincular vendedor: " + error.message);
            return;
        }

        btn.textContent = "Vinculado!";
        btn.disabled = true;
        carregarVendedores();
    });

    acoes.appendChild(select);
    acoes.appendChild(btn);

    item.appendChild(email);
    item.appendChild(acoes);

    return item;
}

// ======================================================
// Passo 3: listar vendedores atuais (com opção de remover)
// ======================================================
async function carregarVendedores() {
    const { data, error } = await supabaseClient
        .from("vendedores")
        .select("id, loja, user_id")
        .order("loja");

    if (error) {
        listaVendedoresEl.innerHTML = '<p class="painel-vazio">Não foi possível carregar os vendedores.</p>';
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        listaVendedoresEl.innerHTML = '<p class="painel-vazio">Nenhum vendedor vinculado ainda.</p>';
        return;
    }

    // "vendedores" não tem uma chave estrangeira direta para "profiles"
    // (as duas apontam para auth.users, mas não uma para a outra), então
    // o Supabase não consegue montar esse embed automático — buscamos os
    // e-mails à parte e juntamos aqui.
    const userIds = [...new Set(data.map((v) => v.user_id))];
    const { data: perfis } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

    const emailPorUserId = new Map((perfis || []).map((p) => [p.id, p.email]));

    listaVendedoresEl.innerHTML = "";
    data.forEach((vinculo) => {
        const item = document.createElement("div");
        item.className = "painel-produto-item";

        const email = emailPorUserId.get(vinculo.user_id) || "Usuário removido";

        const info = document.createElement("div");
        info.className = "painel-produto-info";
        info.innerHTML = `<p class="nome">${email}</p>
                           <p class="detalhes">Vendedor de ${NOMES_LOJA[vinculo.loja] || vinculo.loja}</p>`;

        const acoes = document.createElement("div");
        acoes.className = "painel-produto-acoes";

        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "excluir";
        btnRemover.textContent = "Remover acesso";
        btnRemover.addEventListener("click", async () => {
            const confirmar = window.confirm("Remover o acesso desse vendedor a essa loja?");
            if (!confirmar) return;

            await supabaseClient.from("vendedores").delete().eq("id", vinculo.id);
            carregarVendedores();
        });

        acoes.appendChild(btnRemover);

        item.appendChild(info);
        item.appendChild(acoes);
        listaVendedoresEl.appendChild(item);
    });
}

// ======================================================
// Passo 4: todos os pedidos, com troca de status
// ======================================================
async function carregarPedidos() {
    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("id, status, endereco, total, subtotal, desconto, frete, cupom_codigo, criado_em, user_id, pedido_itens(nome_produto, loja, preco_unitario, quantidade), pedido_loja_status(loja, status)")
        .order("criado_em", { ascending: false })
        .limit(50);

    if (error) {
        listaPedidosEl.innerHTML = '<p class="painel-vazio">Não foi possível carregar os pedidos.</p>';
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        listaPedidosEl.innerHTML = '<p class="painel-vazio">Nenhum pedido feito ainda.</p>';
        return;
    }

    // Mesmo caso da lista de vendedores: sem FK direta entre "pedidos" e
    // "profiles", buscamos os e-mails à parte.
    const userIds = [...new Set(data.map((p) => p.user_id))];
    const { data: perfis } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

    const emailPorUserId = new Map((perfis || []).map((p) => [p.id, p.email]));

    listaPedidosEl.innerHTML = "";
    data.forEach((pedido) => {
        listaPedidosEl.appendChild(criarCardPedidoAdmin(pedido, emailPorUserId.get(pedido.user_id)));
    });
}

function criarCardPedidoAdmin(pedido, emailComprador) {
    const card = document.createElement("div");
    card.className = "pedido-card";

    const topo = document.createElement("div");
    topo.className = "pedido-card-topo";

    const infoTopo = document.createElement("div");
    infoTopo.innerHTML = `<p class="pedido-numero">${formatarData(pedido.criado_em)}</p>
                           <p class="pedido-comprador">${emailComprador || "Usuário removido"}</p>`;

    const select = document.createElement("select");
    select.className = "admin-pedido-status-select";
    Object.entries(STATUS_LABEL).forEach(([valor, label]) => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = label;
        if (valor === pedido.status) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener("change", async () => {
        const novoStatus = select.value;
        select.disabled = true;

        try {
            // Atualiza status global do pedido
            const { error } = await supabaseClient
                .from("pedidos")
                .update({ status: novoStatus })
                .eq("id", pedido.id);

            if (error) {
                alert("Erro ao atualizar status: " + error.message);
                return;
            }

            // Propaga o novo status para todas as lojas deste pedido
            const { data: lojasDoPedido } = await supabaseClient
                .from("pedido_loja_status")
                .select("loja")
                .eq("pedido_id", pedido.id);

            if (lojasDoPedido && lojasDoPedido.length > 0) {
                for (const { loja } of lojasDoPedido) {
                    await supabaseClient
                        .from("pedido_loja_status")
                        .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
                        .eq("pedido_id", pedido.id)
                        .eq("loja", loja);
                }
            }

            // Dispara notificação por e-mail sem bloquear a interface do admin.
            // Erros de envio são logados mas não revertem a mudança de status.
            dispararNotificacaoEmail(pedido.id, novoStatus);
        } finally {
            select.disabled = false;
        }
    });

    topo.appendChild(infoTopo);
    topo.appendChild(select);

    const itensLista = document.createElement("div");
    itensLista.className = "pedido-itens-lista";

    (pedido.pedido_itens || []).forEach((item) => {
        const linha = document.createElement("div");
        linha.className = "pedido-item-linha";
        linha.innerHTML = `<span>${item.quantidade}x ${item.nome_produto} <span class="loja">· ${NOMES_LOJA[item.loja] || item.loja}</span></span>
                            <span>${formatarPreco(item.preco_unitario * item.quantidade)}</span>`;
        itensLista.appendChild(linha);
    });

    // Status por loja (se disponível na tabela pedido_loja_status)
    const lojasStatusEl = document.createElement("div");
    lojasStatusEl.className = "admin-pedido-lojas-status";
    if (pedido.pedido_loja_status && pedido.pedido_loja_status.length > 0) {
        pedido.pedido_loja_status.forEach((ls) => {
            const tag = document.createElement("span");
            tag.className = `admin-loja-tag status-${ls.status}`;
            tag.textContent = `${NOMES_LOJA[ls.loja] || ls.loja}: ${STATUS_LABEL[ls.status] || ls.status}`;
            lojasStatusEl.appendChild(tag);
        });
    }

    const rodape = document.createElement("div");
    rodape.className = "pedido-card-rodape";

    const detalhesValor = [];
    if (pedido.subtotal != null) detalhesValor.push(`Subtotal: ${formatarPreco(pedido.subtotal)}`);
    if (pedido.frete) detalhesValor.push(`Frete: ${formatarPreco(pedido.frete)}`);
    if (pedido.desconto) detalhesValor.push(`Cupom ${pedido.cupom_codigo || ""}: -${formatarPreco(pedido.desconto)}`);

    rodape.innerHTML = `
        <div>
            <p class="pedido-endereco">${pedido.endereco}</p>
            ${detalhesValor.length > 0 ? `<p class="pedido-comprador">${detalhesValor.join(" · ")}</p>` : ""}
        </div>
        <p class="pedido-total">${formatarPreco(pedido.total)}</p>
    `;

    card.appendChild(topo);
    card.appendChild(itensLista);
    if (lojasStatusEl.children.length > 0) card.appendChild(lojasStatusEl);
    card.appendChild(rodape);

    return card;
}

// ======================================================
// Notificação por e-mail ao comprador quando o status muda
// ======================================================
async function dispararNotificacaoEmail(pedidoId, novoStatus) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        await supabaseClient.functions.invoke("notificar-status-pedido", {
            body: { pedido_id: pedidoId, novo_status: novoStatus },
        });
    } catch (erro) {
        console.error("Erro ao disparar notificação por e-mail:", erro);
    }
}

// ======================================================
// Solicitações de Loja — Aprovação / Rejeição
// ======================================================
const listaSolicitacoesPendentes = document.getElementById("lista-solicitacoes-pendentes");
const listaSolicitacoesHistorico = document.getElementById("lista-solicitacoes-historico");
const badgeSolicitacoes = document.getElementById("badge-solicitacoes");
const abasSolicitacoes = document.querySelectorAll(".admin-aba");

abasSolicitacoes.forEach((aba) => {
    aba.addEventListener("click", () => {
        abasSolicitacoes.forEach((a) => a.classList.remove("ativa"));
        aba.classList.add("ativa");

        if (aba.dataset.aba === "pendentes") {
            listaSolicitacoesPendentes.classList.remove("hidden");
            listaSolicitacoesHistorico.classList.add("hidden");
        } else {
            listaSolicitacoesPendentes.classList.add("hidden");
            listaSolicitacoesHistorico.classList.remove("hidden");
        }
    });
});

async function carregarSolicitacoesLojas() {
    const { data, error } = await supabaseClient
        .from("lojas")
        .select("*")
        .order("criado_em", { ascending: false });

    if (error) {
        console.error("Erro ao carregar solicitações:", error);
        return;
    }

    const pendentes = (data || []).filter((l) => l.status === "pendente");
    const historico = (data || []).filter((l) => l.status !== "pendente");

    // Atualizar badge
    if (pendentes.length > 0) {
        badgeSolicitacoes.textContent = pendentes.length;
        badgeSolicitacoes.classList.remove("hidden");
    } else {
        badgeSolicitacoes.classList.add("hidden");
    }

    // Renderizar pendentes
    if (pendentes.length === 0) {
        listaSolicitacoesPendentes.innerHTML = '<p class="painel-vazio">Nenhuma solicitação pendente.</p>';
    } else {
        listaSolicitacoesPendentes.innerHTML = "";
        pendentes.forEach((loja) => {
            listaSolicitacoesPendentes.appendChild(criarCardSolicitacao(loja, true));
        });
    }

    // Renderizar histórico
    if (historico.length === 0) {
        listaSolicitacoesHistorico.innerHTML = '<p class="painel-vazio">Nenhum histórico de solicitações.</p>';
    } else {
        listaSolicitacoesHistorico.innerHTML = "";
        historico.forEach((loja) => {
            listaSolicitacoesHistorico.appendChild(criarCardSolicitacao(loja, false));
        });
    }
}

function criarCardSolicitacao(loja, mostrarAcoes) {
    const card = document.createElement("div");
    card.className = "admin-solicitacao-card";

    const planoLabel = { basico: "Básico", profissional: "Profissional", premium: "Premium" };
    const statusLabel = { aprovada: "Aprovada", rejeitada: "Rejeitada" };

    let html = `
        <div class="admin-solicitacao-info">
            ${loja.logo_url ? `<img src="${loja.logo_url}" alt="${loja.nome}" class="admin-solicitacao-logo">` : ""}
            <div>
                <p class="nome">${loja.nome}</p>
                <p class="detalhes">URL: /loja/${loja.slug} · Plano: ${planoLabel[loja.plano] || loja.plano}</p>
                ${loja.descricao ? `<p class="descricao">${loja.descricao}</p>` : ""}
                <p class="data">Solicitado em: ${formatarData(loja.criado_em)}</p>
                ${!mostrarAcoes && loja.status !== "pendente" ? `<p class="status-decisao status-${loja.status}">${statusLabel[loja.status] || loja.status}${loja.motivo_rejeicao ? " — " + loja.motivo_rejeicao : ""}</p>` : ""}
            </div>
        </div>
    `;

    if (mostrarAcoes) {
        html += `
            <div class="admin-solicitacao-acoes">
                <button type="button" class="btn btn-aprovar" data-id="${loja.id}">Aprovar</button>
                <button type="button" class="btn btn-rejeitar" data-id="${loja.id}">Rejeitar</button>
            </div>
        `;
    }

    card.innerHTML = html;

    if (mostrarAcoes) {
        card.querySelector(".btn-aprovar").addEventListener("click", async () => {
            await atualizarStatusLoja(loja.id, "aprovada");
        });

        card.querySelector(".btn-rejeitar").addEventListener("click", async () => {
            const motivo = window.prompt("Motivo da rejeição (opcional):");
            await atualizarStatusLoja(loja.id, "rejeitada", motivo);
        });
    }

    return card;
}

async function atualizarStatusLoja(lojaId, novoStatus, motivo) {
    const dados = { status: novoStatus, atualizado_em: new Date().toISOString() };
    if (novoStatus === "rejeitada" && motivo) {
        dados.motivo_rejeicao = motivo;
    }

    const { error } = await supabaseClient
        .from("lojas")
        .update(dados)
        .eq("id", lojaId);

    if (error) {
        alert("Erro ao atualizar: " + error.message);
        return;
    }

    carregarSolicitacoesLojas();
}

// ======================================================
// White-Label: configuração de branding por loja (admin)
// ======================================================
const adminWlLojaSelect = document.getElementById("admin-wl-loja-select");
const adminWlForm = document.getElementById("admin-wl-form");
const adminWlCorPrimaria = document.getElementById("admin-wl-cor-primaria");
const adminWlCorSecundaria = document.getElementById("admin-wl-cor-secundaria");
const adminWlCorFundo = document.getElementById("admin-wl-cor-fundo");
const adminWlFonteHeading = document.getElementById("admin-wl-fonte-heading");
const adminWlFonteBody = document.getElementById("admin-wl-fonte-body");
const adminWlDominio = document.getElementById("admin-wl-dominio");
const adminWlMensagem = document.getElementById("admin-wl-mensagem");
const adminBtnSalvarWl = document.getElementById("admin-btn-salvar-wl");
const adminBtnResetarWl = document.getElementById("admin-btn-resetar-wl");

const ADMIN_WL_PADRAO = {
    cor_primaria: "#1e3320",
    cor_secundaria: "#b8860b",
    cor_fundo: "#fbf8f2",
    fonte_heading: "Bevan",
    fonte_body: "Inter",
    dominio_custom: "",
};

let adminLojaSelecionada = null;

async function carregarLojasParaWL() {
    const { data, error } = await supabaseClient
        .from("lojas")
        .select("id, nome, slug, status, cor_primaria, cor_secundaria, cor_fundo, fonte_heading, fonte_body, dominio_custom")
        .eq("status", "aprovada")
        .order("nome");

    if (error || !data) return;

    adminWlLojaSelect.innerHTML = '<option value="">-- Escolha uma loja --</option>';
    data.forEach((loja) => {
        const option = document.createElement("option");
        option.value = loja.id;
        option.textContent = loja.nome;
        option.dataset.loja = JSON.stringify(loja);
        adminWlLojaSelect.appendChild(option);
    });
}

adminWlLojaSelect.addEventListener("change", () => {
    const selectedOption = adminWlLojaSelect.options[adminWlLojaSelect.selectedIndex];
    if (!selectedOption.value) {
        adminWlForm.classList.add("hidden");
        adminLojaSelecionada = null;
        return;
    }

    const loja = JSON.parse(selectedOption.dataset.loja);
    adminLojaSelecionada = loja;
    adminWlForm.classList.remove("hidden");
    adminWlMensagem.classList.add("hidden");

    adminWlCorPrimaria.value = loja.cor_primaria || ADMIN_WL_PADRAO.cor_primaria;
    adminWlCorSecundaria.value = loja.cor_secundaria || ADMIN_WL_PADRAO.cor_secundaria;
    adminWlCorFundo.value = loja.cor_fundo || ADMIN_WL_PADRAO.cor_fundo;
    adminWlFonteHeading.value = loja.fonte_heading || ADMIN_WL_PADRAO.fonte_heading;
    adminWlFonteBody.value = loja.fonte_body || ADMIN_WL_PADRAO.fonte_body;
    adminWlDominio.value = loja.dominio_custom || "";

    atualizarAdminWlHexLabels();
    atualizarAdminWlPreview();
});

function atualizarAdminWlHexLabels() {
    document.getElementById("admin-wl-cor-primaria-hex").textContent = adminWlCorPrimaria.value;
    document.getElementById("admin-wl-cor-secundaria-hex").textContent = adminWlCorSecundaria.value;
    document.getElementById("admin-wl-cor-fundo-hex").textContent = adminWlCorFundo.value;
}

function atualizarAdminWlPreview() {
    const preview = document.getElementById("admin-wl-preview");
    const header = preview.querySelector(".wl-preview-header");
    const cards = preview.querySelectorAll(".wl-preview-card");
    const precos = preview.querySelectorAll(".wl-preview-card-preco");
    const botoes = preview.querySelectorAll(".wl-preview-btn");
    const nomeCard = preview.querySelector(".wl-preview-card-nome");

    const corPrimaria = adminWlCorPrimaria.value;
    const corSecundaria = adminWlCorSecundaria.value;
    const corFundo = adminWlCorFundo.value;
    const fonteH = adminWlFonteHeading.value;
    const fonteB = adminWlFonteBody.value;

    preview.style.backgroundColor = corFundo;
    header.style.backgroundColor = corPrimaria;
    header.querySelector("h4").style.color = corFundo;
    header.querySelector("h4").style.fontFamily = `"${fonteH}", serif`;
    header.querySelector("p").style.color = corFundo;
    header.querySelector("p").style.fontFamily = `"${fonteB}", sans-serif`;

    cards.forEach((card) => {
        card.style.borderColor = corPrimaria;
    });

    precos.forEach((preco) => {
        preco.style.color = corSecundaria;
    });

    botoes.forEach((btn) => {
        btn.style.color = corPrimaria;
        btn.style.borderColor = corPrimaria;
    });

    if (nomeCard) {
        nomeCard.style.fontFamily = `"${fonteB}", sans-serif`;
    }
}

[adminWlCorPrimaria, adminWlCorSecundaria, adminWlCorFundo].forEach((input) => {
    input.addEventListener("input", () => {
        atualizarAdminWlHexLabels();
        atualizarAdminWlPreview();
    });
});

[adminWlFonteHeading, adminWlFonteBody].forEach((select) => {
    select.addEventListener("change", atualizarAdminWlPreview);
});

adminWlForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!adminLojaSelecionada) return;

    adminBtnSalvarWl.disabled = true;
    adminWlMensagem.textContent = "Salvando...";
    adminWlMensagem.className = "painel-mensagem";
    adminWlMensagem.classList.remove("hidden");

    const { error } = await supabaseClient
        .from("lojas")
        .update({
            cor_primaria: adminWlCorPrimaria.value,
            cor_secundaria: adminWlCorSecundaria.value,
            cor_fundo: adminWlCorFundo.value,
            fonte_heading: adminWlFonteHeading.value,
            fonte_body: adminWlFonteBody.value,
            dominio_custom: adminWlDominio.value.trim() || null,
            atualizado_em: new Date().toISOString(),
        })
        .eq("id", adminLojaSelecionada.id);

    adminBtnSalvarWl.disabled = false;

    if (error) {
        adminWlMensagem.textContent = "Erro ao salvar: " + error.message;
        adminWlMensagem.className = "painel-mensagem erro";
        return;
    }

    adminWlMensagem.textContent = "Configurações salvas com sucesso!";
    adminWlMensagem.className = "painel-mensagem sucesso";

    // Atualizar dados no select para refletir mudanças
    const option = adminWlLojaSelect.options[adminWlLojaSelect.selectedIndex];
    const lojaAtualizada = { ...adminLojaSelecionada,
        cor_primaria: adminWlCorPrimaria.value,
        cor_secundaria: adminWlCorSecundaria.value,
        cor_fundo: adminWlCorFundo.value,
        fonte_heading: adminWlFonteHeading.value,
        fonte_body: adminWlFonteBody.value,
        dominio_custom: adminWlDominio.value.trim() || null,
    };
    option.dataset.loja = JSON.stringify(lojaAtualizada);
    adminLojaSelecionada = lojaAtualizada;
});

adminBtnResetarWl.addEventListener("click", () => {
    adminWlCorPrimaria.value = ADMIN_WL_PADRAO.cor_primaria;
    adminWlCorSecundaria.value = ADMIN_WL_PADRAO.cor_secundaria;
    adminWlCorFundo.value = ADMIN_WL_PADRAO.cor_fundo;
    adminWlFonteHeading.value = ADMIN_WL_PADRAO.fonte_heading;
    adminWlFonteBody.value = ADMIN_WL_PADRAO.fonte_body;
    adminWlDominio.value = "";
    atualizarAdminWlHexLabels();
    atualizarAdminWlPreview();
});

iniciarAdmin();
carregarSolicitacoesLojas();
carregarLojasParaWL();

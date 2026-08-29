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
        .select("id, status, endereco, total, subtotal, desconto, frete, cupom_codigo, criado_em, user_id, pedido_itens(nome_produto, loja, preco_unitario, quantidade)")
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
        const { error } = await supabaseClient
            .from("pedidos")
            .update({ status: select.value })
            .eq("id", pedido.id);

        if (error) {
            alert("Erro ao atualizar status: " + error.message);
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
    card.appendChild(rodape);

    return card;
}

iniciarAdmin();

const menu = document.getElementById("menu")

const cartBtn = document.getElementById("cart-btn")

const cartModal = document.getElementById("cart-modal")

const cartItemsContainer = document.getElementById("cart-items")

const cartTotal = document.getElementById("cart-total")

const checkoutBtn = document.getElementById("checkout-btn")

const closeModalBtn = document.getElementById("close-modal-btn")

const cartCounter = document.getElementById("cart-count")

const addressInput = document.getElementById("address")

const addressWarn = document.getElementById("address-warn")

const cupomInput = document.getElementById("cupom-input")

const btnAplicarCupom = document.getElementById("btn-aplicar-cupom")

const cupomMensagem = document.getElementById("cupom-mensagem")

const valorSubtotalEl = document.getElementById("valor-subtotal")

const valorDescontoEl = document.getElementById("valor-desconto")

const valorFreteEl = document.getElementById("valor-frete")

let cart = [];
let usuarioLogado = null;
let freteLojas = {}; // { vidapura: 8.00, daterra: 8.00, botanicare: 10.00 }
let cupomAtivo = null; // { codigo, desconto }
let metodoPagamentoSelecionado = "pix"; // pix, credito, debito

// ======================================================
// Ao carregar a página: descobre se tem usuário logado,
// busca o carrinho salvo dele no Supabase (o mesmo carrinho
// aparece em Vida Pura, Da Terra e BotaniCare), e busca o
// valor do frete configurado de cada loja.
// ======================================================
async function iniciarCarrinho() {
    const { data: freteData } = await supabaseClient.from("config_frete").select("loja, valor_frete");
    (freteData || []).forEach((linha) => {
        freteLojas[linha.loja] = Number(linha.valor_frete);
    });

    const { data: { session } } = await supabaseClient.auth.getSession();
    usuarioLogado = session ? session.user : null;

    if (!usuarioLogado) {
        updateCartModal();
        return;
    }

    const { data, error } = await supabaseClient
        .from("carrinho_itens")
        .select("id, quantidade, produtos(id, nome, preco, loja)")
        .eq("user_id", usuarioLogado.id);

    if (error) {
        console.error("Erro ao carregar carrinho:", error);
        return;
    }

    cart = (data || [])
        .filter((item) => item.produtos)
        .map((item) => ({
            itemId: item.id,
            produtoId: item.produtos.id,
            name: item.produtos.nome,
            price: item.produtos.preco,
            loja: item.produtos.loja,
            quantity: item.quantidade,
        }));

    updateCartModal();
}

//Abrir modal do carrinho
cartBtn.addEventListener("click", function(){
    if (!usuarioLogado) {
        avisarPrecisaLogin("Faça login para usar o carrinho.");
        return;
    }
    updateCartModal();
    cartModal.style.display = "flex"

})

//Fechar modal do carrinho na área externa

cartModal.addEventListener("click", function(event){
    if(event.target === cartModal){
        cartModal.style.display = "none"
    }
})

//Botão Fechar modal
closeModalBtn.addEventListener("click", function(){
    cartModal.style.display = "none"

})

menu.addEventListener("click", function(event){

let parentButton = event.target.closest(".add-to-cart-btn")

if(parentButton){
    const produtoId = parentButton.getAttribute("data-id")
    const name = parentButton.getAttribute("data-name")
    const price = parseFloat(parentButton.getAttribute("data-price"))
    const loja = parentButton.getAttribute("data-loja")

    addToCart(produtoId, name, price, loja)
}
})

//Função adicionar ao carrinho (agora salva no Supabase)

async function addToCart(produtoId, name, price, loja){

    if (!usuarioLogado) {
        avisarPrecisaLogin("Faça login para adicionar produtos ao carrinho.");
        return;
    }

    const existingItem = cart.find(item => item.produtoId === produtoId)

    if(existingItem){
        existingItem.quantity += 1;

        await supabaseClient
            .from("carrinho_itens")
            .update({ quantidade: existingItem.quantity })
            .eq("id", existingItem.itemId);

    }else{

        const { data, error } = await supabaseClient
            .from("carrinho_itens")
            .insert({ user_id: usuarioLogado.id, produto_id: produtoId, quantidade: 1 })
            .select()
            .single();

        if (error) {
            console.error("Erro ao adicionar ao carrinho:", error);
            return;
        }

        cart.push({
            itemId: data.id,
            produtoId,
            name,
            price,
            loja,
            quantity: 1,
        })
    }

    updateCartModal()

}

// ======================================================
// Calcula subtotal, frete (soma o valor de cada loja
// presente no carrinho) e desconto do cupom já aplicado
// ======================================================
function calcularResumoCarrinho(){
    const subtotal = cart.reduce((soma, item) => soma + item.price * item.quantity, 0);

    const lojasNoCarrinho = [...new Set(cart.map((item) => item.loja))];
    const frete = cart.length === 0
        ? 0
        : lojasNoCarrinho.reduce((soma, loja) => soma + (freteLojas[loja] || 0), 0);

    const desconto = cupomAtivo ? cupomAtivo.desconto : 0;
    const total = Math.max(subtotal - desconto + frete, 0);

    return { subtotal, frete, desconto, total };
}

// ======================================================
// Seleção de método de pagamento (PIX / Crédito / Débito)
// ======================================================
const paymentOptionsContainer = document.getElementById("payment-options");

if (paymentOptionsContainer) {
    paymentOptionsContainer.addEventListener("click", function(event) {
        const option = event.target.closest(".checkout-payment-option");
        if (!option) return;

        paymentOptionsContainer.querySelectorAll(".checkout-payment-option").forEach((el) => {
            el.classList.remove("selected");
        });
        option.classList.add("selected");
        metodoPagamentoSelecionado = option.getAttribute("data-method");
    });
}

//Atualização Carrinho

function updateCartModal(){

    cartItemsContainer.innerHTML = "";

    cart.forEach(item =>{
        const cartItemElement = document.createElement("div");
        cartItemElement.className = "flex justify-between items-center py-2 border-b border-[var(--nude-light,#E9DCC7)] last:border-0";

        cartItemElement.innerHTML = `
            <div>
                <p class="font-bold text-sm text-[var(--forest,#1E3320)]">${item.name}</p>
                <p class="text-xs text-[var(--ink-soft,#666)]">Qtd: ${item.quantity}</p>
                <p class="font-medium text-sm mt-1">R$ ${item.price.toFixed(2)}</p>
            </div>
            <button class="remove-from-cart-btn text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1" data-id="${item.produtoId}">
                Remover
            </button>
        `;

       cartItemsContainer.appendChild(cartItemElement)
    })

    const { subtotal, frete, desconto, total } = calcularResumoCarrinho();

    const formatarReal = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    valorSubtotalEl.textContent = formatarReal(subtotal);
    valorFreteEl.textContent = frete === 0 ? "Grátis" : formatarReal(frete);

    const linhaDescontoLabel = document.getElementById("linha-desconto-label");

    if (desconto > 0) {
        linhaDescontoLabel?.classList.remove("hidden");
        valorDescontoEl.classList.remove("hidden");
        valorDescontoEl.textContent = "- " + formatarReal(desconto);
    } else {
        linhaDescontoLabel?.classList.add("hidden");
        valorDescontoEl.classList.add("hidden");
    }

    cartTotal.textContent = formatarReal(total);

     const totalItens = cart.reduce((soma, item) => soma + item.quantity, 0);
     cartCounter.innerHTML = totalItens;

}


//Função Remover o produto (também atualiza o Supabase)


cartItemsContainer.addEventListener("click", function(event){
    if(event.target.classList.contains("remove-from-cart-btn")){
        const produtoId = event.target.getAttribute("data-id")

        removeItemCart(produtoId);

    }
})

 async function removeItemCart(produtoId){
    const index = cart.findIndex(item => item.produtoId === produtoId);

    if(index !== -1){
        const item = cart[index];

        if(item.quantity > 1){
            item.quantity -= 1;

            await supabaseClient
                .from("carrinho_itens")
                .update({ quantidade: item.quantity })
                .eq("id", item.itemId);

            updateCartModal();
            return;
        }

        await supabaseClient
            .from("carrinho_itens")
            .delete()
            .eq("id", item.itemId);

        cart.splice(index, 1);
        updateCartModal()
        
    }
 }

 //Barra de Endereço

 addressInput.addEventListener("input", function(event){
    let inputValue = event.target.value;

    if(inputValue !== ""){
        addressInput.classList.remove("border-red-500")
        
        addressWarn.classList.add("hidden")
    }
 })

 // ======================================================
 // Cupom de desconto — só faz uma "pré-visualização" aqui.
 // O valor de verdade é recalculado no banco, dentro da
 // função finalizar_pedido, na hora de confirmar o pedido.
 // ======================================================

 btnAplicarCupom.addEventListener("click", async function(){
    const codigo = cupomInput.value.trim();

    if (!codigo) {
        cupomMensagem.textContent = "Digite um código de cupom.";
        cupomMensagem.className = "text-xs mt-1 min-h-[16px] text-red-500";
        return;
    }

    if (!usuarioLogado) {
        avisarPrecisaLogin("Faça login para aplicar um cupom.");
        return;
    }

    const { subtotal } = calcularResumoCarrinho();

    btnAplicarCupom.disabled = true;
    cupomMensagem.textContent = "Verificando cupom...";
    cupomMensagem.className = "text-xs mt-1 min-h-[16px] text-honey";

    const { data, error } = await supabaseClient.rpc("validar_cupom", {
        p_codigo: codigo,
        p_subtotal: subtotal,
    });

    btnAplicarCupom.disabled = false;

    const resultado = Array.isArray(data) ? data[0] : data;

    if (error || !resultado || !resultado.valido) {
        cupomAtivo = null;
        cupomMensagem.textContent = resultado ? resultado.mensagem : "Não foi possível validar o cupom.";
        cupomMensagem.className = "text-xs mt-1 min-h-[16px] text-red-500";
        updateCartModal();
        return;
    }

    cupomAtivo = { codigo: codigo.toUpperCase(), desconto: Number(resultado.desconto) };
    cupomMensagem.textContent = resultado.mensagem;
    cupomMensagem.className = "text-xs mt-1 min-h-[16px] text-green-700";
    updateCartModal();
 });


 //Finalização Pedido

 const checkoutStatus = document.getElementById("checkout-status");
 let pedidoEmAndamentoId = null;

 function mostrarStatusCheckout(texto, tipo){
    checkoutStatus.textContent = texto;
    checkoutStatus.classList.remove("hidden", "text-honey", "text-red-500", "text-green-700");
    checkoutStatus.classList.add(
        tipo === "erro" ? "text-red-500" : tipo === "sucesso" ? "text-green-700" : "text-honey"
    );
 }

 function setCheckoutLoading(isLoading) {
    checkoutBtn.disabled = isLoading;
    checkoutBtn.textContent = isLoading ? "Processando..." : "Finalizar Pedido";
    checkoutBtn.style.opacity = isLoading ? "0.6" : "1";
    checkoutBtn.style.cursor = isLoading ? "not-allowed" : "pointer";
 }

 checkoutBtn.addEventListener("click", async function(){

const isOpen = checkRestaurantOpen();

if(!isOpen){

Toastify({
    text: "Ops! o vendedor está indisponível neste horário",
    duration: 3500,
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    style: {
      background: "#ef4444",
    },
  }).showToast();

return;

}

if(cart.length === 0) return;

 if(addressInput.value === ""){

 addressWarn.classList.remove("hidden")

 addressInput.classList.add("border-red-500")
 return;

}

setCheckoutLoading(true);

// Se é a primeira tentativa (não veio de um "Tentar novamente"),
// pede pro banco criar o pedido — preço, frete e desconto do
// cupom são todos recalculados lá dentro, a partir dos valores
// reais no banco. O que o navegador mostrou até aqui é só uma
// prévia, não é usado pra nada além disso.
if (!pedidoEmAndamentoId) {
    mostrarStatusCheckout("Criando seu pedido...", "info");

    const itensParaFuncao = cart.map((item) => ({
        produto_id: item.produtoId,
        quantidade: item.quantity,
    }));

    const { data: novoPedidoId, error: erroPedido } = await supabaseClient.rpc("finalizar_pedido", {
        p_endereco: addressInput.value,
        p_itens: itensParaFuncao,
        p_codigo_cupom: cupomAtivo ? cupomAtivo.codigo : null,
    });

    if (erroPedido) {
        mostrarStatusCheckout(erroPedido.message || "Não foi possível criar o pedido. Tente novamente.", "erro");
        checkoutBtn.disabled = false;
        console.error(erroPedido);
        return;
    }

    pedidoEmAndamentoId = novoPedidoId;
}

// Pedido criado — pagamento SIMULADO por enquanto (sem gateway
// real). Isso volta temporariamente, até o Mercado Pago estar
// pronto — quando publicarmos as Edge Functions de pagamento
// real, esse trecho volta a chamar "criar-pagamento" no lugar
// deste sorteio local.
mostrarStatusCheckout("Processando pagamento...", "info");
checkoutBtn.textContent = "Processando...";

await new Promise((resolve) => setTimeout(resolve, 1800));

const aprovado = Math.random() < 0.9; // 90% de chance de aprovar

const { error: erroPagamento } = await supabaseClient.from("pagamentos").insert({
    pedido_id: pedidoEmAndamentoId,
    status: aprovado ? "aprovado" : "recusado",
    metodo_pagamento: metodoPagamentoSelecionado,
});

if (erroPagamento) {
    mostrarStatusCheckout("Erro ao processar o pagamento. Tente novamente.", "erro");
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Finalizar Pedido";
    console.error(erroPagamento);
    return;
}

if (!aprovado) {
    mostrarStatusCheckout("Pagamento recusado. Quer tentar novamente?", "erro");
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Tentar novamente";
    return;
}

// Pagamento aprovado: mostra tela de confirmação antes de enviar
// ao WhatsApp, para o cliente revisar itens, endereço e total.
mostrarStatusCheckout("Pagamento aprovado! Revise seu pedido.", "sucesso");

// Prepara dados para o modal de confirmação
const labelsPagamento = { pix: "PIX", credito: "Cartão de Crédito", debito: "Cartão de Débito" };
const confirmItensEl = document.getElementById("confirm-itens");
const confirmEnderecoEl = document.getElementById("confirm-endereco");
const confirmPagamentoEl = document.getElementById("confirm-pagamento");
const confirmTotalEl = document.getElementById("confirm-total");
const confirmModal = document.getElementById("confirm-modal");
const confirmOkBtn = document.getElementById("confirm-ok-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");

// Preenche o modal com os dados do pedido
confirmItensEl.innerHTML = "";
cart.forEach((item) => {
    const linha = document.createElement("div");
    linha.className = "flex justify-between text-sm";
    linha.innerHTML = `<span class="text-ink/80">${item.quantity}x ${item.name}</span><span class="font-semibold text-forest">R$ ${(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>`;
    confirmItensEl.appendChild(linha);
});

confirmEnderecoEl.textContent = addressInput.value;
confirmPagamentoEl.textContent = labelsPagamento[metodoPagamentoSelecionado] || metodoPagamentoSelecionado;
confirmTotalEl.textContent = document.getElementById("cart-total").textContent;

// Mostra o modal de confirmação
confirmModal.classList.remove("hidden");

// Aguarda confirmação ou cancelamento do usuário
const confirmado = await new Promise((resolve) => {
    function limparListeners() {
        confirmOkBtn.removeEventListener("click", onConfirm);
        confirmCancelBtn.removeEventListener("click", onCancel);
    }

    function onConfirm() {
        limparListeners();
        resolve(true);
    }

    function onCancel() {
        limparListeners();
        resolve(false);
    }

    confirmOkBtn.addEventListener("click", onConfirm);
    confirmCancelBtn.addEventListener("click", onCancel);
});

// Fecha o modal de confirmação
confirmModal.classList.add("hidden");

if (!confirmado) {
    // Usuário clicou em Voltar — mantém o pedido criado mas não envia ao WhatsApp
    mostrarStatusCheckout("Pedido salvo. Confirme quando estiver pronto.", "info");
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Confirmar Pedido";
    return;
}

// Usuário confirmou: envia ao WhatsApp e limpa o carrinho
const cartItems = cart.map((item) => {
  return `${item.name} Quantidade: (${item.quantity}) Preço: R$${item.price} |`;
}).join(" ");

const message = encodeURIComponent(cartItems);
const phone = "82996911981";

window.open(
    `https://wa.me/${phone}?text=${message} Endereço: ${addressInput.value}`,
    "_blank"
);

await supabaseClient
    .from("carrinho_itens")
    .delete()
    .eq("user_id", usuarioLogado.id);

cart = [];
cupomAtivo = null;
cupomInput.value = "";
cupomMensagem.textContent = "";
updateCartModal();

pedidoEmAndamentoId = null;
checkoutBtn.disabled = false;
checkoutBtn.textContent = "Finalizar Pedido";
mostrarStatusCheckout("", "info");

 })
 

 //Manipulação do horário — cada loja tem seu próprio horário
 const HORARIOS_LOJA = {
     vidapura:   { abre: 7,  fecha: 17, dias: [0,1,2,3,4,5,6] },       // Seg-Dom 07:00–17:00
     daterra:    { abre: 7,  fecha: 18, dias: [1,2,3,4,5,6] },          // Seg-Sáb 07:00–18:00
     botanicare: { abre: 10, fecha: 20, dias: [1,2,3,4,5,6] },          // Seg-Sáb 10:00–20:00
 };

 function checkRestaurantOpen(){
     const lojaAtual = document.body.getAttribute("data-loja");
     const config = HORARIOS_LOJA[lojaAtual];
     if (!config) return false;

     const agora = new Date();
     const dia = agora.getDay();
     const hora = agora.getHours();

     return config.dias.includes(dia) && hora >= config.abre && hora < config.fecha;
 }

 const spanItem = document.getElementById("date-span")

 const isOpen = checkRestaurantOpen();

 if(isOpen){

    spanItem.classList.remove("bg-red-500");

    spanItem.classList.add("bg-green-600");

 }else{
    spanItem.classList.remove("bg-green-600")

    spanItem.classList.add("bg-red-500")

 }

 iniciarCarrinho();

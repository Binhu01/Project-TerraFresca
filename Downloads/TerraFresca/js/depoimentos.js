// ======================================================
// Carrega depoimentos do Supabase e renderiza na seção
// de depoimentos da página inicial, substituindo os
// cards estáticos por dados dinâmicos do banco.
// ======================================================

async function carregarDepoimentos() {
    const container = document.getElementById("depoimentos-container");
    if (!container) return;

    const { data, error } = await supabaseClient
        .from("depoimentos")
        .select("nome, texto, nota, foto_url")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .limit(6);

    if (error) {
        console.error("Erro ao carregar depoimentos:", error);
        return;
    }

    if (!data || data.length === 0) return;

    container.innerHTML = "";

    data.forEach((dep) => {
        const card = document.createElement("div");
        card.className = "card-item";

        const estrelas = montarEstrelas(dep.nota);

        card.innerHTML = `
            <img src="${dep.foto_url || 'img/default-avatar.png'}" alt="${dep.nome}">
            <p class="nome-cliente">${dep.nome}</p>
            <p class="depoimento-cliente">"${dep.texto}"</p>
            <div class="estrelas">${estrelas}</div>
        `;

        container.appendChild(card);
    });
}

function montarEstrelas(nota) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= nota) {
            html += '<i class="fa fa-star" aria-hidden="true"></i>';
        } else {
            html += '<i class="fa fa-star-o" aria-hidden="true"></i>';
        }
    }
    return html;
}

carregarDepoimentos();
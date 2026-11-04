// ======================================================
// Cadastro de Vendedor — Lógica do formulário
// Reusa supabaseClient definido em js/supabase-client.js
// ======================================================

// Elementos do DOM
const form = document.getElementById("cadastro-form");
const btnSubmit = document.getElementById("btn-submit");
const mensagemEl = document.getElementById("cadastro-mensagem");

const campoNome = document.getElementById("campo-nome");
const campoSlug = document.getElementById("campo-slug");
const slugPreview = document.getElementById("slug-preview");
const campoDescricao = document.getElementById("campo-descricao");
const campoLogo = document.getElementById("campo-logo");
const campoCapa = document.getElementById("campo-capa");
const previewLogo = document.getElementById("preview-logo");
const previewCapa = document.getElementById("preview-capa");
const campoPlano = document.getElementById("campo-plano");
const planoCards = document.querySelectorAll(".plano-card");

let logoFile = null;
let capaFile = null;
let slugEditadoManualmente = false;

// ======================================================
// Verificar sessão ao carregar
// ======================================================
(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "../login/index.html";
    }
})();

// ======================================================
// Geração automática de slug a partir do nome
// ======================================================
function gerarSlug(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

campoNome.addEventListener("input", () => {
    if (!slugEditadoManualmente) {
        const slug = gerarSlug(campoNome.value);
        campoSlug.value = slug;
        atualizarPreviewSlug(slug);
    }
});

campoSlug.addEventListener("input", () => {
    slugEditadoManualmente = true;
    // Forçar padrão válido
    campoSlug.value = campoSlug.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    atualizarPreviewSlug(campoSlug.value);
});

function atualizarPreviewSlug(slug) {
    const display = slug || "...";
    slugPreview.innerHTML = `terrafresca.netlify.app/loja/<strong>${display}</strong>`;
}

// ======================================================
// Seleção de plano
// ======================================================
planoCards.forEach((card) => {
    card.addEventListener("click", () => {
        planoCards.forEach((c) => c.classList.remove("selecionado"));
        card.classList.add("selecionado");
        campoPlano.value = card.dataset.plano;
    });
});

// ======================================================
// Preview de imagens
// ======================================================
campoLogo.addEventListener("change", () => {
    logoFile = campoLogo.files[0];
    if (logoFile) {
        const url = URL.createObjectURL(logoFile);
        previewLogo.src = url;
        previewLogo.classList.remove("hidden");
    }
});

campoCapa.addEventListener("change", () => {
    capaFile = campoCapa.files[0];
    if (capaFile) {
        const url = URL.createObjectURL(capaFile);
        previewCapa.src = url;
        previewCapa.classList.remove("hidden");
    }
});

// ======================================================
// Upload de imagem para Supabase Storage
// ======================================================
async function uploadImagem(file, slug, tipo) {
    if (!file) return null;

    const extensao = file.name.split(".").pop();
    const caminho = `${slug}/${tipo}.${extensao}`;

    const { error } = await supabaseClient.storage
        .from("lojas")
        .upload(caminho, file, { upsert: true });

    if (error) {
        throw new Error(`Erro ao enviar ${tipo}: ${error.message}`);
    }

    const { data } = supabaseClient.storage
        .from("lojas")
        .getPublicUrl(caminho);

    return data.publicUrl;
}

// ======================================================
// Mostrar mensagens
// ======================================================
function mostrarMensagem(texto, tipo) {
    mensagemEl.textContent = texto;
    mensagemEl.className = `cadastro-mensagem ${tipo}`;
}

function limparMensagem() {
    mensagemEl.className = "cadastro-mensagem";
    mensagemEl.textContent = "";
}

// ======================================================
// Submissão do formulário
// ======================================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparMensagem();

    const nome = campoNome.value.trim();
    const slug = campoSlug.value.trim();
    const descricao = campoDescricao.value.trim();
    const plano = campoPlano.value;

    // Validações
    if (!nome) {
        mostrarMensagem("O nome da loja é obrigatório.", "erro");
        return;
    }

    if (!slug || slug.length < 3) {
        mostrarMensagem("A URL da loja deve ter pelo menos 3 caracteres.", "erro");
        return;
    }

    if (!document.getElementById("campo-termos").checked) {
        mostrarMensagem("Você precisa aceitar os Termos de Uso para continuar.", "erro");
        return;
    }

    // Desabilitar botão
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Enviando...";

    try {
        // 1. Upload das imagens (se houver)
        let logoUrl = null;
        let capaUrl = null;

        if (logoFile) {
            mostrarMensagem("Enviando logo...", "sucesso");
            logoUrl = await uploadImagem(logoFile, slug, "logo");
        }

        if (capaFile) {
            mostrarMensagem("Enviando imagem de capa...", "sucesso");
            capaUrl = await uploadImagem(capaFile, slug, "capa");
        }

        // 2. Chamar RPC para criar loja e vincular vendedor
        mostrarMensagem("Criando sua loja...", "sucesso");

        const { data: lojaId, error } = await supabaseClient.rpc(
            "criar_loja_e_vincular",
            {
                p_nome: nome,
                p_slug: slug,
                p_descricao: descricao || null,
                p_logo_url: logoUrl,
                p_capa_url: capaUrl,
                p_plano: plano,
            }
        );

        if (error) {
            if (error.message.includes("slug já está em uso")) {
                mostrarMensagem("Esta URL já está sendo usada por outra loja. Escolha uma diferente.", "erro");
            } else {
                mostrarMensagem(`Erro ao criar loja: ${error.message}`, "erro");
            }
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Enviar solicitação";
            return;
        }

        // 3. Sucesso
        mostrarMensagem(
            "Sua loja foi criada e enviada para aprovação! Você será redirecionado para o painel.",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = "../painel/index.html";
        }, 2000);

    } catch (err) {
        mostrarMensagem(`Erro inesperado: ${err.message}`, "erro");
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Enviar solicitação";
    }
});
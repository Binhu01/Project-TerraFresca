// Troca o botão "Fazer Login" da navbar pelo nome do usuário + botão "Sair"
// (e um link "Painel", se a pessoa for vendedora de alguma loja) quando
// existir uma sessão ativa do Supabase. Se não houver sessão, simplesmente
// mantém o botão "Fazer Login" que já está no HTML.
(async function () {
    const navAuth = document.getElementById("nav-auth");
    if (!navAuth) return;

    // Cada página informa, via data-home na <body>, o caminho relativo
    // até a main.html (páginas na raiz não precisam declarar — "main.html"
    // já é o padrão; páginas dentro de uma subpasta, como /painel/, usam
    // data-home="../main.html").
    const home = document.body.dataset.home || "main.html";
    const painelHref = home.replace("main.html", "painel/index.html");
    const favoritosHref = home.replace("main.html", "favoritos/index.html");
    const pedidosHref = home.replace("main.html", "pedidos/index.html");
    const adminHref = home.replace("main.html", "admin/index.html");

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;


    // Registra token FCM no app nativo (Task 9 - Push Token Registration)
    if (typeof window !== "undefined" && window.nativeBridge && typeof window.nativeBridge.registrarPushToken === "function") {
        window.nativeBridge.registrarPushToken(user.id).catch(function(err) {
            console.warn("[auth-nav] Push token registration failed:", err);
        });
    }
    const user = session.user;
    const nome = (user.user_metadata && user.user_metadata.full_name)
        ? user.user_metadata.full_name.split(" ")[0]
        : user.email.split("@")[0];

    // Register FCM push token when running in native app
    if (typeof window.nativeBridge?.registrarPushToken === 'function') {
        window.nativeBridge.registrarPushToken(user.id).catch((e) => {
            console.warn('[auth-nav] Push token registration failed:', e);
        });
    }

    // Mantém a tabela "profiles" (usada pelo painel administrativo pra
    // buscar usuários por e-mail) sempre atualizada com o e-mail atual —
    // sem depender de nenhum gatilho no schema interno do Supabase.
    supabaseClient.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata && user.user_metadata.full_name) || null,
    }).then(({ error }) => {
        if (error) console.error("Erro ao salvar profile:", error);
    });

    const { data: vinculosLegados } = await supabaseClient
        .from("vendedores")
        .select("loja")
        .eq("user_id", user.id);

    const { data: lojaCustom } = await supabaseClient
        .from("lojas")
        .select("slug, status")
        .eq("owner_id", user.id)
        .maybeSingle();

    const { data: souAdmin } = await supabaseClient.rpc("is_admin");

    navAuth.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "nav-user-dropdown";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "nav-user-trigger";
    trigger.innerHTML = `Olá, ${nome} <i class="fa fa-chevron-down" aria-hidden="true"></i>`;

    const menuDropdown = document.createElement("div");
    menuDropdown.className = "nav-dropdown-menu";

    const linkFavoritos = document.createElement("a");
    linkFavoritos.href = favoritosHref;
    linkFavoritos.textContent = "Favoritos";
    menuDropdown.appendChild(linkFavoritos);

    const linkPedidos = document.createElement("a");
    linkPedidos.href = pedidosHref;
    linkPedidos.textContent = "Pedidos";
    menuDropdown.appendChild(linkPedidos);

    // Loja customizada aprovada → link para a storefront
    if (lojaCustom && lojaCustom.status === "aprovada") {
        const lojaHref = home.replace("main.html", `loja/index.html?slug=${lojaCustom.slug}`);
        const linkLoja = document.createElement("a");
        linkLoja.href = lojaHref;
        linkLoja.textContent = "Minha Loja";
        menuDropdown.appendChild(linkLoja);
    }

    // Painel do vendedor (se tem loja custom ou vínculos legados)
    const temVinculoLegado = vinculosLegados && vinculosLegados.length > 0;
    if (lojaCustom || temVinculoLegado) {
        const linkPainel = document.createElement("a");
        linkPainel.href = painelHref;
        linkPainel.textContent = "Painel do Vendedor";
        menuDropdown.appendChild(linkPainel);
    } else if (!lojaCustom) {
        // Sem loja: oferecer criação
        const cadastroHref = home.replace("main.html", "vendedor/cadastro.html");
        const linkCriar = document.createElement("a");
        linkCriar.href = cadastroHref;
        linkCriar.textContent = "Criar Loja";
        menuDropdown.appendChild(linkCriar);
    }

    if (souAdmin) {
        const linkAdmin = document.createElement("a");
        linkAdmin.href = adminHref;
        linkAdmin.textContent = "Painel Administrativo";
        menuDropdown.appendChild(linkAdmin);
    }

    const divisor = document.createElement("div");
    divisor.className = "nav-dropdown-divisor";
    menuDropdown.appendChild(divisor);

    const btnSair = document.createElement("button");
    btnSair.type = "button";
    btnSair.textContent = "Sair";
    btnSair.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = home;
    });
    menuDropdown.appendChild(btnSair);

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        wrapper.classList.toggle("open");
    });

    document.addEventListener("click", () => wrapper.classList.remove("open"));

    wrapper.appendChild(trigger);
    wrapper.appendChild(menuDropdown);
    navAuth.appendChild(wrapper);
})();

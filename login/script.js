// ======================================================
// Configuração do Supabase
// Troque pelos valores do seu projeto em:
// Supabase > Project Settings > API
// ======================================================
const SUPABASE_URL = "https://khonungotuguqyvoikrc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob251bmdvdHVndXF5dm9pa3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTUwMzgsImV4cCI6MjEwMjA3MTAzOH0.MeJ0P1Uwux2Gk580hQMrnPNDmkfK3eDEVr6eMxLrVHQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================================================
// Alternância visual entre "Criar conta" / "Entrar"
// ======================================================
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// No celular, o painel deslizante vira dois links simples de
// alternância (o mecanismo por trás — a classe "active" — é o
// mesmo dos botões acima).
document.getElementById("mobile-to-signin").addEventListener("click", () => {
    container.classList.remove("active");
});

document.getElementById("mobile-to-signup").addEventListener("click", () => {
    container.classList.add("active");
});

// ======================================================
// Utilitário para mostrar mensagens de erro/sucesso
// ======================================================
function mostrarMensagem(elementId, texto, tipo) {
    const el = document.getElementById(elementId);
    el.textContent = texto;
    el.className = "auth-message " + tipo;
}

// ======================================================
// Se o usuário já estiver logado, manda direto pro site
// ======================================================
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = "../main.html";
    }
});

// ======================================================
// Login/cadastro social (Google, GitHub, LinkedIn)
// ======================================================
document.querySelectorAll(".social-icons .icon").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const provider = btn.dataset.provider;

        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.href
            }
        });

        if (error) {
            alert("Não foi possível continuar com " + provider + ": " + error.message);
        }
        // Em caso de sucesso, o Supabase redireciona automaticamente para o provedor.
    });
});

// ======================================================
// Cadastro por e-mail e senha
// ======================================================
const signupForm = document.getElementById("signup-form");

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const senha = document.getElementById("signup-password").value;

    mostrarMensagem("signup-message", "Criando conta...", "success");

    const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: senha,
        options: {
            data: { full_name: nome }
        }
    });

    if (error) {
        mostrarMensagem("signup-message", error.message, "error");
        return;
    }

    mostrarMensagem(
        "signup-message",
        "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
        "success"
    );
    signupForm.reset();
});

// ======================================================
// Login por e-mail e senha
// ======================================================
const signinForm = document.getElementById("signin-form");

signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signin-email").value.trim();
    const senha = document.getElementById("signin-password").value;

    mostrarMensagem("signin-message", "Entrando...", "success");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        mostrarMensagem("signin-message", "E-mail ou senha inválidos.", "error");
        return;
    }

    window.location.href = "../main.html";
});

// ======================================================
// "Esqueceu sua senha?"
// ======================================================
document.getElementById("forgot-password-link").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signin-email").value.trim();

    if (!email) {
        mostrarMensagem("signin-message", "Digite seu e-mail no campo acima primeiro.", "error");
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);

    if (error) {
        mostrarMensagem("signin-message", error.message, "error");
        return;
    }

    mostrarMensagem("signin-message", "Enviamos um link de redefinição para o seu e-mail.", "success");
});

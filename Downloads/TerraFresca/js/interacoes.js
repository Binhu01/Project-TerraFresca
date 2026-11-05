// ======================================================
// Interações do site — versão simplificada.
// Só duas coisas: revelar elementos ao rolar a página
// (efeito de "carimbo" entrando), e um respingo de cor no
// clique dos botões. Nada de cálculo de geometria de SVG
// nem manipulação complexa — de propósito, pra ser fácil
// de confirmar que funciona.
// ======================================================

(function () {
    "use strict";

    var semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function iniciarRevelacoes() {
        var seletores = [
            ".meio-texto", ".meio-img",
            ".depoimentos h3", ".depoimentos > .container > p",
            ".depoimentos .card-item",
            ".parcerias h3", ".parcerias p", ".parceiro-card",
            ".sobre-texto", ".sobre-img",
            ".servicos h3", ".servicos .container > p", ".row-card-item",
            ".contato-info .lado-esquerdo", ".contato-info .lado-direito"
        ];

        var elementos = document.querySelectorAll(seletores.join(","));
        if (elementos.length === 0) return;

        if (!("IntersectionObserver" in window)) {
            // Navegador sem suporte: mostra tudo direto, sem animar.
            return;
        }

        elementos.forEach(function (el, indice) {
            el.classList.add("selo-entrada");
            el.style.transitionDelay = (indice % 4) * 0.08 + "s";
        });

        var observador = new IntersectionObserver(
            function (entradas) {
                entradas.forEach(function (entrada) {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add("selo-visivel");
                        observador.unobserve(entrada.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
        );

        elementos.forEach(function (el) {
            observador.observe(el);
        });
    }

    function iniciarRippleDosBotoes() {
        document.querySelectorAll(".btn").forEach(function (botao) {
            botao.addEventListener("click", function (evento) {
                var rect = botao.getBoundingClientRect();
                var tamanho = Math.max(rect.width, rect.height);
                var efeito = document.createElement("span");

                efeito.className = "ripple-efeito";
                efeito.style.position = "absolute";
                efeito.style.borderRadius = "50%";
                efeito.style.backgroundColor = "rgba(251, 248, 242, 0.55)";
                efeito.style.pointerEvents = "none";
                efeito.style.transform = "scale(0)";
                efeito.style.transition = "transform 0.6s ease-out, opacity 0.6s ease-out";
                efeito.style.width = tamanho + "px";
                efeito.style.height = tamanho + "px";
                efeito.style.left = (evento.clientX - rect.left - tamanho / 2) + "px";
                efeito.style.top = (evento.clientY - rect.top - tamanho / 2) + "px";

                botao.appendChild(efeito);

                requestAnimationFrame(function () {
                    efeito.style.transform = "scale(3)";
                    efeito.style.opacity = "0";
                });

                setTimeout(function () {
                    efeito.remove();
                }, 650);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!semAnimacao) {
            iniciarRevelacoes();
        }
        iniciarRippleDosBotoes();
    });
})();

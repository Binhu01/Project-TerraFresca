// Menu mobile (hamburguer)
function OpenMenu() {
    const menu = document.querySelector('.ul');
    if (menu) {
        menu.classList.add('open');
    }
}

function CloseMenu() {
    const menu = document.querySelector('.ul');
    if (menu) {
        menu.classList.remove('open');
    }
}

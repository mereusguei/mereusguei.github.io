// navigation.js
document.addEventListener('DOMContentLoaded', () => {
    const userNavigation = document.getElementById('user-navigation');
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (user && token && userNavigation) {
        userNavigation.innerHTML = `
            <div class="nav-links">
                <a href="index.html" class="btn">Eventos</a>
                <a href="ranking.html" class="btn">Ranking</a>
            </div>
            <div class="user-profile">
                <img src="https://i.pravatar.cc/40?u=${user.username}" alt="Foto do Usuário">
                <span>Olá, ${user.username}</span>
            </div>
            <button id="logout-btn" class="btn btn-logout">Sair</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    } else if (userNavigation) {
        // ... (código para mostrar botões de Login/Cadastro, se necessário em outras páginas)
    }
});
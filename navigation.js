// =================== CÓDIGO FINAL E COMPLETO PARA navigation.js ===================

document.addEventListener('DOMContentLoaded', () => {
    const userNavigation = document.getElementById('user-navigation');
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Verifica se o elemento de navegação existe na página atual antes de tentar modificá-lo
    if (userNavigation) {
        
        if (user && token) {
            // --- CENÁRIO: USUÁRIO ESTÁ LOGADO ---
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

            // Adiciona a funcionalidade ao botão de sair
            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.clear(); // Limpa token e usuário
                window.location.href = 'login.html'; // Redireciona para o login
            });

        } else {
            // --- CENÁRIO: USUÁRIO ESTÁ DESLOGADO ---
            // Se não há token/usuário, exibe os botões de Login e Cadastro
            userNavigation.innerHTML = `
                <div class="auth-buttons">
                    <a href="login.html" class="btn">Login</a>
                    <a href="register.html" class="btn btn-primary">Cadastro</a>
                </div>
            `;
        }
    }
});
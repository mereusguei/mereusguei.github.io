// A URL do seu backend na Vercel
const API_URL = 'https://site-palpites-pagos.vercel.app';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorMessageDiv = document.getElementById('error-message');

// --- Nova Lógica para Mostrar/Ocultar Senha ---

// Função para alternar a visibilidade da senha
const togglePasswordVisibility = (passwordInputId, toggleElementId) => {
    const passwordInput = document.getElementById(passwordInputId);
    const togglePassword = document.getElementById(toggleElementId);

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            // Alterna o tipo do input entre 'password' e 'text'
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Altera o ícone
            if (type === 'text') {
                togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>'; // Ícone de olho fechado
            } else {
                togglePassword.innerHTML = '<i class="fas fa-eye"></i>'; // Ícone de olho aberto
            }
        });
    }
};

// Chama a função para os campos de senha
// Para a página de Login
if (document.getElementById('password')) { // Verifica se o elemento existe na página atual
    togglePasswordVisibility('password', 'togglePasswordLogin');
}

// Para a página de Cadastro
if (document.getElementById('password')) { // Verifica se o elemento existe na página atual (mesmo ID, mas pode ser diferente em cada página)
    // Precisamos garantir que estamos selecionando o elemento correto se os IDs forem genéricos.
    // Como os formulários são diferentes, os IDs dos campos de senha são os mesmos, mas os toggles têm IDs diferentes.
    // Vamos refinar isso para garantir que funcione corretamente.

    // Se estiver na página de cadastro:
    if (registerForm) {
        togglePasswordVisibility('password', 'togglePasswordRegister');
    }
    // Se estiver na página de login:
    if (loginForm) {
        togglePasswordVisibility('password', 'togglePasswordLogin');
    }
}


// --- Lógica para o formulário de Cadastro ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageDiv.textContent = ''; // Limpa mensagens de erro antigas

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Algo deu errado');
            }

            alert('Cadastro realizado com sucesso! Você já pode fazer login.');
            window.location.href = 'login.html'; // Redireciona para a página de login

        } catch (error) {
            errorMessageDiv.textContent = error.message;
        }
    });
}

// --- Lógica para o formulário de Login ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageDiv.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Algo deu errado');
            }

            // Login bem-sucedido!
            sessionStorage.clear(); // <-- LINHA ADICIONADA: Limpa qualquer cache de sessão antigo

            // Salva o novo token e os dados do novo usuário no navegador
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            alert('Login bem-sucedido!');
            window.location.href = 'index.html'; // Redireciona para a página principal

        } catch (error) {
            errorMessageDiv.textContent = error.message;
        }
    });
}
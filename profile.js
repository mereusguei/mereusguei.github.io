// ================== CÓDIGO COMPLETO PARA profile.js ==================
const API_URL = 'https://site-palpites-pagos.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    // Preenche os dados do usuário na tela
    const usernameDisplay = document.getElementById('username-display');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    if (usernameDisplay) usernameDisplay.value = user.username;
    if (profilePicPreview) profilePicPreview.src = `https://i.pravatar.cc/150?u=${user.username}`;

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            if (!newPassword) {
                return alert('Por favor, digite a nova senha para salvar.');
            }

            try {
                const response = await fetch(`${API_URL}/api/users/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ newPassword })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                alert(data.message);
                document.getElementById('new-password').value = '';
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        });
    }
});
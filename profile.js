// ================== CÓDIGO COMPLETO PARA profile.js ==================
const API_URL = 'https://site-palpites-pagos.vercel.app';
// --- ADICIONE SUAS CREDENCIAIS DO CLOUDINARY AQUI ---
const CLOUDINARY_CLOUD_NAME = 'dkqxyj4te';
const CLOUDINARY_UPLOAD_PRESET = 'ejlzebde';
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
        const profilePicUpload = document.getElementById('profile-pic-upload');
        const profileForm = document.getElementById('profile-form');
        const profileMessage = document.getElementById('profile-message');

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            profileMessage.textContent = 'Salvando...';

            const newPassword = document.getElementById('new-password').value;
            const imageFile = profilePicUpload.files[0];

            let profilePictureUrl = null;

            // 1. Faz o upload da imagem, se houver uma
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                try {
                    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                        method: 'POST',
                        body: formData,
                    });
                    const uploadData = await uploadResponse.json();
                    if (uploadData.secure_url) {
                        profilePictureUrl = uploadData.secure_url;
                    } else {
                        throw new Error('Falha no upload da imagem.');
                    }
                } catch (error) {
                    profileMessage.className = 'error';
                    profileMessage.textContent = `Erro no upload: ${error.message}`;
                    return;
                }
            }

            if (!newPassword && !profilePictureUrl) {
                return profileMessage.textContent = 'Nenhuma alteração para salvar.';
            }

            // 2. Envia os dados (senha e/ou nova URL da imagem) para o nosso backend
            try {
                const response = await fetch(`${API_URL}/api/users/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ newPassword, profilePictureUrl })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                profileMessage.className = 'success';
                profileMessage.textContent = data.message;
                document.getElementById('new-password').value = '';
                // Atualiza a imagem na tela
                if (profilePictureUrl) document.getElementById('profile-pic-preview').src = profilePictureUrl;

            } catch (error) {
                profileMessage.className = 'error';
                profileMessage.textContent = `Erro: ${error.message}`;
            }
        });
    }
});
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

    const usernameDisplay = document.getElementById('username-display');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profileForm = document.getElementById('profile-form');
    const profileMessage = document.getElementById('profile-message');

    // Preenche os dados iniciais do usuário
    if (usernameDisplay) usernameDisplay.value = user.username;
    if (profilePicPreview) {
        // Busca a URL da foto do banco de dados (precisamos adicionar isso na API de login)
        // Por enquanto, usaremos um placeholder se não houver URL
        // Exemplo: profilePicPreview.src = user.profile_picture_url || `https://i.pravatar.cc/150?u=${user.username}`;
        profilePicPreview.src = `https://i.pravatar.cc/150?u=${user.username}`; // Placeholder atual
    }

    // --- NOVA LÓGICA DE PREVIEW DA IMAGEM ---
    if (profilePicUpload && profilePicPreview) {
        profilePicUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // Cria uma URL temporária para o preview da imagem selecionada
                const reader = new FileReader();
                reader.onload = (e) => {
                    profilePicPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = profileForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Salvando...';
            submitButton.disabled = true;
            profileMessage.textContent = '';

            const newPassword = document.getElementById('new-password').value;
            const imageFile = profilePicUpload.files[0];
            let profilePictureUrl = null;

            // 1. Faz o upload da imagem para o Cloudinary, SE uma nova foi selecionada
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                try {
                    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                        method: 'POST', body: formData,
                    });
                    const uploadData = await uploadResponse.json();
                    if (uploadData.secure_url) {
                        profilePictureUrl = uploadData.secure_url;
                    } else { throw new Error('Falha no upload da imagem para o Cloudinary.'); }
                } catch (error) {
                    profileMessage.className = 'error';
                    profileMessage.textContent = `Erro no upload: ${error.message}`;
                    submitButton.textContent = 'Salvar Alterações';
                    submitButton.disabled = false;
                    return;
                }
            }

            if (!newPassword && !profilePictureUrl) {
                submitButton.textContent = 'Salvar Alterações';
                submitButton.disabled = false;
                return profileMessage.textContent = 'Nenhuma alteração para salvar.';
            }

            // 2. Envia os dados para o nosso backend
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
                profilePicUpload.value = ''; // Limpa a seleção do arquivo
            } catch (error) {
                profileMessage.className = 'error';
                profileMessage.textContent = `Erro: ${error.message}`;
            } finally {
                submitButton.textContent = 'Salvar Alterações';
                submitButton.disabled = false;
            }
        });
    }
});
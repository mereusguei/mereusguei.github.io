// =================== CÓDIGO FINAL E UNIFICADO PARA script.js ===================

const API_URL = 'https://site-palpites-pagos.vercel.app'; // Nota: O URL fornecido tem um typo "palites" em vez de "palpites". Presumi que seja o correto.

// Credenciais do Cloudinary para o upload da foto de perfil
const CLOUDINARY_CLOUD_NAME = 'dkqxyj4te';
const CLOUDINARY_UPLOAD_PRESET = 'ejlzebde';

let eventData = {}; // Variável global para armazenar dados do evento

// --- FUNÇÃO PRINCIPAL QUE RODA QUANDO A PÁGINA CARREGA ---
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Inicializa a navegação que roda em todas as páginas
    initializeNavigation(user, token);

    // Chama a função de inicialização específica da página atual
    const pageId = document.body.id;
    if (pageId === 'event-page') {
        initializeEventPage(user, token);
    } else if (pageId === 'events-page') {
        initializeEventsListPage(token);
    } else if (pageId === 'ranking-page') {
        initializeRankingPage(token);
    } else if (pageId === 'profile-page') {
        initializeProfilePage(user, token);
    }

    // --- DELEGAÇÃO DE EVENTOS PARA ELEMENTOS DINÂMICOS E GERAIS ---

    // Delegação de eventos para botões de palpite (na página de eventos)
    const fightCardGrid = document.getElementById('fight-card-grid');
    if (fightCardGrid) {
        fightCardGrid.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-pick, .btn-edit-pick');
            if (button) {
                const fightId = parseInt(button.closest('.fight-card').dataset.fightId);
                openPickModal(fightId);
            }
        });
    }

    // Lógica para fechar o modal de palpite
    const modal = document.getElementById('pick-modal');
    if (modal) {
        modal.querySelector('.close-modal')?.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    // Interação do modal: seleção de lutador
    document.querySelectorAll('.fighter-option').forEach(div => {
        div.addEventListener('click', () => {
            document.querySelectorAll('.fighter-option').forEach(d => d.classList.remove('selected'));
            div.classList.add('selected');
            document.getElementById('winner').value = div.dataset.fighterName;
            document.getElementById('method-group').style.display = 'block';
        });
    });

    // Interação do modal: seleção de método
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const method = btn.dataset.method;
            document.getElementById('decision-type-group').style.display = (method === 'Decision') ? 'block' : 'none';
            document.getElementById('round-group').style.display = (method === 'Decision') ? 'none' : 'block';
        });
    });

    // Lógica de submit do formulário do modal de palpite
    const pickForm = document.getElementById('pick-form');
    if (pickForm) {
        pickForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fightId = parseInt(document.getElementById('fight-id').value);
            const winnerName = document.getElementById('winner').value;
            const methodBtn = document.querySelector('.method-btn.selected');

            if (!winnerName || !methodBtn) return alert('Selecione o vencedor e o método.');

            const method = methodBtn.dataset.method;
            let details = (method === 'Decision') ? pickForm.querySelector('[name="decision-type"]').value : `Round ${pickForm.querySelector('[name="round"]').value}`;

            try {
                const response = await fetch(`${API_URL}/api/picks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ fightId, winnerName, method, details }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao salvar palpite.');

                // Atualiza o estado local dos palpites com os dados retornados pela API
                eventData.userPicks[fightId] = data.pick;

                alert('Palpite salvo com sucesso!');
                loadFights(); // Recarrega os cards para refletir o palpite salvo
                if (modal) modal.classList.remove('active'); // Fecha o modal
            } catch (error) {
                alert(`Erro ao salvar palpite: ${error.message}`);
            }
        });
    }
});

// --- FUNÇÕES DE INICIALIZAÇÃO DE PÁGINA ---

function initializeNavigation(user, token) {
    const userNavigation = document.getElementById('user-navigation');
    if (userNavigation) {
        if (user && token) {
            userNavigation.innerHTML = `
                <div class="nav-links">
                    <a href="events.html" class="btn">Eventos</a>
                    <a href="ranking.html" class="btn">Ranking</a>
                </div>
                <div class="user-profile" id="user-profile-menu">
                    <img src="${user.profile_picture_url || `https://i.pravatar.cc/40?u=${user.username}`}" alt="Foto do Usuário">
                    <span class="username-nav">Olá, ${user.username}</span>
                    <div class="profile-dropdown">
                        <a href="profile.html">Minha Conta</a>
                        <button id="logout-btn">Sair</button>
                    </div>
                </div>
            `;
            // Adiciona listener para o menu dropdown
            document.getElementById('user-profile-menu')?.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') {
                    e.currentTarget.classList.toggle('active');
                }
            });
            // Adiciona listener para o botão de sair
            document.getElementById('logout-btn')?.addEventListener('click', () => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'login.html';
            });
        } else {
            userNavigation.innerHTML = `
                <div class="auth-buttons">
                    <a href="login.html" class="btn">Login</a>
                    <a href="register.html" class="btn btn-primary">Cadastro</a>
                </div>
            `;
        }
    }
}

function initializeProfilePage(user, token) {
    if (!user) { window.location.href = 'login.html'; return; }

    // --- Seletores de Elementos ---
    const usernameDisplay = document.getElementById('username-display');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const changePhotoBtn = document.getElementById('change-photo-btn');
    const cancelPhotoBtn = document.getElementById('cancel-photo-btn');
    const photoStatusText = document.getElementById('photo-status-text');
    const profileMessage = document.getElementById('profile-message');
    const showChangePasswordBtn = document.getElementById('show-change-password-btn');
    const passwordDisplayArea = document.getElementById('password-display-area');
    const passwordEditArea = document.getElementById('password-edit-area');
    const passwordForm = document.getElementById('password-form');
    const passwordActions = document.querySelector('.password-actions'); // Container dos botões de senha
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');

    let photoBeforeEdit = user.profile_picture_url || `https://i.pravatar.cc/150?u=${user.username}`;

    function setUIState(state) {
        if (state === 'idle') {
            changePhotoBtn.textContent = 'Alterar Foto';
            changePhotoBtn.disabled = false;
            cancelPhotoBtn.style.display = 'none';
            photoStatusText.style.display = 'block';
        } else if (state === 'uploading') {
            changePhotoBtn.textContent = 'Enviando...';
            changePhotoBtn.disabled = true;
            cancelPhotoBtn.style.display = 'inline-block';
            cancelPhotoBtn.textContent = 'Cancelar'; // Durante o upload, o botão é 'Cancelar'
            photoStatusText.style.display = 'none';
        } else if (state === 'success') {
            changePhotoBtn.textContent = 'Foto Atualizada ✔️';
            changePhotoBtn.disabled = true;
            cancelPhotoBtn.textContent = 'Reverter'; // Após o sucesso, o botão é 'Reverter'
            cancelPhotoBtn.style.display = 'inline-block';
            photoStatusText.style.display = 'none';
        }
    }

    if (usernameDisplay) usernameDisplay.value = user.username;
    if (profilePicPreview) profilePicPreview.src = photoBeforeEdit;

    changePhotoBtn?.addEventListener('click', () => { if (!changePhotoBtn.disabled) profilePicUpload?.click(); });

    profilePicUpload?.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => { if (profilePicPreview) profilePicPreview.src = e.target.result; };
        reader.readAsDataURL(file);

        setUIState('uploading');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();
            if (!uploadData.secure_url) throw new Error('Falha no upload para o Cloudinary.');

            await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ profilePictureUrl: uploadData.secure_url })
            });

            const updatedUser = { ...user, profile_picture_url: uploadData.secure_url };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            const headerProfilePic = document.querySelector('.user-profile img');
            if (headerProfilePic) headerProfilePic.src = uploadData.secure_url;

            setUIState('success');
        } catch (error) {
            alert(`Erro: ${error.message}`);
            setUIState('idle');
            if (profilePicPreview) profilePicPreview.src = photoBeforeEdit; // Reverte o preview em caso de erro
        }
    });

    cancelPhotoBtn?.addEventListener('click', async () => {
        // A lógica de reversão agora usa a variável 'photoBeforeEdit'
        if (!confirm('Tem certeza que deseja reverter para a foto anterior?')) return;

        try {
            // Envia a URL da foto anterior de volta para o backend
            await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ profilePictureUrl: photoBeforeEdit })
            });

            // Atualiza o localStorage e a UI
            const revertedUser = { ...user, profile_picture_url: photoBeforeEdit };
            localStorage.setItem('user', JSON.stringify(revertedUser));

            const headerProfilePic = document.querySelector('.user-profile img');
            if (headerProfilePic) headerProfilePic.src = photoBeforeEdit;

            if (profilePicPreview) profilePicPreview.src = photoBeforeEdit;
            setUIState('idle');
        } catch (error) {
            alert(`Erro ao reverter: ${error.message}`);
        }
    });

    // --- NOVA LÓGICA DE ESTADOS PARA A SEÇÃO DE SENHA ---
    function setPasswordUIState(state, message = '') {
        if (!passwordDisplayArea || !passwordEditArea || !passwordActions || !profileMessage) return;

        if (state === 'display') {
            passwordDisplayArea.style.display = 'block';
            passwordEditArea.style.display = 'none';
            profileMessage.textContent = '';
        } else if (state === 'edit') {
            passwordDisplayArea.style.display = 'none';
            passwordEditArea.style.display = 'block';
            passwordActions.innerHTML = `
                <button type="submit" class="btn btn-primary">Salvar Nova Senha</button>
                <button type="button" id="cancel-password-btn-inner" class="btn">Cancelar</button>
            `;
            // Re-adiciona o listener do novo botão cancelar
            document.getElementById('cancel-password-btn-inner')?.addEventListener('click', () => setPasswordUIState('display'));
        } else if (state === 'loading') {
            passwordActions.innerHTML = `<button type="button" class="btn btn-primary" disabled>Salvando Senha...</button>`;
        } else if (state === 'success') {
            passwordActions.innerHTML = `<p class="success-message">${message}</p>`;
            setTimeout(() => {
                setPasswordUIState('display');
            }, 2000); // Volta ao estado inicial após 2 segundos
        }
    }

    // --- LISTENERS DOS BOTÕES DE SENHA ---
    showChangePasswordBtn?.addEventListener('click', () => {
        setPasswordUIState('edit');
    });

    // O botão 'cancel' original é substituído, então usamos o listener no formulário
    passwordEditArea?.addEventListener('click', (e) => {
        if (e.target.id === 'cancel-password-btn') {
            setPasswordUIState('display');
        }
    });

    passwordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;

        if (!newPassword || newPassword.length < 6) {
            profileMessage.className = 'error';
            profileMessage.textContent = 'A senha deve ter no mínimo 6 caracteres.';
            return;
        }

        setPasswordUIState('loading');

        try {
            const response = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            document.getElementById('new-password').value = '';
            setPasswordUIState('success', 'Sua senha foi alterada com sucesso!');

        } catch (error) {
            profileMessage.className = 'error';
            profileMessage.textContent = `Erro: ${error.message}`;
            // Em caso de erro, volta para o modo de edição para o usuário tentar novamente
            setPasswordUIState('edit');
        }
    });
}

function initializeEventPage(user, token) {
    const mainContent = document.querySelector('.container');
    if (!mainContent) return;

    // Protege a página caso o usuário não esteja logado
    if (!user || !token) {
        mainContent.innerHTML = `<div class="auth-container" style="text-align: center;"><h2>Bem-vindo!</h2><p>Faça login ou cadastre-se para participar.</p></div>`;
        mainContent.classList.remove('content-hidden'); // Revela o conteúdo
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId') || '1'; // Pega o ID do evento da URL, default para '1'

    // Lógica de invalidação de cache
    const isInvalidated = localStorage.getItem('paymentStatusChanged') === 'true' || localStorage.getItem('dataCacheInvalidated') === 'true';
    if (isInvalidated) {
        sessionStorage.removeItem(`eventDataCache-${eventId}`); // Remove cache específico do evento
        localStorage.removeItem('paymentStatusChanged'); // Limpa flags de invalidação
        localStorage.removeItem('dataCacheInvalidated');
    }

    // Tenta carregar dados do cache
    const cachedData = sessionStorage.getItem(`eventDataCache-${eventId}`);
    const parsedCachedData = cachedData ? JSON.parse(cachedData) : null;

    if (parsedCachedData) {
        loadEventPageContent(eventId, token, parsedCachedData.hasPaid); // Usa dados do cache
    } else {
        // Se não há cache ou ele foi invalidado, busca o status de pagamento
        checkPaymentStatus(eventId, token).then(hasPaid => {
            // Salva os novos dados no cache
            sessionStorage.setItem(`eventDataCache-${eventId}`, JSON.stringify({ eventId, hasPaid }));
            loadEventPageContent(eventId, token, hasPaid);
        }).catch(error => {
            console.error("Erro ao verificar status de pagamento:", error);
            mainContent.innerHTML = `<h2 style="color:red;">Erro ao carregar dados do evento.</h2>`;
            mainContent.classList.remove('content-hidden');
        });
    }
}

function initializeEventsListPage(token) {
    if (!token) { window.location.href = 'login.html'; return; } // Protege a página

    const eventsGrid = document.getElementById('events-grid-container');

    // Função interna para carregar a lista de eventos (futuros ou passados)
    async function loadEvents(status) {
        try {
            eventsGrid.innerHTML = '<p style="text-align: center;">Carregando eventos...</p>';
            const response = await fetch(`${API_URL}/api/events?status=${status}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar eventos.');
            const events = await response.json();
            let eventsHtml = '';
            if (events.length === 0) {
                eventsHtml = `<p style="text-align: center;">Nenhum evento ${status === 'upcoming' ? 'futuro' : 'passado'} encontrado.</p>`;
            } else {
                events.forEach((event, index) => {
                    const eventDate = new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                    const eventLink = `index.html?eventId=${event.id}`;
                    let timerHtml = '';
                    // Exibe o timer apenas para o primeiro evento futuro
                    if (status === 'upcoming' && index === 0) {
                        const countdownId = `event-countdown-${event.id}`;
                        timerHtml = `<div class="event-card-timer"><strong id="${countdownId}">--:--:--</strong></div>`;
                        // Inicia o countdown após um pequeno atraso para garantir que o elemento exista
                        setTimeout(() => startCountdown(event.picks_deadline, countdownId), 0);
                    }
                    eventsHtml += `
                        <a href="${eventLink}" class="event-card-link">
                            <div class="event-card">
                                <img src="${event.card_image_url || 'https://via.placeholder.com/400x200'}" class="event-card-bg" alt="${event.name || 'Evento'}">
                                ${status === 'past' ? '<span class="status-tag">Encerrado</span>' : ''}
                                ${timerHtml}
                                <div class="event-card-info">
                                    <h3>${event.name}</h3>
                                    <p>${eventDate}</p>
                                </div>
                            </div>
                        </a>
                    `;
                });
            }
            eventsGrid.innerHTML = eventsHtml;
        } catch (error) {
            eventsGrid.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        }
    }

    // Adiciona listeners aos botões das abas para carregar eventos futuros/passados
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.tab-button.active')?.classList.remove('active');
            button.classList.add('active');
            loadEvents(button.dataset.status);
        });
    });

    loadEvents('upcoming'); // Carrega os eventos futuros por padrão
}

function initializeRankingPage(token) {
    if (!token) { window.location.href = 'login.html'; return; } // Protege a página

    const rankingContent = document.getElementById('ranking-table-container');
    const eventSelectorContainer = document.getElementById('event-selector-container');
    const eventSelect = document.getElementById('event-select');
    let allEvents = []; // Armazena os eventos para popular o dropdown

    // Função interna para carregar e exibir a tabela de ranking
    function loadRankingTable(type, eventId = null) {
        let url = `${API_URL}/api/rankings/`;
        if (type === 'general') {
            url += 'general';
        } else if (type === 'event' && eventId) {
            url += `event/${eventId}`;
        } else {
            if (rankingContent) rankingContent.innerHTML = '<p>Selecione um evento para ver o ranking.</p>';
            return;
        }

        try {
            rankingContent.innerHTML = '<p>Carregando ranking...</p>';
            fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(response => {
                    if (!response.ok) throw new Error('Falha ao carregar ranking.');
                    return response.json();
                })
                .then(data => {
                    buildTableHtml(type, data);
                })
                .catch(error => {
                    rankingContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
                });
        } catch (error) {
            rankingContent.innerHTML = `<p style="color:red;">Erro ao buscar dados: ${error.message}</p>`;
        }
    }

    // Adicione esta nova função para buscar e exibir as fotos na tabela de ranking
    function renderUserInRankingTable(user, rowData) {
        // Obtém a URL da foto do perfil do usuário logado ou usa um placeholder
        const profilePicUrl = user.profile_picture_url || `https://i.pravatar.cc/45?u=${user.username}`;

        // Constrói o HTML para a célula do usuário com a foto e o nome
        return `
        <div class="user-info-cell">
            <img src="${profilePicUrl}" alt="Foto de Perfil de ${user.username}">
            <span class="user-name">${user.username}</span>
        </div>
    `;
    }

    // Função interna para construir o HTML da tabela
    function buildTableHtml(type, data) {
        if (!rankingContent) return;

        // REMOVIDO: O trecho de busca do usuário logado aqui, pois não será usado para todos os usuários do ranking.
        // const loggedInUser = JSON.parse(localStorage.getItem('user'));

        let tableHtml = '<table><thead><tr><th>Posição</th><th>Usuário</th>';
        let valueKey = '';

        if (type === 'general') {
            tableHtml += '<th>Pontuação Total</th></tr></thead><tbody>';
            valueKey = 'total_points';
        }
        // A condição 'else if (type === 'event')' foi removida pois estamos apenas com ranking geral.
        else {
            rankingContent.innerHTML = '<p>Tipo de ranking inválido.</p>';
            return;
        }

        if (data.length === 0) {
            tableHtml += '<tr><td colspan="3" style="text-align:center;">Nenhuma pontuação registrada.</td></tr>';
        } else {
            data.forEach((row, index) => {
                // --- MODIFICAÇÃO PRINCIPAL AQUI ---
                // Para exibir a foto correta de CADA usuário, precisaríamos que o 'row' (que vem da API)
                // contivesse a informação da foto de perfil. Como isso não está vindo, usaremos o pravatar.cc
                // baseado no username de cada row, que é a forma mais simples sem mexer na API.
                // Se a API retornar uma URL de foto, você adaptaria esta linha para usar essa URL.

                const userProfilePic = row.profile_picture_url || `https://i.pravatar.cc/45?u=${row.username}`;

                const userInfoHtml = `
                <div class="user-info-cell">
                    <img src="${userProfilePic}" alt="Foto de Perfil de ${row.username}">
                    <span class="user-name">${row.username}</span>
                </div>
            `;
                // --- FIM DA MODIFICAÇÃO ---

                tableHtml += `
                <tr>
                    <td><b>${index + 1}º</b></td>
                    <td>${userInfoHtml}</td> <!-- Usando o userInfoHtml construído -->
                    <td>${row[valueKey]}</td>
                </tr>`;
            });
        }
        tableHtml += '</tbody></table>';
        rankingContent.innerHTML = tableHtml;
    }

    // Função para carregar os eventos no dropdown
    async function loadEventsForSelector() {
        try {
            const response = await fetch(`${API_URL}/api/events?status=upcoming`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar eventos para o ranking.');
            allEvents = await response.json();

            if (eventSelect) {
                // Limpa opções existentes (caso haja recarregamento)
                eventSelect.innerHTML = '<option value="">Selecione um Evento...</option>';
                allEvents.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = event.name;
                    eventSelect.appendChild(option);
                });
                // Carrega o ranking do primeiro evento se houver
                if (allEvents.length > 0) {
                    loadRankingTable('event', allEvents[0].id);
                } else {
                    if (rankingContent) rankingContent.innerHTML = '<p>Nenhum evento encontrado para exibir ranking.</p>';
                }
            }
        } catch (error) {
            console.error("Erro ao carregar eventos para o ranking:", error);
            if (rankingContent) rankingContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    // Adiciona listeners aos botões das abas (geral vs. evento)
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.tab-button.active')?.classList.remove('active');
            button.classList.add('active');
            const rankingType = button.dataset.ranking;

            if (rankingType === 'event') {
                if (eventSelectorContainer) eventSelectorContainer.style.display = 'block';
                if (eventSelect && eventSelect.value) {
                    loadRankingTable('event', eventSelect.value);
                } else if (allEvents.length > 0) { // Caso o dropdown já esteja populado mas nada foi selecionado
                    loadRankingTable('event', allEvents[0].id);
                }
            } else {
                if (eventSelectorContainer) eventSelectorContainer.style.display = 'none';
                loadRankingTable('general');
            }
        });
    });

    // Adiciona listener para mudança no dropdown de evento
    if (eventSelect) {
        eventSelect.addEventListener('change', () => {
            loadRankingTable('event', eventSelect.value);
        });
    }

    // Inicia o carregamento
    loadEventsForSelector();
    loadRankingTable('general'); // Carrega o ranking geral por padrão
}

// --- FUNÇÕES AUXILIARES ---

// Verifica o status de pagamento de um evento
async function checkPaymentStatus(eventId, token) {
    try {
        const response = await fetch(`${API_URL}/api/payment-status/${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return data.hasPaid;
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        return false; // Assume não pago em caso de erro
    }
}

// Inicia o processo de pagamento
async function handlePayment(eventId, token) {
    try {
        const response = await fetch(`${API_URL}/api/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ eventId })
        });
        const data = await response.json();
        if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl; // Redireciona para a página de pagamento
        } else {
            throw new Error('Não foi possível obter o link de pagamento.');
        }
    } catch (error) {
        alert(`Erro ao iniciar pagamento: ${error.message}`);
    }
}

// Carrega e renderiza o conteúdo da página de detalhes do evento
async function loadEventPageContent(eventId, token, hasPaid) {
    const mainContent = document.querySelector('.container');
    try {
        const response = await fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Falha ao carregar dados do evento.');
        eventData = await response.json(); // Armazena dados do evento globalmente

        // Preenche os campos de palpites bônus se o usuário já fez
        const fotnSelect = document.getElementById('fight-of-night');
        const potnSelect = document.getElementById('performance-of-night');
        const saveBonusBtn = document.getElementById('save-bonus-picks-btn');

        if (eventData.userBonusPicks) {
            // Usa setTimeout para garantir que os <options> já foram criados
            setTimeout(() => {
                if (fotnSelect && eventData.userBonusPicks.fight_of_the_night_fight_id) {
                    fotnSelect.value = eventData.userBonusPicks.fight_of_the_night_fight_id;
                }
                if (potnSelect && eventData.userBonusPicks.performance_of_the_night_fighter_name) {
                    potnSelect.value = eventData.userBonusPicks.performance_of_the_night_fighter_name;
                }
            }, 100); // Pequeno delay

            if (saveBonusBtn) {
                saveBonusBtn.textContent = 'Editar Palpites Bônus';
            }
        }

        // Atualiza o título do evento e inicia o contador regressivo
        const eventHeader = document.querySelector('.event-header h2');
        if (eventHeader) eventHeader.textContent = eventData.eventName;
        // Assumindo que há um elemento com id="countdown" na página
        startCountdown(eventData.picksDeadline, 'countdown');

        if (hasPaid) { // Se o usuário pagou
            loadFights(); // Carrega os cards de luta
            populateBonusPicks(eventData.fights); // Preenche os selects de bônus

            const saveBonusBtnContainer = document.getElementById('save-bonus-btn-container');
            if (saveBonusBtnContainer) {
                saveBonusBtnContainer.style.display = 'block'; // Torna visível o container do botão
                // Adiciona listener ao botão de salvar palpites bônus
                if (saveBonusBtn) {
                    saveBonusBtn.addEventListener('click', () => {
                        handleSaveBonusPicks(eventId, token);
                    });
                }
            }
        } else { // Se o usuário não pagou
            const paymentSection = document.getElementById('payment-section');
            if (paymentSection) {
                const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(eventData.entry_price));
                paymentSection.innerHTML = `
                    <button id="pay-btn" class="btn btn-primary btn-save-all">
                        Liberar Palpites para "${eventData.eventName}" (${formattedPrice})
                    </button>
                `;
                document.getElementById('pay-btn')?.addEventListener('click', () => handlePayment(eventId, token));
            }
            const fightGrid = document.getElementById('fight-card-grid');
            if (fightGrid) fightGrid.innerHTML = '<p style="text-align:center; font-size: 1.2rem; padding: 40px 0;">Pague a taxa de entrada para visualizar e fazer seus palpites.</p>';
            const bonusSection = document.querySelector('.bonus-picks-section');
            if (bonusSection) bonusSection.style.display = 'none'; // Esconde a seção de bônus
        }

    } catch (error) {
        if (mainContent) mainContent.innerHTML = `<h2 style="color:red;">${error.message}</h2>`;
    } finally {
        // Revela o conteúdo principal após o carregamento (mesmo que haja erros)
        if (mainContent) {
            mainContent.classList.remove('content-hidden');
        }
    }
}

// Salva os palpites bônus
async function handleSaveBonusPicks(eventId, token) {
    const fightOfTheNight = document.getElementById('fight-of-night').value;
    const performanceOfTheNight = document.getElementById('performance-of-night').value;

    if (!fightOfTheNight || !performanceOfTheNight) {
        return alert('Por favor, selecione a Luta e a Performance da Noite.');
    }

    try {
        const response = await fetch(`${API_URL}/api/bonus-picks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId, fightOfTheNight, performanceOfTheNight })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível salvar os palpites bônus.');

        alert('Palpites bônus salvos com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar palpites bônus:', error);
        alert(`Erro: ${error.message}`);
    }
}

// Desenha os cards de luta na página de evento
function loadFights() {
    const fightCardGrid = document.getElementById('fight-card-grid');
    if (!fightCardGrid) return;

    fightCardGrid.innerHTML = ''; // Limpa o grid

    if (!eventData || !eventData.fights) {
        fightCardGrid.innerHTML = '<p>Nenhuma luta encontrada para este evento.</p>';
        return;
    }

    eventData.fights.forEach(fight => {
        const pick = eventData.userPicks && eventData.userPicks[fight.id]; // Verifica se há palpite para esta luta

        const buttonText = pick ? 'Alterar Palpite' : 'Fazer Palpite';
        const buttonClass = pick ? 'btn-edit-pick' : 'btn-pick';

        let pickDisplay = '';
        if (pick) {
            const methodDisplay = pick.predicted_method === 'Decision' ?
                `Decisão ${pick.predicted_details}` :
                `${pick.predicted_method} no ${pick.predicted_details}`;
            pickDisplay = `<p class="palpite-feito">Seu palpite: ${pick.predicted_winner_name} por ${methodDisplay}</p>`;
        }

        const fightCard = `
            <div class="fight-card" data-fight-id="${fight.id}">
                <div class="fighters">
                    <div class="fighter">
                        <img src="${fight.fighter1_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter1_name}">
                        <h4>${fight.fighter1_name}</h4>
                        <span>${fight.fighter1_record || ''}</span>
                    </div>
                    <span class="vs">VS</span>
                    <div class="fighter">
                        <img src="${fight.fighter2_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter2_name}">
                        <h4>${fight.fighter2_name}</h4>
                        <span>${fight.fighter2_record || ''}</span>
                    </div>
                </div>
                <div class="pick-status">
                    ${pickDisplay}
                    <button class="btn ${buttonClass}">${buttonText}</button>
                </div>
            </div>
        `;
        fightCardGrid.insertAdjacentHTML('beforeend', fightCard);
    });
}

// Inicia e atualiza um contador regressivo
function startCountdown(deadline, elementId) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) return;

    const timerContainer = countdownElement.closest('.timer, .event-card-timer');
    const deadlineTime = new Date(deadline).getTime();
    let interval;

    function updateTimer() {
        const now = new Date().getTime();
        const distance = deadlineTime - now;

        if (distance < 0) {
            clearInterval(interval);
            countdownElement.innerHTML = "PRAZO ENCERRADO";
            // Desabilita botões relevantes na página de evento principal
            if (document.body.id === 'event-page') {
                document.querySelectorAll('.btn-pick, .btn-edit-pick, .btn-save-all').forEach(btn => {
                    if (btn) btn.disabled = true;
                });
            }
        } else {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    };

    interval = setInterval(updateTimer, 1000); // Atualiza a cada segundo
    updateTimer(); // Chama uma vez imediatamente para exibir o valor inicial

    // Revela o container do timer com um efeito fade-in
    if (timerContainer) {
        timerContainer.classList.add('visible');
    }
}

// Preenche os selects de "Luta da Noite" e "Performance da Noite"
function populateBonusPicks(fights) {
    const fightSelect = document.getElementById('fight-of-night');
    const perfSelect = document.getElementById('performance-of-night');
    if (!fightSelect || !perfSelect) return;

    fightSelect.innerHTML = '<option value="">Selecione a luta...</option>'; // Limpa opções e adiciona placeholder
    perfSelect.innerHTML = '<option value="">Selecione o lutador...</option>'; // Limpa opções e adiciona placeholder

    const allFighters = new Set(); // Conjunto para garantir nomes únicos de lutadores

    fights.forEach(fight => {
        // Popula o select de Luta da Noite
        const fightOption = document.createElement('option');
        fightOption.value = fight.id;
        fightOption.textContent = `${fight.fighter1_name} vs ${fight.fighter2_name}`;
        fightSelect.appendChild(fightOption);

        // Coleta nomes de lutadores para o select de Performance da Noite
        allFighters.add(fight.fighter1_name);
        allFighters.add(fight.fighter2_name);
    });

    // Popula o select de Performance da Noite
    allFighters.forEach(fighterName => {
        const perfOption = document.createElement('option');
        perfOption.value = fighterName;
        perfOption.textContent = fighterName;
        perfSelect.appendChild(perfOption);
    });
}

// Abre o modal para fazer/alterar um palpite
function openPickModal(fightId) {
    const modal = document.getElementById('pick-modal');
    const pickForm = document.getElementById('pick-form');
    const modalTitle = document.getElementById('modal-title');
    const fighter1Div = document.getElementById('modal-fighter1');
    const fighter2Div = document.getElementById('modal-fighter2');
    const methodGroup = document.getElementById('method-group');
    const roundGroup = document.getElementById('round-group');
    const decisionTypeGroup = document.getElementById('decision-type-group');

    const fight = eventData.fights.find(f => f.id === fightId);
    if (!fight) {
        console.error('Luta não encontrada para o ID:', fightId);
        return;
    }

    // Resetar o modal
    if (pickForm) pickForm.reset();
    if (methodGroup) methodGroup.style.display = 'none';
    if (roundGroup) roundGroup.style.display = 'none';
    if (decisionTypeGroup) decisionTypeGroup.style.display = 'none';
    document.querySelectorAll('.fighter-option, .method-btn').forEach(el => el.classList.remove('selected'));

    // Preencher dados da luta no modal
    if (document.getElementById('fight-id')) document.getElementById('fight-id').value = fight.id;
    if (modalTitle) modalTitle.textContent = `Palpite para: ${fight.fighter1_name} vs ${fight.fighter2_name}`;

    if (fighter1Div) {
        fighter1Div.innerHTML = `<img src="${fight.fighter1_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter1_name}"><h4>${fight.fighter1_name}</h4>`;
        fighter1Div.dataset.fighterName = fight.fighter1_name;
    }
    if (fighter2Div) {
        fighter2Div.innerHTML = `<img src="${fight.fighter2_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter2_name}"><h4>${fight.fighter2_name}</h4>`;
        fighter2Div.dataset.fighterName = fight.fighter2_name;
    }

    // Tornar o modal visível
    if (modal) modal.classList.add('active');
}
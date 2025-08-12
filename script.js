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
    if (!user) { window.location.href = 'login.html'; return; } // Protege a página

    // --- Seletores de Elementos ---
    const usernameDisplay = document.getElementById('username-display');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const changePhotoBtn = document.getElementById('change-photo-btn');
    const cancelPhotoBtn = document.getElementById('cancel-photo-btn');
    const photoStatusText = document.getElementById('photo-status-text'); // Tooltip
    const profileMessage = document.getElementById('profile-message');
    const showChangePasswordBtn = document.getElementById('show-change-password-btn');
    const passwordDisplayArea = document.getElementById('password-display-area');
    const passwordEditArea = document.getElementById('password-edit-area');
    const passwordForm = document.getElementById('password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');

    // Guarda a URL da foto anterior para reversão
    let photoBeforeEdit = user.profile_picture_url || `https://i.pravatar.cc/150?u=${user.username}`;

    // Função para gerenciar o estado da interface de upload de foto
    function setPhotoUIState(state) {
        if (state === 'idle') { // Estado inicial ou após cancelar
            changePhotoBtn.textContent = 'Alterar Foto';
            changePhotoBtn.disabled = false;
            cancelPhotoBtn.style.display = 'none'; // Esconde o botão cancelar/reverter
            photoStatusText.style.display = 'block'; // Mostra o tooltip
        } else if (state === 'uploading') { // Durante o upload
            changePhotoBtn.textContent = 'Enviando...';
            changePhotoBtn.disabled = true;
            cancelPhotoBtn.style.display = 'inline-block';
            cancelPhotoBtn.textContent = 'Cancelar'; // Muda o texto do botão para Cancelar
            photoStatusText.style.display = 'none'; // Esconde o tooltip
        } else if (state === 'success') { // Após upload bem-sucedido
            changePhotoBtn.textContent = 'Foto Atualizada ✔️';
            changePhotoBtn.disabled = true; // Desabilita após sucesso
            cancelPhotoBtn.textContent = 'Reverter'; // Muda o texto para Reverter
            cancelPhotoBtn.style.display = 'inline-block';
            photoStatusText.style.display = 'none';
        }
    }

    // Preenche os campos de nome e foto
    if (usernameDisplay) usernameDisplay.value = user.username;
    if (profilePicPreview) profilePicPreview.src = photoBeforeEdit;

    // Listener para o botão "Alterar Foto" que ativa o input de arquivo
    changePhotoBtn?.addEventListener('click', () => {
        if (!changePhotoBtn.disabled) { // Só ativa se não estiver desabilitado
            profilePicUpload?.click();
        }
    });

    // Listener para o input de arquivo de foto
    profilePicUpload?.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return; // Sai se nenhum arquivo foi selecionado

        // Preview da imagem selecionada
        const reader = new FileReader();
        reader.onload = e => {
            if (profilePicPreview) profilePicPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        setPhotoUIState('uploading'); // Muda UI para estado de upload

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default'); // Use seu preset do Cloudinary
        formData.append('cloud_name', 'djzz8b53h'); // Use seu cloud name do Cloudinary

        try {
            // Upload para o Cloudinary
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/djzz8b53h/image/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();

            if (!uploadData.secure_url) throw new Error('Falha no upload para o Cloudinary.');

            // Atualiza a URL da foto no backend da sua aplicação
            await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ profilePictureUrl: uploadData.secure_url })
            });

            // Atualiza os dados do usuário no localStorage e na navegação
            const updatedUser = { ...user, profile_picture_url: uploadData.secure_url };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            const headerProfilePic = document.querySelector('.user-profile img');
            if (headerProfilePic) headerProfilePic.src = uploadData.secure_url;

            setPhotoUIState('success'); // Muda UI para estado de sucesso
        } catch (error) {
            alert(`Erro ao atualizar foto: ${error.message}`);
            setPhotoUIState('idle'); // Volta para estado idle em caso de erro
            if (profilePicPreview) profilePicPreview.src = photoBeforeEdit; // Reverte o preview
        }
    });

    // Listener para o botão "Reverter" ou "Cancelar" a foto
    cancelPhotoBtn?.addEventListener('click', async () => {
        if (cancelPhotoBtn.textContent === 'Cancelar') { // Se for o botão de Cancelar durante upload
            // Implementar lógica de cancelamento de upload se necessário (geralmente mais complexo)
            // Por enquanto, apenas volta ao estado inicial
            setPhotoUIState('idle');
            if (profilePicPreview) profilePicPreview.src = photoBeforeEdit; // Reverte o preview
            // Limpa o input de arquivo
            if (profilePicUpload) profilePicUpload.value = '';
        } else { // Se for o botão de Reverter após sucesso
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

                setPhotoUIState('idle'); // Volta para estado idle
            } catch (error) {
                alert(`Erro ao reverter foto: ${error.message}`);
            }
        }
    });

    // --- LÓGICA PARA ALTERAÇÃO DE SENHA ---
    if (showChangePasswordBtn) {
        showChangePasswordBtn.addEventListener('click', () => {
            passwordDisplayArea.style.display = 'none';
            passwordEditArea.style.display = 'block';
        });
    }

    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', () => {
            passwordEditArea.style.display = 'none';
            passwordDisplayArea.style.display = 'block';
            // Limpa os campos e mensagens de erro/sucesso
            document.getElementById('new-password').value = '';
            if (profileMessage) profileMessage.textContent = '';
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = passwordForm.querySelector('button[type="submit"]');
            const newPassword = document.getElementById('new-password').value;

            // Validações da senha
            if (!newPassword) {
                if (profileMessage) profileMessage.textContent = 'Por favor, digite a nova senha.';
                return;
            }
            if (newPassword.length < 6) {
                if (profileMessage) profileMessage.textContent = 'A senha deve ter no mínimo 6 caracteres.';
                return;
            }

            // Prepara o botão de submit
            submitButton.textContent = 'Salvando Senha...';
            submitButton.disabled = true;
            if (profileMessage) profileMessage.textContent = ''; // Limpa mensagens anteriores

            try {
                // Envia a nova senha para o backend
                const response = await fetch(`${API_URL}/api/users/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ newPassword }) // Envia apenas a nova senha
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                // Feedback de sucesso
                if (profileMessage) {
                    profileMessage.className = 'success'; // Adiciona uma classe para estilizar a mensagem
                    profileMessage.textContent = data.message || 'Senha alterada com sucesso!';
                }

                // Volta para o estado de exibição da senha após um pequeno delay
                setTimeout(() => {
                    passwordEditArea.style.display = 'none';
                    passwordDisplayArea.style.display = 'block';
                    document.getElementById('new-password').value = '';
                    if (profileMessage) profileMessage.textContent = '';
                }, 2000);

            } catch (error) {
                // Feedback de erro
                if (profileMessage) {
                    profileMessage.className = 'error'; // Adiciona uma classe para estilizar a mensagem de erro
                    profileMessage.textContent = `Erro: ${error.message}`;
                }
            } finally {
                // Restaura o estado do botão de submit
                submitButton.textContent = 'Salvar Nova Senha';
                submitButton.disabled = false;
            }
        });
    }
}

// --- FUNÇÕES AUXILIARES (as mesmas de antes, mas integradas) ---

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
    if (!mainContent) return;
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
// =================== CÓDIGO FINAL E DEFINITIVO PARA script.js ===================
const API_URL = 'https://site-palpites-pagos.vercel.app';
let eventData = {}; // Variável global para armazenar dados do evento

// --- PONTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    handleNavigation(); // Cuida do cabeçalho

    // Roda a lógica específica da página atual
    const pageId = document.body.id;
    if (pageId === 'event-page') {
        initializeEventPage();
    } else if (pageId === 'ranking-page') {
        initializeRankingPage();
    }
});

// --- FUNÇÕES DE INICIALIZAÇÃO DE PÁGINAS ---

function handleNavigation() {
    const userNavigation = document.getElementById('user-navigation');
    if (!userNavigation) return;
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (user && token) {
        userNavigation.innerHTML = `
            <div class="nav-links"><a href="index.html" class="btn">Eventos</a><a href="ranking.html" class="btn">Ranking</a></div>
            <div class="user-profile"><img src="https://i.pravatar.cc/40?u=${user.username}" alt="Foto do Usuário"><span>Olá, ${user.username}</span></div>
            <button id="logout-btn" class="btn btn-logout">Sair</button>`;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });
    } else {
        userNavigation.innerHTML = `<div class="auth-buttons"><a href="login.html" class="btn">Login</a><a href="register.html" class="btn btn-primary">Cadastro</a></div>`;
    }
}

async function initializeEventPage() {
    const mainContent = document.querySelector('.container');
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!mainContent) return;
    if (!user || !token) {
        mainContent.innerHTML = `<div class="auth-container" style="text-align: center;"><h2>Bem-vindo!</h2><p>Faça login ou cadastre-se para participar.</p></div>`;
        return;
    }

    const eventId = 1;
    const cacheKey = `eventDataCache_user${user.id}_event${eventId}`;
    const paymentStatusChanged = localStorage.getItem('paymentStatusChanged') === 'true';
    const cachedData = paymentStatusChanged ? null : JSON.parse(localStorage.getItem(cacheKey));

    if (cachedData) {
        loadEventPageContent(cachedData.eventData, cachedData.hasPaid, token, eventId);
    } else {
        try {
            mainContent.innerHTML = '<p style="text-align:center; padding: 50px;">Carregando dados do evento...</p>';
            const hasPaid = await checkPaymentStatus(eventId, token);
            const eventDataResponse = await fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!eventDataResponse.ok) throw new Error('Falha ao carregar o evento.');
            const eventData = await eventDataResponse.json();

            localStorage.setItem(cacheKey, JSON.stringify({ eventData, hasPaid }));
            localStorage.removeItem('paymentStatusChanged');
            loadEventPageContent(eventData, hasPaid, token, eventId);
        } catch (error) { mainContent.innerHTML = `<h2 style="color:red; text-align:center;">${error.message}</h2>`; }
    }
}

async function initializeRankingPage() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    await loadRanking('general', token); // Carrega o ranking geral por padrão

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.tab-button.active').classList.remove('active');
            button.classList.add('active');
            loadRanking(button.dataset.target, token);
        });
    });
}

// --- FUNÇÕES AUXILIARES ---

function loadEventPageContent(data, hasPaid, token, eventId) {
    eventData = data;
    const mainContent = document.querySelector('.container');
    if (!mainContent) return;

    // Renderiza o esqueleto da página de eventos
    mainContent.innerHTML = `
        <section class="event-header"><h2>${eventData.eventName}</h2><p>Faça seus palpites e concorra a prêmios incríveis!</p><div class="timer"><span>Tempo restante para palpites:</span><strong id="countdown">--:--:--</strong></div></section>
        <section class="fight-card-section"><h3>Card Principal</h3><div class="fight-card-grid" id="fight-card-grid"></div></section>
        <section class="bonus-picks-section"><h3>Palpites Bônus</h3><div class="bonus-grid"><div class="bonus-pick-card"><label for="fight-of-night">Luta da Noite:</label><select id="fight-of-night" class="custom-select"></select></div><div class="bonus-pick-card"><label for="performance-of-night">Performance da Noite:</label><select id="performance-of-night" class="custom-select"></select></div></div><div id="save-bonus-btn-container" class="actions-footer" style="display: none;"><button id="save-bonus-picks-btn" class="btn">Salvar Palpites Bônus</button></div></section>
        <div class="actions-footer" id="payment-section"></div>`;

    startCountdown(eventData.picksDeadline);
    populateBonusPicks(eventData.fights, eventData.userBonusPicks);

    if (hasPaid) {
        loadFights(eventData.fights, eventData.userPicks);
        const saveBonusBtnContainer = document.getElementById('save-bonus-btn-container');
        if (saveBonusBtnContainer) {
            saveBonusBtnContainer.style.display = 'block';
            document.getElementById('save-bonus-picks-btn').addEventListener('click', () => handleSaveBonusPicks(eventId, token));
        }
    } else {
        const paymentSection = document.getElementById('payment-section');
        const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(eventData.entry_price));
        paymentSection.innerHTML = `<button id="pay-btn" class="btn btn-primary btn-save-all">Liberar Palpites para "${eventData.eventName}" (${formattedPrice})</button>`;
        document.getElementById('pay-btn').addEventListener('click', () => handlePayment(eventId, token));
        document.getElementById('fight-card-grid').innerHTML = '<p style="text-align:center;">Pague a taxa para visualizar e fazer seus palpites.</p>';
        document.querySelector('.bonus-picks-section').style.display = 'none';
    }

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
}

async function checkPaymentStatus(eventId, token) {
    try {
        const response = await fetch(`${API_URL}/api/payment-status/${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return data.hasPaid;
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        return false;
    }
}

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
            // Redireciona o usuário para a página de pagamento
            window.location.href = data.checkoutUrl;
        } else {
            throw new Error('Não foi possível obter o link de pagamento.');
        }
    } catch (error) {
        alert(`Erro ao iniciar pagamento: ${error.message}`);
    }
}

async function handleSaveBonusPicks(eventId, token) {
    const fightOfTheNight = document.getElementById('fight-of-night').value;
    const performanceOfTheNight = document.getElementById('performance-of-night').value;

    if (!fightOfTheNight || !performanceOfTheNight) {
        return alert('Por favor, selecione a Luta e a Performance da Noite.');
    }

    try {
        const response = await fetch(`${API_URL}/api/bonus-picks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ eventId, fightOfTheNight, performanceOfTheNight })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Não foi possível salvar os palpites bônus.');
        }

        alert('Palpites bônus salvos com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar palpites bônus:', error);
        alert(`Erro: ${error.message}`);
    }
}

function startCountdown(deadline) {
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return; // Não faz nada se o elemento não existir

    const deadlineTime = new Date(deadline).getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = deadlineTime - now;

        if (distance < 0) {
            clearInterval(interval);
            countdownElement.innerHTML = "PRAZO ENCERRADO";
            document.querySelectorAll('.btn-pick, .btn-save-all').forEach(btn => btn.disabled = true);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

function loadFights(fights, userPicks) {
    const fightCardGrid = document.getElementById('fight-card-grid');
    if (!fightCardGrid) return;
    fightCardGrid.innerHTML = '';
    fights.forEach(fight => {
        const pick = userPicks[fight.id];
        const buttonText = pick ? 'Alterar Palpite' : 'Fazer Palpite';
        const buttonClass = pick ? 'btn-edit-pick' : 'btn-pick';
        let pickDisplay = '';
        if (pick) {
            const methodDisplay = pick.predicted_method === 'Decision' ? `Decisão ${pick.predicted_details}` : `${pick.predicted_method} no ${pick.predicted_details}`;
            pickDisplay = `<p class="palpite-feito">Seu palpite: ${pick.predicted_winner_name} por ${methodDisplay}</p>`;
        }
        const fightCard = `
            <div class="fight-card" data-fight-id="${fight.id}">
                <div class="fighters">
                    <div class="fighter"><img src="${fight.fighter1_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter1_name}"><h4>${fight.fighter1_name}</h4><span>${fight.fighter1_record || ''}</span></div>
                    <span class="vs">VS</span>
                    <div class="fighter"><img src="${fight.fighter2_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter2_name}"><h4>${fight.fighter2_name}</h4><span>${fight.fighter2_record || ''}</span></div>
                </div>
                <div class="pick-status">${pickDisplay}<button class="btn ${buttonClass}">${buttonText}</button></div>
            </div>`;
        fightCardGrid.insertAdjacentHTML('beforeend', fightCard);
    });
}

function populateBonusPicks(fights, userBonusPicks) {
    const fightSelect = document.getElementById('fight-of-night');
    const perfSelect = document.getElementById('performance-of-night');
    if (!fightSelect || !perfSelect) return;
    fightSelect.innerHTML = '<option value="">Selecione a luta...</option>';
    perfSelect.innerHTML = '<option value="">Selecione o lutador...</option>';
    const allFighters = new Set();
    fights.forEach(fight => {
        const option = document.createElement('option');
        option.value = fight.id;
        option.textContent = `${fight.fighter1_name} vs ${fight.fighter2_name}`;
        fightSelect.appendChild(option);
        allFighters.add(fight.fighter1_name);
        allFighters.add(fight.fighter2_name);
    });
    allFighters.forEach(fighterName => {
        const option = document.createElement('option');
        option.value = fighterName;
        option.textContent = fighterName;
        perfSelect.appendChild(option);
    });
    if (userBonusPicks && userBonusPicks.fight_of_the_night_fight_id) {
        setTimeout(() => {
            fightSelect.value = userBonusPicks.fight_of_the_night_fight_id;
            perfSelect.value = userBonusPicks.performance_of_the_night_fighter_name;
            document.getElementById('save-bonus-picks-btn').textContent = 'Editar Palpites Bônus';
        }, 100);
    }
}

function openPickModal(fightId) {
    // Seleciona os elementos do modal
    const modal = document.getElementById('pick-modal');
    const pickForm = document.getElementById('pick-form');
    const modalTitle = document.getElementById('modal-title');
    const fighter1Div = document.getElementById('modal-fighter1');
    const fighter2Div = document.getElementById('modal-fighter2');
    const methodGroup = document.getElementById('method-group');
    const roundGroup = document.getElementById('round-group');
    const decisionTypeGroup = document.getElementById('decision-type-group');

    // Encontra os dados da luta específica no nosso objeto eventData
    const fight = eventData.fights.find(f => f.id === fightId);
    if (!fight) {
        console.error('Luta não encontrada!');
        return;
    }

    // --- PREPARA O MODAL PARA SER EXIBIDO ---

    // 1. Reseta o formulário e esconde os campos condicionais
    pickForm.reset();
    methodGroup.style.display = 'none';
    roundGroup.style.display = 'none';
    decisionTypeGroup.style.display = 'none';
    document.querySelectorAll('.fighter-option, .method-btn').forEach(el => el.classList.remove('selected'));

    // 2. Preenche os dados da luta
    document.getElementById('fight-id').value = fight.id;
    modalTitle.textContent = `Palpite para: ${fight.fighter1_name} vs ${fight.fighter2_name}`;

    // Lutador 1
    fighter1Div.innerHTML = `<img src="${fight.fighter1_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter1_name}"><h4>${fight.fighter1_name}</h4>`;
    fighter1Div.dataset.fighterName = fight.fighter1_name;

    // Lutador 2
    fighter2Div.innerHTML = `<img src="${fight.fighter2_img || 'https://via.placeholder.com/80'}" alt="${fight.fighter2_name}"><h4>${fight.fighter2_name}</h4>`;
    fighter2Div.dataset.fighterName = fight.fighter2_name;

    // 3. Torna o modal visível
    if (modal) {
        modal.classList.add('active');
    }
}
// --- Lógica do formulário do modal ---
// Listener para o envio (submit) do formulário
const pickForm = document.getElementById('pick-form');
if (pickForm) {
    pickForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return alert('Sessão expirada. Por favor, faça login novamente.');

        const fightId = parseInt(document.getElementById('fight-id').value);
        const winnerName = document.getElementById('winner').value;
        const methodBtn = document.querySelector('.method-btn.selected');
        if (!winnerName || !methodBtn) return alert('Por favor, selecione o vencedor e o método da vitória.');

        const method = methodBtn.dataset.method;
        let details = '';
        if (method === 'Decision') {
            details = pickForm.querySelector('[name="decision-type"]').value;
        } else {
            details = pickForm.querySelector('[name="round"]').value;
        }

        try {
            const response = await fetch(`${API_URL}/api/picks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fightId, winnerName, method, details })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o palpite.');

            eventData.userPicks[fightId] = data.pick;
            alert('Palpite salvo com sucesso!');
            loadFights(eventData.fights, eventData.userPicks); // Atualiza os cards
            document.getElementById('pick-modal').classList.remove('active');
        } catch (error) {
            alert(`Erro ao salvar palpite: ${error.message}`);
        }
    });
}

// Listeners para os cliques nos botões e selects DENTRO do modal
const modal = document.getElementById('pick-modal');
if (modal) {
    // Fechar o modal
    const closeModalBtn = modal.querySelector('.close-modal');
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    // Selecionar vencedor (Camada 1)
    modal.querySelectorAll('.fighter-option').forEach(div => {
        div.addEventListener('click', () => {
            modal.querySelectorAll('.fighter-option').forEach(d => d.classList.remove('selected'));
            div.classList.add('selected');
            document.getElementById('winner').value = div.dataset.fighterName;
            document.getElementById('method-group').style.display = 'block';
        });
    });

    // Selecionar método (Camada 2)
    modal.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const method = btn.dataset.method;
            if (method === 'Decision') {
                document.getElementById('decision-type-group').style.display = 'block';
                document.getElementById('round-group').style.display = 'none';
            } else {
                document.getElementById('decision-type-group').style.display = 'none';
                document.getElementById('round-group').style.display = 'block';
            }
        });
    });
}

async function loadRanking(type, token) {
    const rankingContent = document.getElementById('ranking-table-container');
    if (!rankingContent) return;

    let url = `${API_URL}/api/rankings/${type}`;
    if (type === 'event') url += `/${eventId}`;

    try {
        rankingContent.innerHTML = '<p>Carregando ranking...</p>';
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Falha ao carregar o ranking.');
        const data = await response.json();

        // Lógica para construir as tabelas de ranking...
        let tableHtml = '<table>';
        if (type === 'general') {
            tableHtml += '<thead><tr><th>Pos.</th><th>Usuário</th><th>Pontuação Total</th></tr></thead><tbody>';
            data.forEach((row, index) => {
                tableHtml += `<tr><td>${index + 1}º</td><td>${row.username}</td><td>${row.total_points}</td></tr>`;
            });
        } // Adicionar lógica para 'event' e 'accuracy' aqui depois
        tableHtml += '</tbody></table>';
        rankingContent.innerHTML = tableHtml;
    } catch (error) {
        console.error(error);
        rankingContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function buildTableHtml(type, data) {
    let tableHtml = '<table>';
    let valueKey = '';

    if (type === 'general') {
        tableHtml += '<thead><tr><th>Posição</th><th>Usuário</th><th>Pontuação Total</th></tr></thead><tbody>';
        valueKey = 'total_points';
    } else if (type === 'event') {
        tableHtml += '<thead><tr><th>Posição</th><th>Usuário</th><th>Pontos no Evento</th></tr></thead><tbody>';
        valueKey = 'event_points';
    }
    // Adicionar outros 'else if' aqui para os rankings de precisão se/quando forem adicionados à página pública.

    if (!data || data.length === 0) {
        tableHtml += '<tr><td colspan="3" style="text-align:center;">Nenhuma pontuação registrada ainda.</td></tr>';
    } else {
        data.forEach((row, index) => {
            tableHtml += `<tr><td><b>${index + 1}º</b></td><td>${row.username}</td><td>${row[valueKey]}</td></tr>`;
        });
    }

    tableHtml += '</tbody></table>';
    return tableHtml;
}
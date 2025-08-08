// URL da sua API (quando estiver rodando localmente)
const API_URL = 'https://site-palpites-pagos.vercel.app';

// 
document.addEventListener('DOMContentLoaded', () => {
// --- SEÇÃO DE PROTEÇÃO DE CONTEÚDO E LÓGICA DE PAGAMENTO ---
    // --- DADOS GLOBAIS ---
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // --- LÓGICA ESPECÍFICA PARA CADA PÁGINA ---
    // Usamos IDs no <body> para saber em que página estamos
    const pageId = document.body.id; 

    if (pageId === 'event-page') {
        // --- CÓDIGO DA PÁGINA PRINCIPAL (INDEX.HTML) ---
        const mainContent = document.querySelector('.container');

        if (!user || !token) {
            // Se não estiver logado, bloqueia a página de eventos
            if(mainContent) {
                mainContent.innerHTML = `<div class="auth-container" style="text-align: center;"><h2>Bem-vindo ao Octagon Oracle!</h2><p>Por favor, faça login ou cadastre-se para ver os eventos e fazer seus palpites.</p></div>`;
            }
        } else {
            // Se estiver logado, inicia o fluxo da página de eventos
            const eventId = 1;
            checkPaymentStatus(eventId, token).then(hasPaid => {
                loadEventPage(eventId, token, hasPaid);
            });
        }
    } else if (pageId === 'ranking-page') {
        // --- CÓDIGO DA PÁGINA DE RANKING (RANKING.HTML) ---
        if (!user || !token) {
            window.location.href = 'login.html'; // Protege a página, redireciona se não logado
        } else {
            loadRanking('general', token); // Carrega o ranking geral por padrão

            // Adiciona listeners aos botões das abas do ranking
            document.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', () => {
                    document.querySelector('.tab-button.active').classList.remove('active');
                    button.classList.add('active');
                    loadRanking(button.dataset.target, token);
                });
            });
        }
    }


    // --- SEÇÃO DE FUNÇÕES GLOBAIS ---
    // Todas as funções que o site precisa para funcionar.

    let eventData = {
        fights: [],
        userPicks: {}
    };

// ================== ADICIONE ESTAS DUAS FUNÇÕES ==================

async function loadEventPage(eventId, token, hasPaid) {
    const mainContent = document.querySelector('.container');
    try {
        const response = await fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Falha ao carregar dados do evento.');
        
        const eventDataFromServer = await response.json();
        eventData = eventDataFromServer; // Atualiza a variável global

        const eventHeader = document.querySelector('.event-header h2');
        if (eventHeader) eventHeader.textContent = eventData.eventName;
        
        startCountdown(eventData.picksDeadline);

        if (hasPaid) {
            loadFights();
            populateBonusPicks(eventData.fights);
            const saveBonusBtnContainer = document.getElementById('save-bonus-btn-container');
            if(saveBonusBtnContainer) saveBonusBtnContainer.style.display = 'block';
        } else {
            const paymentSection = document.getElementById('payment-section');
            if (paymentSection) {
                paymentSection.innerHTML = `<button id="pay-btn" class="btn btn-primary btn-save-all">Liberar Palpites para "${eventData.eventName}" (R$ 5,00)</button>`;
                document.getElementById('pay-btn').addEventListener('click', () => handlePayment(eventId, eventData.eventName, token));
            }
            const fightGrid = document.getElementById('fight-card-grid');
            if (fightGrid) fightGrid.innerHTML = '<p style="text-align:center;">Pague a taxa para visualizar e fazer seus palpites.</p>';
            const bonusSection = document.querySelector('.bonus-picks-section');
            if (bonusSection) bonusSection.style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        if(mainContent) mainContent.innerHTML = `<h2 style="color:red;">${error.message}</h2>`;
    }
}

async function loadRanking(type, token, eventId = 1) {
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

async function handlePayment(eventId, eventName, token) {
    try {
        const response = await fetch(`${API_URL}/api/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ eventId, eventName })
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

// função responsável por desenhar os cards
    function loadFights() {
    const fightCardGrid = document.getElementById('fight-card-grid');
    if (!fightCardGrid) return;

    fightCardGrid.innerHTML = '';
    eventData.fights.forEach(fight => {
        // Verifica se existe um palpite para esta luta no objeto que recebemos da API
        const pick = eventData.userPicks[fight.id];
        
        // Define o texto do botão e a classe com base na existência de um palpite
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
    // Renomeamos a função para adicionar listeners a ambos os tipos de botão
    addPickOrEditButtonListeners();
}

    function startCountdown(deadline) {
        const countdownElement = document.getElementById('countdown');
        if(!countdownElement) return; // Não faz nada se o elemento não existir

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

    function populateBonusPicks(fights) {
        const fightSelect = document.getElementById('fight-of-night');
        const perfSelect = document.getElementById('performance-of-night');
        if(!fightSelect || !perfSelect) return; // Não faz nada se não estiver na página certa

        fightSelect.innerHTML = '<option value="">Selecione a luta...</option>';
        perfSelect.innerHTML = '<option value="">Selecione o lutador...</option>';

        const allFighters = new Set();

        fights.forEach(fight => {
            const fightOption = document.createElement('option');
            fightOption.value = fight.id;
            fightOption.textContent = `${fight.fighter1_name} vs ${fight.fighter2_name}`;
            fightSelect.appendChild(fightOption);

            allFighters.add(fight.fighter1_name);
            allFighters.add(fight.fighter2_name);
        });

        allFighters.forEach(fighterName => {
            const perfOption = document.createElement('option');
            perfOption.value = fighterName;
            perfOption.textContent = fighterName;
            perfSelect.appendChild(perfOption);
        });
    }

// função que lida com ambos os botões
function addPickOrEditButtonListeners() {
    // Adiciona o "ouvinte" aos botões de fazer OU editar palpite
    document.querySelectorAll('.btn-pick, .btn-edit-pick').forEach(button => {
        button.addEventListener('click', (e) => {
            const fightId = parseInt(e.target.closest('.fight-card').dataset.fightId);
            // Ambos os botões abrem o mesmo modal
            openPickModal(fightId);
        });
    });
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

// --- ADICIONA A LÓGICA DE INTERAÇÃO DO MODAL ---
// Coloque este código logo abaixo das funções acima, ainda dentro do 'DOMContentLoaded'

// Lógica para fechar o modal
const modal = document.getElementById('pick-modal');
if (modal) {
    const closeModalBtn = modal.querySelector('.close-modal');
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Lógica para selecionar o vencedor (Camada 1)
document.querySelectorAll('.fighter-option').forEach(div => {
    div.addEventListener('click', () => {
        document.querySelectorAll('.fighter-option').forEach(d => d.classList.remove('selected'));
        div.classList.add('selected');
        document.getElementById('winner').value = div.dataset.fighterName;
        document.getElementById('method-group').style.display = 'block'; // Mostra a próxima camada
    });
});

// Lógica para selecionar o método (Camada 2)
document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const method = btn.dataset.method;

        // Mostra o grupo correto da Camada 3
        if (method === 'Decision') {
            document.getElementById('decision-type-group').style.display = 'block';
            document.getElementById('round-group').style.display = 'none';
        } else { // KO/TKO ou Submission
            document.getElementById('decision-type-group').style.display = 'none';
            document.getElementById('round-group').style.display = 'block';
        }
    });
});

// Lógica para o formulário ao ser enviado (Passo 2 da Fase 1)
const pickForm = document.getElementById('pick-form');
if(pickForm){
    pickForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fightId = parseInt(document.getElementById('fight-id').value);
    const winnerName = document.getElementById('winner').value;
    const methodBtn = document.querySelector('.method-btn.selected');
    
    if (!winnerName || !methodBtn) {
        return alert('Por favor, selecione o vencedor e o método da vitória.');
    }

    const method = methodBtn.dataset.method;
    let details = '';
    let methodDisplay = '';

    if (method === 'Decision') {
        const decisionType = pickForm.querySelector('[name="decision-type"]').value;
        details = decisionType;
        methodDisplay = `Decisão ${decisionType}`;
    } else {
        const round = pickForm.querySelector('[name="round"]').value;
        details = `Round ${round}`;
        methodDisplay = `${method} no ${details}`;
    }

    // Pega o token do localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado para salvar um palpite.');
        return;
    }

    try {
    const response = await fetch(`${API_URL}/api/picks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            fightId,
            winnerName,
            method,
            details
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o palpite.');
    }

    // ----- A CORREÇÃO ESTÁ AQUI -----
    // Em vez de usar dados locais, atualizamos o nosso eventData.userPicks
    // com o dado real e completo que o backend retornou!
    eventData.userPicks[fightId] = data.pick; 

    alert('Palpite salvo com sucesso!');
    
    loadFights(); // Agora, ao recarregar os cards, ele usará os dados corretos.

    const modal = document.getElementById('pick-modal');
    if(modal) modal.classList.remove('active');

} catch (error) {
    console.error('Erro:', error);
    alert(`Erro ao salvar palpite: ${error.message}`);
}
});
}

    // Lógica do formulário do modal
    document.querySelectorAll('.fighter-option').forEach(div => {
        div.addEventListener('click', () => {
            document.querySelectorAll('.fighter-option').forEach(d => d.classList.remove('selected'));
            div.classList.add('selected');
            document.getElementById('winner').value = div.dataset.fighterName;
            document.getElementById('method-group').style.display = 'block';
        });
    });

    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
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



    // Fechar modal
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Adicionar listeners aos botões "Fazer Palpite"
    function addPickButtonListeners() {
        document.querySelectorAll('.btn-pick').forEach(button => {
            button.addEventListener('click', (e) => {
                const fightId = parseInt(e.target.closest('.fight-card').dataset.fightId);
                openPickModal(fightId);
            });
        });
    }


});
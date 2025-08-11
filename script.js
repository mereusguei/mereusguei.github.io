// URL da sua API (quando estiver rodando localmente)
const API_URL = 'https://site-palpites-pagos.vercel.app';

// FUNÇÃO PRINCIPAL QUE RODA QUANDO UMA PÁGINA É CARREGADA
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE NAVEGAÇÃO (Roda em todas as páginas que têm a barra de navegação) ---
    const userNavigation = document.getElementById('user-navigation');
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (userNavigation) {
        if (user && token) {
            // Se o usuário está LOGADO, monta a navegação completa
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
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.clear();
                    window.location.href = 'login.html';
                });
            }
        } else {
            // Se o usuário está DESLOGADO, monta os botões de login/cadastro
            userNavigation.innerHTML = `
                <div class="auth-buttons">
                    <a href="login.html" class="btn">Login</a>
                    <a href="register.html" class="btn btn-primary">Cadastro</a>
                </div>
            `;
        }
    }

    // --- LÓGICA ESPECÍFICA PARA CADA PÁGINA ---
    const pageId = document.body.id;

    if (pageId === 'event-page') {
        initializeEventPage(user, token);
    } else if (pageId === 'ranking-page') {
        initializeRankingPage(token);
    }

    // --- DELEGAÇÃO DE EVENTOS PARA OS BOTÕES DE PALPITE (DA PÁGINA DE EVENTOS) ---
    const fightCardGrid = document.getElementById('fight-card-grid');
    if (fightCardGrid) {
        fightCardGrid.addEventListener('click', (e) => {
            // Verifica se o elemento clicado (ou um de seus pais) é um botão de palpite
            const button = e.target.closest('.btn-pick, .btn-edit-pick');
            if (button) {
                // Se for, pega o ID da luta do card pai e abre o modal
                const fightId = parseInt(button.closest('.fight-card').dataset.fightId);
                openPickModal(fightId);
            }
        });
    }
});


    // --- SEÇÃO DE FUNÇÕES GLOBAIS ---
    // Todas as funções que o site precisa para funcionar.

    let eventData = {
        fights: [],
        userPicks: {}
    };

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

async function loadEventPageContent(eventId, token, hasPaid) {
    const mainContent = document.querySelector('.container');
    try {
        const response = await fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Falha ao carregar dados do evento.');
        eventData = await response.json();
        // --- NOVA LÓGICA PARA PREENCHER PALPITES BÔNUS ---
    if (eventData.userBonusPicks) {
        const fotnSelect = document.getElementById('fight-of-night');
        const potnSelect = document.getElementById('performance-of-night');
        const saveBonusBtn = document.getElementById('save-bonus-picks-btn');
        
        // Verifica se o usuário já fez um palpite bônus
        if (eventData.userBonusPicks.fight_of_the_night_fight_id) {
            
            // CORREÇÃO: Esperamos um instante para garantir que os <option> já foram criados
            // pela função populateBonusPicks antes de tentar selecionar um valor.
            setTimeout(() => {
                if (fotnSelect) {
                    fotnSelect.value = eventData.userBonusPicks.fight_of_the_night_fight_id;
                }
                if (potnSelect) {
                    potnSelect.value = eventData.userBonusPicks.performance_of_the_night_fighter_name;
                }
            }, 100); // 100 milissegundos é um atraso seguro e imperceptível

            if (saveBonusBtn) {
                saveBonusBtn.textContent = 'Editar Palpites Bônus'; // Muda o texto do botão
            }
        }
    }
        const eventHeader = document.querySelector('.event-header h2');
        if (eventHeader) eventHeader.textContent = eventData.eventName;
        startCountdown(eventData.picksDeadline);
        if (hasPaid) {
            loadFights();
            populateBonusPicks(eventData.fights);
            const saveBonusBtnContainer = document.getElementById('save-bonus-btn-container');
if (saveBonusBtnContainer) {
    saveBonusBtnContainer.style.display = 'block';
    // ADICIONA O EVENT LISTENER
    document.getElementById('save-bonus-picks-btn').addEventListener('click', () => {
        handleSaveBonusPicks(eventId, token);
    });
}
        } else {
            const paymentSection = document.getElementById('payment-section');
            if (paymentSection) {
                paymentSection.innerHTML = `<button id="pay-btn" class="btn btn-primary btn-save-all">Liberar Palpites para "${eventData.eventName}" (R$ 5,00)</button>`;
                document.getElementById('pay-btn').addEventListener('click', () => {
                    // Chamada corrigida, sem o eventName
                    handlePayment(eventId, token);
                });
            }
            const fightGrid = document.getElementById('fight-card-grid');
            if (fightGrid) fightGrid.innerHTML = '<p style="text-align:center; font-size: 1.2rem; padding: 40px 0;">Pague a taxa de entrada para visualizar e fazer seus palpites.</p>';
            const bonusSection = document.querySelector('.bonus-picks-section');
            if (bonusSection) bonusSection.style.display = 'none';
        }
    } catch (error) {
        if(mainContent) mainContent.innerHTML = `<h2 style="color:red;">${error.message}</h2>`;
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

    // --- FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA DE EVENTOS (INDEX.HTML) ---
function initializeEventPage(user, token) {
    const mainContent = document.querySelector('.container');
    if (!mainContent) return;

    if (!user || !token) {
        mainContent.innerHTML = `<div class="auth-container" style="text-align: center;"><h2>Bem-vindo!</h2><p>Faça login ou cadastre-se para participar.</p></div>`;
        return;
    }

    // --- NOVA LÓGICA DE CACHE E CARREGAMENTO ---
    const isDataInvalidated = localStorage.getItem('dataCacheInvalidated') === 'true';
    if (isDataInvalidated) {
        sessionStorage.removeItem('eventDataCache');
        localStorage.removeItem('dataCacheInvalidated');
    }

    const cachedData = sessionStorage.getItem('eventDataCache');
    
    // Converte o JSON do cache UMA VEZ
    const parsedCachedData = cachedData ? JSON.parse(cachedData) : null;

    if (parsedCachedData && parsedCachedData.eventId) { // Verifica se o cache é válido
        // Se houver cache, usa os dados dele para renderizar a página instantaneamente
        loadEventPageContent(parsedCachedData.eventId, token, parsedCachedData.hasPaid);
        } else {
            // Se não houver cache, faz a chamada à API como antes
        const eventId = 1;
        checkPaymentStatus(eventId, token).then(hasPaid => {
            // Salva os dados no cache da sessão para recarregamentos rápidos
            const dataToCache = { eventId, hasPaid, timestamp: new Date().getTime() };
            sessionStorage.setItem('eventDataCache', JSON.stringify(dataToCache));
            // Carrega o conteúdo da página
            loadEventPageContent(eventId, token, hasPaid);
        });
    }
}

// --- FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA DE RANKING (RANKING.HTML) ---
function initializeRankingPage(token) {
    if (!token) {
        window.location.href = 'login.html'; // Protege a página
        return;
    }
    loadRanking('general', token); // Carrega ranking geral

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.tab-button.active').classList.remove('active');
            button.classList.add('active');
            loadRanking(button.dataset.target, token);
        });
    });
}
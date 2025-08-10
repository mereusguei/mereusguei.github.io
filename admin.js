// =================== CÓDIGO FINAL E DEFINITIVO PARA admin.js (COM APURAÇÃO POR EVENTO) ===================
const API_URL = 'https://site-palpites-pagos.vercel.app';

function buildResultsTable(eventFights) {
    let tableHtml = `<table><thead><tr><th>Luta</th><th>Vencedor Real</th><th>Método Real</th><th>Detalhe Real</th><th>Ação</th></tr></thead><tbody>`;
    eventFights.forEach(fight => {
        const isApured = !!fight.winner_name;
        const disabled = isApured ? 'disabled' : '';
        tableHtml += `
            <tr data-fight-id="${fight.id}" class="${isApured ? 'apured' : ''}">
                <td>${fight.fighter1_name} vs ${fight.fighter2_name}</td>
                <td><select class="custom-select winner-select" ${disabled}><option value="">-- Selecione --</option><option value="${fight.fighter1_name}" ${isApured && fight.winner_name === fight.fighter1_name ? 'selected' : ''}>${fight.fighter1_name}</option><option value="${fight.fighter2_name}" ${isApured && fight.winner_name === fight.fighter2_name ? 'selected' : ''}>${fight.fighter2_name}</option></select></td>
                <td><select class="custom-select method-select" onchange="handleMethodChange(this)" ${disabled}><option value="">-- Selecione --</option><option value="KO/TKO" ${isApured && fight.result_method === 'KO/TKO' ? 'selected' : ''}>KO/TKO</option><option value="Submission" ${isApured && fight.result_method === 'Submission' ? 'selected' : ''}>Finalização</option><option value="Decision" ${isApured && fight.result_method === 'Decision' ? 'selected' : ''}>Decisão</option></select></td>
                <td class="details-container"><input type="text" class="custom-select details-input" value="${isApured ? fight.result_details : ''}" placeholder="Selecione um método..." ${disabled}></td>
                <!-- CORREÇÃO: Lógica do botão "Corrigir" restaurada -->
                <td>
    ${isApured ? `<button type="button" class="btn btn-edit-result">Corrigir</button>` : ``}
    <button type="button" class="btn btn-danger remove-fight-btn">Remover</button>
</td>
            </tr>`;
    });
    tableHtml += `</tbody></table>
        <div class="bonus-results" style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
            <h3>Resultados Bônus</h3>
            <div class="form-group"><label>Luta da Noite Real:</label><select class="custom-select real-fotn"><option value="">-- Selecione a Luta --</option></select></div>
            <div class="form-group"><label>Performance da Noite Real:</label><select class="custom-select real-potn"><option value="">-- Selecione o Lutador --</option></select></div>
        </div>
        <div class="actions-footer">
            <button type="submit" class="btn btn-primary">Salvar Apuração do Evento</button>
        </div>`;
    return tableHtml;
}

function buildPicksAccordion(allPicksData, allEventsData) {
    let accordionHtml = `<div class="admin-section"><h2>Palpites por Evento</h2>`;
    for (const eventId in allPicksData) {
        const event = allPicksData[eventId];
        if (!event.users || Object.keys(event.users).length === 0) {
            accordionHtml += `<details class="accordion-event"><summary>${event.eventName}</summary><p style="padding: 10px;">Nenhum palpite para este evento ainda.</p></details>`;
            continue;
        }
        accordionHtml += `<details class="accordion-event" open><summary>${event.eventName}</summary>`;
        for (const userId in event.users) {
            const userData = event.users[userId];
            if (!userData.stats) continue;
            const stats = userData.stats;
            const winnerPct = stats.totalPicks > 0 ? ((stats.correctWinners / stats.totalPicks) * 100).toFixed(0) : 0;
            const methodPct = stats.correctWinners > 0 ? ((stats.correctMethods / stats.correctWinners) * 100).toFixed(0) : 0;
            const detailPct = stats.correctMethods > 0 ? ((stats.correctDetails / stats.correctMethods) * 100).toFixed(0) : 0;
            const winnerText = `${stats.correctWinners}/${stats.totalPicks}`;
            const methodText = `${stats.correctMethods}/${stats.correctWinners}`;
            const detailText = `${stats.correctDetails}/${stats.correctMethods}`;
            accordionHtml += `<details class="accordion-user"><summary><strong>${userData.username}</strong> | Pontos: <b>${stats.totalPoints}</b> | Vencedores: ${winnerText} (${winnerPct}%) | Métodos: ${methodText} (${methodPct}%) | Detalhes: ${detailText} (${detailPct}%)</summary>`;
            if (userData.bonus_picks && userData.bonus_picks.fotn_fight_id) {
                const eventInfo = allEventsData.find(e => e.eventId == eventId);
                const fotnFight = eventInfo.fights.find(f => f.id == userData.bonus_picks.fotn_fight_id);
                const fotnText = fotnFight ? `${fotnFight.fighter1_name} vs ${fotnFight.fighter2_name}` : 'N/A';
                accordionHtml += `<div class="bonus-picks-display"><p><strong>Bônus - Luta da Noite:</strong> ${fotnText}</p><p><strong>Bônus - Performance:</strong> ${userData.bonus_picks.potn_fighter}</p></div>`;
            }
            accordionHtml += `<table><thead><tr><th>Luta ID</th><th>Palpite</th><th>Pontos</th></tr></thead><tbody>`;
            userData.picks.sort((a, b) => a.fight_id - b.fight_id).forEach(pick => {
                const methodDisplay = pick.predicted_method === 'Decision' ? `Decisão ${pick.predicted_details}` : `${pick.predicted_method} no ${pick.predicted_details}`;
                accordionHtml += `<tr><td>${pick.fight_id}</td><td>${pick.predicted_winner_name} por ${methodDisplay}</td><td><b>${pick.points_awarded}</b></td></tr>`;
            });
            accordionHtml += `</tbody></table></details>`;
        }
        accordionHtml += `</details>`;
    }
    accordionHtml += `</div>`;
    return accordionHtml;
}

function buildRankingsSection() {
    return `<section class="admin-section"><h2>Rankings Detalhados</h2><div class="tabs"><button class="tab-button active" data-ranking="general">Pontuação Geral</button><button class="tab-button" data-ranking="winners">Acerto de Vencedores</button><button class="tab-button" data-ranking="methods">Acerto de Métodos</button><button class="tab-button" data-ranking="details">Acerto de Detalhes</button><button class="tab-button" data-ranking="fotn">Acerto Luta da Noite</button><button class="tab-button" data-ranking="potn">Acerto Performance</button></div><div id="admin-ranking-content"><p>Carregando...</p></div></section>`;
}

function renderAdminPanel(adminMainContainer, allPicksData, allEventsData) {
    // 1. Constrói a seção do Gerenciador de Eventos
    let eventManagerHtml = `
        <section class="admin-section">
            <h2>Gerenciador de Eventos</h2>
            
            <form id="create-event-form" style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
                <h3>Criar Novo Evento</h3>
                <div class="form-group"><label>Nome do Evento (Ex: UFC 310)</label><input type="text" id="event-name" required></div>
                <div class="form-group"><label>Data do Evento (YYYY-MM-DD HH:MM)</label><input type="datetime-local" id="event-date" required></div>
                <div class="form-group"><label>Prazo para Palpites (YYYY-MM-DD HH:MM)</label><input type="datetime-local" id="picks-deadline" required></div>
                <button type="submit" class="btn btn-primary">Criar Evento</button>
            </form>

            <form id="add-fight-form">
                <h3>Adicionar Luta a um Evento</h3>
                <div class="form-group">
                    <label>Selecione o Evento</label>
                    <select id="event-select-for-fight" class="custom-select" required></select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4>Lutador 1</h4>
                        <div class="form-group"><label>Nome</label><input type="text" class="fighter-input" required></div>
                        <div class="form-group"><label>Cartel (Ex: 10-2)</label><input type="text" class="fighter-input"></div>
                        <div class="form-group"><label>URL da Imagem</label><input type="url" class="fighter-input"></div>
                    </div>
                    <div>
                        <h4>Lutador 2</h4>
                        <div class="form-group"><label>Nome</label><input type="text" class="fighter-input" required></div>
                        <div class="form-group"><label>Cartel</label><input type="text" class="fighter-input"></div>
                        <div class="form-group"><label>URL da Imagem</label><input type="url" class="fighter-input"></div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Adicionar Luta</button>
            </form>
        </section>
    `;

    // 2. Constrói a seção de Apuração de Resultados por Evento
    let resultsAccordionHtml = `<div class="admin-section"><h2>Apuração de Resultados por Evento</h2>`;
    allEventsData.forEach(event => {
        resultsAccordionHtml += `
    <details class="accordion-event">
        <summary>
            <span>${event.eventName}</span>
            <button type="button" class="btn btn-danger remove-event-btn" data-event-id="${event.eventId}">Remover Evento Inteiro</button>
        </summary>
        <form class="results-form" data-event-id="${event.eventId}">${buildResultsTable(event.fights)}</form>
    </details>`;
    });
    resultsAccordionHtml += `</div>`;

    // 3. Constrói as seções de Palpites e Rankings
    const picksAccordionHtml = buildPicksAccordion(allPicksData, allEventsData);
    const rankingsHtml = buildRankingsSection();
    
    // 4. Junta tudo e insere na página
    adminMainContainer.innerHTML = eventManagerHtml + resultsAccordionHtml + picksAccordionHtml + rankingsHtml;
    
    // 5. Bloco ESSENCIAL que você corretamente notou que estava faltando:
    //    Popula os dropdowns de bônus para CADA formulário de apuração
    allEventsData.forEach(event => {
        populateBonusDropdowns(event.fights, event.eventId, { 
            realFotnFightId: event.realFotnFightId, 
            realPotnFighterName: event.realPotnFighterName 
        });
    });
}

function handleMethodChange(methodSelect) {
    const row = methodSelect.closest('tr');
    const detailsContainer = row.querySelector('.details-container');
    const method = methodSelect.value;
    if (method === 'Decision') {
        detailsContainer.innerHTML = `<select class="custom-select details-input"><option value="Unanimous">Unânime</option><option value="Split">Dividida</option></select>`;
    } else if (method === 'KO/TKO' || method === 'Submission') {
        detailsContainer.innerHTML = `<select class="custom-select details-input"><option value="Round 1">Round 1</option><option value="Round 2">Round 2</option><option value="Round 3">Round 3</option><option value="Round 4">Round 4</option><option value="Round 5">Round 5</option></select>`;
    } else {
        detailsContainer.innerHTML = `<input type="text" class="custom-select details-input" placeholder="Selecione um método..." disabled>`;
    }
}

function populateBonusDropdowns(eventFights, eventId, realValues) {
    const form = document.querySelector(`.results-form[data-event-id="${eventId}"]`);
    if (!form) return;
    const fotnSelect = form.querySelector('.real-fotn');
    const potnSelect = form.querySelector('.real-potn');
    if (!fotnSelect || !potnSelect) return;
    
    fotnSelect.innerHTML = '<option value="NONE">Nenhuma (sem bônus)</option>';
    potnSelect.innerHTML = '<option value="NONE">Nenhuma (sem bônus)</option>';
    
    const allFighters = new Set();
    eventFights.forEach(fight => {
        const fotnOption = document.createElement('option');
        fotnOption.value = fight.id;
        fotnOption.textContent = `${fight.fighter1_name} vs ${fight.fighter2_name}`;
        fotnSelect.appendChild(fotnOption);
        allFighters.add(fight.fighter1_name);
        allFighters.add(fight.fighter2_name);
    });
    
    allFighters.forEach(fighter => {
        const potnOption = document.createElement('option');
        potnOption.value = fighter;
        potnOption.textContent = fighter;
        potnSelect.appendChild(potnOption);
    });

    // --- NOVA LÓGICA PARA "LEMBRAR" OS VALORES SALVOS ---
    if (realValues.realFotnFightId) {
        fotnSelect.value = realValues.realFotnFightId;
    }
    if (realValues.realPotnFighterName) {
        potnSelect.value = realValues.realPotnFighterName;
    }
}

function addAdminActionListeners(token) {
    const adminMainContainer = document.getElementById('admin-main');
    adminMainContainer.addEventListener('submit', async (e) => {
        if (e.target.matches('.results-form')) {
            e.preventDefault();
            const form = e.target;
            const eventId = form.dataset.eventId;
            const resultsArray = [];
            const rows = form.querySelectorAll('tr[data-fight-id]');
            rows.forEach(row => {
                if (row.querySelector('select:disabled')) return;
                const fightId = row.dataset.fightId, winnerName = row.querySelector('.winner-select').value, resultMethod = row.querySelector('.method-select').value, resultDetails = row.querySelector('.details-input').value;
                if (winnerName && resultMethod && resultDetails) {
                    resultsArray.push({ fightId, winnerName, resultMethod, resultDetails });
                }
            });
            const realFightOfTheNightId = form.querySelector('.real-fotn').value;
            const realPerformanceOfTheNightFighter = form.querySelector('.real-potn').value;
            const hasBonusToSubmit = realFightOfTheNightId && realPerformanceOfTheNightFighter;
            if (resultsArray.length === 0 && !hasBonusToSubmit) return alert('Nenhuma luta ou bônus foi preenchido para apuração neste evento.');
            if (!confirm(`Confirmar a apuração para o evento ID ${eventId}?`)) return;

            try {
                const response = await fetch(`${API_URL}/api/admin/results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ resultsArray, realFightOfTheNightId, realPerformanceOfTheNightFighter })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                alert(data.message);
                window.location.reload();
            } catch (error) {
                alert(`Ocorreu um erro ao apurar: ${error.message}`);
            }
        }
    // Dentro de addAdminActionListeners
adminMainContainer.addEventListener('click', async (e) => {
    const target = e.target;
    
    // Lógica para Remover Luta
    if (target.matches('.remove-fight-btn')) {
        const row = target.closest('tr');
        const fightId = row.dataset.fightId;
        const fightName = row.querySelector('td:first-child').textContent;
        if (!confirm(`Tem certeza que deseja remover a luta "${fightName}" e TODOS os palpites associados a ela? Esta ação não pode ser desfeita.`)) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/fights/${fightId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            alert(data.message);
            window.location.reload();
        } catch (error) { alert(`Erro: ${error.message}`); }
    }

    // Lógica para Remover Evento
    if (target.matches('.remove-event-btn')) {
        const eventId = target.dataset.eventId;
        const eventName = target.previousElementSibling.textContent;
        if (!confirm(`!! ATENÇÃO !!\n\nVocê tem certeza que deseja remover o evento inteiro "${eventName}"?\n\nIsso apagará TODAS as lutas, palpites, bônus e registros de pagamento associados a este evento. A ação é IRREVERSÍVEL.`)) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            alert(data.message);
            window.location.reload();
        } catch (error) { alert(`Erro: ${error.message}`); }
    }
});
    });
}

function renderRankingTable(container, data, type) {
    let tableHtml = '<table><thead><tr><th>Pos.</th><th>Usuário</th>';
    let sortKey = '', valueKey = '';
    switch (type) {
        case 'general': sortKey = 'total_points'; valueKey = 'total_points'; break;
        case 'winners': sortKey = 'correct_winners'; valueKey = 'correct_winners'; break;
        case 'methods': sortKey = 'correct_methods'; valueKey = 'correct_methods'; break;
        case 'details': sortKey = 'correct_details'; valueKey = 'correct_details'; break;
        case 'fotn': sortKey = 'correct_fotn'; valueKey = 'correct_fotn'; break;
        case 'potn': sortKey = 'correct_potn'; valueKey = 'correct_potn'; break;
    }
    tableHtml += `<th>${valueKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th></tr></thead><tbody>`;
    data.sort((a, b) => b[sortKey] - a[sortKey]);
    data.forEach((row, index) => { tableHtml += `<tr><td><b>${index + 1}º</b></td><td>${row.username}</td><td>${row[valueKey]}</td></tr>`; });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

document.addEventListener('DOMContentLoaded', async () => {
    const adminMainContainer = document.getElementById('admin-main');
    const token = localStorage.getItem('token');
    if (!token) {
        adminMainContainer.innerHTML = '<h2>Acesso Negado</h2><p>Você precisa estar logado como administrador. <a href="login.html">Faça login</a></p>';
        return;
    }
    try {
    adminMainContainer.innerHTML = '<p>Carregando dados do painel...</p>';
    
    // --- PASSO 1: BUSCA TODOS OS DADOS NECESSÁRIOS DO BACKEND ---
    const eventsListResponse = await fetch(`${API_URL}/api/admin/events`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!eventsListResponse.ok) throw new Error('Falha ao carregar lista de eventos.');
    const eventsList = await eventsListResponse.json();

    const eventsDataPromises = eventsList.map(event => 
        fetch(`${API_URL}/api/events/${event.id}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    );
    const allEventsDetails = await Promise.all(eventsDataPromises);
    const allEventsData = allEventsDetails.map((details, index) => ({
        eventId: eventsList[index].id,
        eventName: details.eventName,
        fights: details.fights,
        realFotnFightId: details.realFotnFightId,
        realPotnFighterName: details.realPotnFighterName
    }));

    const [allPicksResponse, accuracyResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/all-picks`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/rankings/accuracy`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    if (allPicksResponse.status === 403 || accuracyResponse.status === 403) throw new Error('Acesso negado. Você não tem permissão de administrador.');
    if (!allPicksResponse.ok || !accuracyResponse.ok) throw new Error('Falha ao carregar dados de palpites ou ranking.');
    
    const allPicksData = await allPicksResponse.json();
    const accuracyData = await accuracyResponse.json();
    
    // --- PASSO 2: RENDERIZA TODA A ESTRUTURA HTML NA PÁGINA ---
    renderAdminPanel(adminMainContainer, allPicksData, allEventsData);
    
    // --- PASSO 3: AGORA QUE OS ELEMENTOS EXISTEM, ADICIONA A INTERATIVIDADE (EVENT LISTENERS) ---
    
    // Lógica do Gerenciador de Eventos
    const eventSelectForFight = document.getElementById('event-select-for-fight');
    if (eventSelectForFight) {
        eventSelectForFight.innerHTML = '<option value="">Selecione um Evento</option>';
        allEventsData.forEach(event => {
            const option = document.createElement('option');
            option.value = event.eventId;
            option.textContent = event.eventName;
            eventSelectForFight.appendChild(option);
        });
    }

    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                name: document.getElementById('event-name').value,
                eventDate: document.getElementById('event-date').value,
                picksDeadline: document.getElementById('picks-deadline').value,
            };
            try {
                const response = await fetch(`${API_URL}/api/admin/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao criar evento.');
                alert(data.message);
                window.location.reload();
            } catch (error) { alert(`Erro: ${error.message}`); }
        });
    }

    const addFightForm = document.getElementById('add-fight-form');
    if (addFightForm) {
        addFightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = addFightForm.querySelectorAll('input');
            const body = {
                event_id: document.getElementById('event-select-for-fight').value,
                fighter1_name: inputs[0].value,
                fighter1_record: inputs[1].value,
                fighter1_img: inputs[2].value,
                fighter2_name: inputs[3].value,
                fighter2_record: inputs[4].value,
                fighter2_img: inputs[5].value
            };
            try {
                const response = await fetch(`${API_URL}/api/admin/fights`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Falha ao adicionar luta.');
                alert(data.message);
                addFightForm.reset();
            } catch (error) { alert(`Erro: ${error.message}`); }
        });
    }

    // Lógica da Apuração e Rankings (que já estava correta)
    addAdminActionListeners(token);
    const adminRankingContainer = document.getElementById('admin-ranking-content');
    if (adminRankingContainer) {
        renderRankingTable(adminRankingContainer, accuracyData, 'general');
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector('.tab-button.active').classList.remove('active');
                button.classList.add('active');
                renderRankingTable(adminRankingContainer, accuracyData, button.dataset.ranking);
            });
        });
    }
} catch (error) {
    console.error('Erro ao carregar painel de admin:', error);
    adminMainContainer.innerHTML = `<div class="admin-section"><h2 style="color:red;">Erro ao Carregar Painel</h2><p>${error.message}</p></div>`;
}
});
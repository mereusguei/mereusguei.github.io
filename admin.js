// =================== CÓDIGO FINAL, COMPLETO E DEFINITIVO PARA admin.js ===================
const API_URL = 'https://site-palpites-pagos.vercel.app';

function buildResultsTable(eventFights) {
    // Esta função agora apenas constrói a tabela, sem o título ou o formulário
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
                <td>${isApured ? `<button type="button" class="btn btn-edit-result">Corrigir</button>` : `<button type="button" class="btn btn-primary submit-result-btn">Apurar</button>`}</td>
            </tr>`;
    });
    tableHtml += `</tbody></table>`;
    return tableHtml;
}

function buildPicksAccordion(allPicksData, eventFights) {
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
                const fotnFight = eventFights.find(f => f.id == userData.bonus_picks.fotn_fight_id);
                const fotnText = fotnFight ? `${fotnFight.fighter1_name} vs ${fotnFight.fighter2_name}` : 'N/A';
                accordionHtml += `<div class="bonus-picks-display" style="padding: 8px 15px; font-size: 0.9rem; background: rgba(0,0,0,0.1);"><p><strong>Bônus - Luta da Noite:</strong> ${fotnText}</p><p><strong>Bônus - Performance:</strong> ${userData.bonus_picks.potn_fighter}</p></div>`;
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

function populateBonusDropdowns(eventFights, eventId) {
    const fotnSelect = document.getElementById(`real-fotn-${eventId}`);
    const potnSelect = document.getElementById(`real-potn-${eventId}`);
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
}

function renderAdminPanel(adminMainContainer, allPicksData, allEventsData) {
    // --- Constrói a Apuração de Resultados com Accordion por Evento ---
    let resultsAccordionHtml = `<div class="admin-section"><h2>Apuração de Resultados</h2>`;
    allEventsData.forEach(event => {
        resultsAccordionHtml += `
            <details class="accordion-event" open>
                <summary>${event.eventName}</summary>
                <form class="results-form" data-event-id="${event.eventId}">
                    ${buildResultsTable(event.fights)}
                    <div class="bonus-results" style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <h3>Resultados Bônus</h3>
                        <div class="form-group"><label for="real-fotn-${event.eventId}">Luta da Noite Real:</label><select id="real-fotn-${event.eventId}" class="custom-select real-fotn-select"><option value="">-- Selecione a Luta --</option></select></div>
                        <div class="form-group"><label for="real-potn-${event.eventId}">Performance da Noite Real:</label><select id="real-potn-${event.eventId}" class="custom-select real-potn-select"><option value="">-- Selecione o Lutador --</option></select></div>
                    </div>
                    <div class="actions-footer">
                        <button type="submit" class="btn btn-primary">Salvar Apurações para este Evento</button>
                    </div>
                </form>
            </details>`;
    });
    resultsAccordionHtml += `</div>`;

    // O resto da função continua como antes...
    let picksAccordionHtml = buildPicksAccordion(allPicksData, allEventsData.flatMap(e => e.fights));
    let rankingsHtml = buildRankingsSection();
    adminMainContainer.innerHTML = resultsAccordionHtml + picksAccordionHtml + rankingsHtml;

    // Popula os dropdowns de bônus para cada evento
    allEventsData.forEach(event => {
        populateBonusDropdowns(event.fights, event.eventId);
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

async function handleSingleApuration(button, token) {
    const row = button.closest('tr');
    const fightId = row.dataset.fightId;
    const winnerName = row.querySelector('.winner-select').value;
    const resultMethod = row.querySelector('.method-select').value;
    const resultDetails = row.querySelector('.details-input').value;

    if (!winnerName || !resultMethod || !resultDetails) return alert('Por favor, preencha todos os campos do resultado para esta luta.');
    
    const body = {
        resultsArray: [{ fightId, winnerName, resultMethod, resultDetails }],
        realFightOfTheNightId: document.getElementById('real-fotn').value || null,
        realPerformanceOfTheNightFighter: document.getElementById('real-potn').value || null
    };

    if (!confirm(`Confirmar apuração para a luta ID ${fightId}?`)) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        alert(data.message);
        window.location.reload();
    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
}

function addAdminActionListeners(token) {
    // Usa delegação de evento no container principal para todos os formulários
    const adminMainContainer = document.getElementById('admin-main');
    if (!adminMainContainer) return;

    adminMainContainer.addEventListener('submit', async (e) => {
        if (e.target.matches('.results-form')) {
            e.preventDefault();
            const form = e.target;
            const eventId = form.dataset.eventId;
            // ... (lógica para coletar os dados do formulário específico que foi submetido)
            const body = { resultsArray, realFightOfTheNightId, realPerformanceOfTheNightFighter };
            handleApuration(body, token);
        }
    });

    resultsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const resultsArray = [];
        const rows = resultsForm.querySelectorAll('tr[data-fight-id]');
        rows.forEach(row => {
            if (row.querySelector('select:disabled')) return;
            const fightId = row.dataset.fightId, winnerName = row.querySelector('.winner-select').value, resultMethod = row.querySelector('.method-select').value, resultDetails = row.querySelector('.details-input').value;
            if (winnerName && resultMethod && resultDetails) {
                resultsArray.push({ fightId, winnerName, resultMethod, resultDetails });
            }
        });
        const realFightOfTheNightId = document.getElementById('real-fotn').value;
        const realPerformanceOfTheNightFighter = document.getElementById('real-potn').value;
        const hasBonusToSubmit = realFightOfTheNightId && realPerformanceOfTheNightFighter;
        if (resultsArray.length === 0 && !hasBonusToSubmit) return alert('Nenhuma luta ou bônus foi preenchido/alterado para apuração.');
        if (!confirm(`Confirmar a apuração?`)) return;
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
    const eventId = 1;
    try {
        adminMainContainer.innerHTML = '<p>Carregando dados do painel...</p>';
        const [eventResponse, allPicksResponse, accuracyResponse] = await Promise.all([
            fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/admin/all-picks`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/rankings/accuracy`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (eventResponse.status === 403 || allPicksResponse.status === 403 || accuracyResponse.status === 403) throw new Error('Acesso negado. Você não tem permissão de administrador.');
        if (!eventResponse.ok || !allPicksResponse.ok || !accuracyResponse.ok) throw new Error('Falha ao carregar dados do painel.');
        const eventData = await eventResponse.json();
        const allPicksData = await allPicksResponse.json();
        const accuracyData = await accuracyResponse.json();
        
        renderAdminPanel(adminMainContainer, allPicksData, eventData.fights);
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
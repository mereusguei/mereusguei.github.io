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
                <td>${isApured ? `<button type="button" class="btn btn-edit-result">Corrigir</button>` : `<button type="button" class="btn btn-primary submit-result-btn">Apurar</button>`}</td>
            </tr>`;
    });
    tableHtml += `</tbody></table><div class="actions-footer" id="admin-actions" style="display: none;"><button type="button" id="save-all-corrections-btn" class="btn btn-primary">Salvar Todas as Alterações</button><button type="button" id="cancel-corrections-btn" class="btn">Cancelar Edição</button></div>`;
    return tableHtml;
}

function renderAdminPanel(adminMainContainer, allPicksData, eventFights) {
    let resultsHtml = `
        <div class="admin-section">
            <h2>Apuração de Resultados</h2>
            <div id="results-table-container">${buildResultsTable(eventFights)}</div>
        </div>`;

    let picksAccordionHtml = `<div class="admin-section"><h2>Palpites por Evento</h2>`;
    for (const eventId in allPicksData) {
        const event = allPicksData[eventId];
        if (Object.keys(event.users).length === 0) {
            picksAccordionHtml += `<details class="accordion-event"><summary>${event.eventName}</summary><p style="padding: 10px;">Nenhum palpite para este evento ainda.</p></details>`;
            continue;
        }
        picksAccordionHtml += `<details class="accordion-event" open><summary>${event.eventName}</summary>`;
        for (const userId in event.users) {
            const userData = event.users[userId];
            const stats = userData.stats;
            const winnerPct = stats.totalPicks > 0 ? ((stats.correctWinners / stats.totalPicks) * 100).toFixed(0) : 0;
            const methodPct = stats.correctWinners > 0 ? ((stats.correctMethods / stats.correctWinners) * 100).toFixed(0) : 0;
            const detailPct = stats.correctMethods > 0 ? ((stats.correctDetails / stats.correctMethods) * 100).toFixed(0) : 0;
            const winnerText = `${stats.correctWinners}/${stats.totalPicks}`;
            const methodText = `${stats.correctMethods}/${stats.correctWinners}`;
            const detailText = `${stats.correctDetails}/${stats.correctMethods}`;
            picksAccordionHtml += `<details class="accordion-user"><summary><strong>${userData.username}</strong> | Pontos: <b>${stats.totalPoints}</b> | Vencedores: ${winnerText} (${winnerPct}%) | Métodos: ${methodText} (${methodPct}%) | Detalhes: ${detailText} (${detailPct}%)</summary><table><thead><tr><th>Luta ID</th><th>Palpite</th><th>Pontos</th></tr></thead><tbody>`;
            userData.picks.sort((a, b) => a.fight_id - b.fight_id).forEach(pick => {
                const methodDisplay = pick.predicted_method === 'Decision' ? `Decisão ${pick.predicted_details}` : `${pick.predicted_method} no ${pick.predicted_details}`;
                picksAccordionHtml += `<tr><td>${pick.fight_id}</td><td>${pick.predicted_winner_name} por ${methodDisplay}</td><td><b>${pick.points_awarded}</b></td></tr>`;
            });
            picksAccordionHtml += `</tbody></table></details>`;
        }
        picksAccordionHtml += `</details>`;
    }
    picksAccordionHtml += `</div>`;

    let rankingsHtml = `
        <section class="admin-section">
            <h2>Rankings Detalhados</h2>
            <div class="tabs">
                <button class="tab-button active" data-ranking="general">Pontuação Geral</button>
                <button class="tab-button" data-ranking="winners">Acerto de Vencedores</button>
                <button class="tab-button" data-ranking="methods">Acerto de Métodos</button>
                <button class="tab-button" data-ranking="details">Acerto de Detalhes</button>
            </div>
            <div id="admin-ranking-content"><p>Carregando rankings...</p></div>
        </section>`;
    
    adminMainContainer.innerHTML = resultsHtml + picksAccordionHtml + rankingsHtml;
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

async function handleApuration(button, token) {
    const row = button.closest('tr');
    const fightId = row.dataset.fightId, winnerName = row.querySelector('.winner-select').value, resultMethod = row.querySelector('.method-select').value, resultDetails = row.querySelector('.details-input').value;
    if (!winnerName || !resultMethod || !resultDetails) return alert('Por favor, preencha todos os campos do resultado.');
    if (!confirm(`Confirmar apuração para a luta ID ${fightId}?`)) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ fightId, winnerName, resultMethod, resultDetails })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        alert(data.message);
        window.location.reload();
    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
}

function addAdminActionListeners(token, eventFights) {
    const tableContainer = document.getElementById('results-table-container');
    const adminActions = document.getElementById('admin-actions');
    if (!tableContainer || !adminActions) return;
    tableContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.submit-result-btn')) { handleApuration(target, token); }
        if (target.matches('.btn-edit-result')) {
            adminActions.style.display = 'flex';
            target.closest('tr').classList.remove('apured');
            target.closest('tr').querySelectorAll('select, input').forEach(el => el.disabled = false);
            target.style.display = 'none';
        }
    });
    adminActions.querySelector('#cancel-corrections-btn').addEventListener('click', () => window.location.reload());
    adminActions.querySelector('#save-all-corrections-btn').addEventListener('click', async () => {
        const promises = [];
        tableContainer.querySelectorAll('tr[data-fight-id]').forEach(row => {
            if (row.querySelector('select:disabled')) return;
            const fightId = row.dataset.fightId, winnerName = row.querySelector('.winner-select').value, resultMethod = row.querySelector('.method-select').value, resultDetails = row.querySelector('.details-input').value;
            if (winnerName && resultMethod && resultDetails) {
                promises.push(fetch(`${API_URL}/api/admin/results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ fightId, winnerName, resultMethod, resultDetails })
                }));
            }
        });
        if (promises.length === 0) return alert('Nenhuma alteração para salvar.');
        if (!confirm(`Confirmar a apuração/correção de ${promises.length} luta(s)?`)) return;
        try {
            await Promise.all(promises);
            alert(`${promises.length} luta(s) processada(s) com sucesso!`);
            window.location.reload();
        } catch (error) {
            alert(`Ocorreu um erro: ${error.message}`);
        }
    });
}

function renderRankingTable(container, data, type) {
    let tableHtml = '<table><thead><tr><th>Pos.</th><th>Usuário</th>';
    let sortKey = '', valueHeader = '';
    switch (type) {
        case 'general': sortKey = 'total_points'; valueHeader = 'Pontuação Total'; break;
        case 'winners': sortKey = 'correct_winners'; valueHeader = 'Vencedores Corretos'; break;
        case 'methods': sortKey = 'correct_methods'; valueHeader = 'Métodos Corretos'; break;
        case 'details': sortKey = 'correct_details'; valueHeader = 'Detalhes Corretos'; break;
    }
    tableHtml += `<th>${valueHeader}</th></tr></thead><tbody>`;
    data.sort((a, b) => b[sortKey] - a[sortKey]);
    data.forEach((row, index) => {
        tableHtml += `<tr><td><b>${index + 1}º</b></td><td>${row.username}</td><td>${row[sortKey]}</td></tr>`;
    });
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
        if (eventResponse.status === 403 || allPicksResponse.status === 403 || accuracyResponse.status === 403) {
            throw new Error('Acesso negado. Você não tem permissão de administrador.');
        }
        if (!eventResponse.ok || !allPicksResponse.ok || !accuracyResponse.ok) {
            throw new Error('Falha ao carregar dados do painel. Verifique os logs do servidor.');
        }
        const eventData = await eventResponse.json();
        const allPicksData = await allPicksResponse.json();
        const accuracyData = await accuracyResponse.json();
        
        renderAdminPanel(adminMainContainer, allPicksData, eventData.fights);
        addAdminActionListeners(token, eventData.fights);

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
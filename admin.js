const API_URL = 'https://site-palpites-pagos.vercel.app';

function buildResultsTable(eventFights) {
    let tableHtml = `
        <table>
            <thead><tr><th>Luta</th><th>Vencedor Real</th><th>Método Real</th><th>Detalhe Real</th><th>Ação</th></tr></thead>
            <tbody>`;
    eventFights.forEach(fight => {
        const isApured = !!fight.winner_name;
        const disabled = isApured ? 'disabled' : '';
        tableHtml += `
            <tr data-fight-id="${fight.id}" class="${isApured ? 'apured' : ''}">
                <td>${fight.fighter1_name} vs ${fight.fighter2_name}</td>
                <td><select class="custom-select winner-select" ${disabled}>...</select></td>
                <td><select class="custom-select method-select" onchange="handleMethodChange(this)" ${disabled}>...</select></td>
                <td class="details-container"><input type="text" ... ${disabled}></td>
                <td>${isApured ? `<button type="button" class="btn btn-edit-result">Corrigir</button>` : `<button type="button" class="btn btn-primary submit-result-btn">Apurar</button>`}</td>
            </tr>`;
    });
    tableHtml += `</tbody></table>`;

    // --- ADICIONA OS CAMPOS DE RESULTADOS BÔNUS AQUI ---
    tableHtml += `
        <div class="bonus-results" style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
            <h3>Resultados Bônus</h3>
            <div class="form-group">
                <label for="real-fotn">Luta da Noite Real:</label>
                <select id="real-fotn" class="custom-select">
                    <option value="">-- Selecione a Luta --</option>
                    <!-- As opções serão populadas pelo JavaScript -->
                </select>
            </div>
            <div class="form-group">
                <label for="real-potn">Performance da Noite Real:</label>
                <select id="real-potn" class="custom-select">
                    <option value="">-- Selecione o Lutador --</option>
                    <!-- As opções serão populadas pelo JavaScript -->
                </select>
            </div>
        </div>`;
    
    tableHtml += `
        <div class="actions-footer" id="admin-actions">
            <button type="button" id="save-all-btn" class="btn btn-primary">Salvar Todas as Apurações</button>
            <button type="button" id="cancel-btn" class="btn" style="display: none;">Cancelar Edição</button>
        </div>`;
        
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

    // --- LÓGICA PARA POPULAR OS DROPDOWNS DE BÔNUS ---
    const fotnSelect = document.getElementById('real-fotn');
    const potnSelect = document.getElementById('real-potn');
    const allFighters = new Set();

    eventFights.forEach(fight => {
        // Popula Luta da Noite
        const fotnOption = document.createElement('option');
        fotnOption.value = fight.id;
        fotnOption.textContent = `${fight.fighter1_name} vs ${fight.fighter2_name}`;
        fotnSelect.appendChild(fotnOption);

        // Coleta todos os lutadores
        allFighters.add(fight.fighter1_name);
        allFighters.add(fight.fighter2_name);
    });

    allFighters.forEach(fighter => {
        // Popula Performance da Noite
        const potnOption = document.createElement('option');
        potnOption.value = fighter;
        potnOption.textContent = fighter;
        potnSelect.appendChild(potnOption);
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
    const saveAllBtn = document.getElementById('save-all-btn');
    if (!saveAllBtn) return;

    saveAllBtn.addEventListener('click', async () => {
        const resultsArray = [];
        const rows = document.querySelectorAll('#results-table-container tr[data-fight-id]');

        rows.forEach(row => {
            const fightId = row.dataset.fightId;
            const winnerName = row.querySelector('.winner-select').value;
            const resultMethod = row.querySelector('.method-select').value;
            const resultDetails = row.querySelector('.details-input').value;

            if (winnerName && resultMethod && resultDetails) {
                resultsArray.push({ fightId, winnerName, resultMethod, resultDetails });
            }
        });

        const realFightOfTheNightId = document.getElementById('real-fotn').value;
        const realPerformanceOfTheNightFighter = document.getElementById('real-potn').value;

        if (resultsArray.length === 0) {
            return alert('Nenhuma luta foi preenchida para apuração.');
        }
        if (!confirm(`Confirmar a apuração de ${resultsArray.length} luta(s)?`)) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ resultsArray, realFightOfTheNightId, realPerformanceOfTheNightFighter }) // Envia tudo de uma vez
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
    let sortKey = '';
    let valueKey = ''; // Corrigido de VeloK para valueKey na declaração

    switch (type) {
        case 'general':
            sortKey = 'total_points';
            valueKey = 'total_points'; // Corrigido de VeloK para valueKey
            break;
        case 'winners':
            sortKey = 'correct_winners';
            valueKey = 'correct_winners'; // Corrigido de VeloK para valueKey
            break;
        case 'methods':
            sortKey = 'correct_methods';
            valueKey = 'correct_methods'; // Corrigido de VeloK para valueKey
            break;
        case 'details':
            sortKey = 'correct_details';
            valueKey = 'correct_details'; // Corrigido de VeloK para valueKey
            break;
    }

    tableHtml += `<th>${valueKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</th></tr></thead><tbody>`; // Deixa o cabeçalho mais bonito

    // Ordena os dados com base na chave correta
    data.sort((a, b) => b[sortKey] - a[sortKey]);

    data.forEach((row, index) => {
        // A CORREÇÃO PRINCIPAL ESTÁ AQUI
        tableHtml += `<tr><td><b>${index + 1}º</b></td><td>${row.username}</td><td>${row[valueKey]}</td></tr>`;
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
    
    // Faz as 3 chamadas à API em paralelo
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
    
    // 1. Renderiza o painel de apuração e o accordion de palpites
    renderAdminPanel(adminMainContainer, allPicksData, eventData.fights);
    
    // 2. Adiciona a interatividade à tabela de apuração
    addAdminActionListeners(token, eventData.fights);

    // 3. Renderiza o ranking inicial e adiciona a interatividade das abas
    const adminRankingContainer = document.getElementById('admin-ranking-content');
    if (adminRankingContainer) {
        // Usa a 'accuracyData' para o ranking de pontos também, pois ela já contém o total_points.
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
// =================== CÓDIGO FINAL E COMPLETO PARA admin.js ===================
const API_URL = 'https://site-palites-pagos.vercel.app';

function renderAdminPanel(adminMainContainer, allData, eventFights) {
    let resultsHtml = `
        <div class="admin-section">
            <h2>Apuração de Resultados</h2>
            <div id="results-table-container">`; // Novo container para a tabela
    resultsHtml += buildResultsTable(eventFights); // Chama função para construir a tabela
    resultsHtml += `</div></div>`;

    let picksAccordionHtml = `<div class="admin-section"><h2>Palpites por Evento</h2>`;
    for (const eventId in allData) {
        const event = allData[eventId];
        picksAccordionHtml += `<details class="accordion-event"><summary>${event.eventName}</summary>`;
        for (const userId in event.users) {
            const userData = event.users[userId];
            const stats = userData.stats;
            // CORREÇÃO UX: Mostra o formato acertos/total
            const winnerText = `${stats.correctWinners}/${stats.totalPicks}`;
            const methodText = `${stats.correctMethods}/${stats.correctWinners}`; // Denominador correto
            const detailText = `${stats.correctDetails}/${stats.correctMethods}`; // Denominador correto

            picksAccordionHtml += `
                <details class="accordion-user">
                    <summary>
                        <strong>${userData.username}</strong> | Pontos: <b>${stats.totalPoints}</b> | 
                        Vencedores: ${winnerText} | Métodos: ${methodText} | Detalhes: ${detailText}
                    </summary>
                    <table>
                         <thead><tr><th>Luta ID</th><th>Palpite</th><th>Pontos</th></tr></thead>
                        <tbody>`;
            userData.picks.forEach(pick => {
                const methodDisplay = pick.predicted_method === 'Decision' ? `Decisão ${pick.predicted_details}` : `${pick.predicted_method} no ${pick.predicted_details}`;
                picksAccordionHtml += `<tr><td>${pick.fight_id}</td><td>${pick.predicted_winner_name} por ${methodDisplay}</td><td><b>${pick.points_awarded}</b></td></tr>`;
            });
            picksAccordionHtml += `</tbody></table></details>`;
        }
        picksAccordionHtml += `</details>`;
    }
    picksAccordionHtml += `</div>`;
    adminMainContainer.innerHTML = resultsHtml + picksAccordionHtml;
}

function buildResultsTable(eventFights) {
    let tableHtml = `<table><thead><tr><th>Luta</th><th>Vencedor</th><th>Método</th><th>Detalhe</th><th>Ação</th></tr></thead><tbody>`;
    eventFights.forEach(fight => {
        const isApured = fight.winner_name;
        const disabled = isApured ? 'disabled' : '';
        tableHtml += `
            <tr data-fight-id="${fight.id}" class="${isApured ? 'apured' : ''}">
                <td>${fight.fighter1_name} vs ${fight.fighter2_name}</td>
                <td><select class="custom-select winner-select" ${disabled}>...</select></td>
                <td><select class="custom-select method-select" onchange="handleMethodChange(this)" ${disabled}>...</select></td>
                <td class="details-container"><input type="text" ... ${disabled}></td>
                <td><button type="button" class="btn ${isApured ? 'btn-edit-result' : 'btn-primary'}">${isApured ? 'Corrigir' : 'Apurar'}</button></td>
            </tr>`;
    });
    tableHtml += `</tbody></table>
        <div class="actions-footer" id="admin-actions" style="display: none;">
            <button type="button" id="save-all-corrections-btn" class="btn btn-primary">Salvar Todas as Alterações</button>
            <button type="button" id="cancel-corrections-btn" class="btn">Cancelar Edição</button>
        </div>`;
    return tableHtml;
}

function addAdminActionListeners(token, eventFights) {
    const tableContainer = document.getElementById('results-table-container');
    const adminActions = document.getElementById('admin-actions');
    
    tableContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.btn-edit-result')) {
            // Entra em modo de edição
            adminActions.style.display = 'flex';
            tableContainer.querySelectorAll('tr.apured .btn-edit-result').forEach(btn => {
                const row = btn.closest('tr');
                row.classList.remove('apured');
                row.querySelectorAll('select, input').forEach(el => el.disabled = false);
                btn.style.display = 'none'; // Esconde o botão 'Corrigir' individual
            });
        }
    });

    adminActions.querySelector('#cancel-corrections-btn').addEventListener('click', () => {
        // Recarrega a tabela para cancelar
        tableContainer.innerHTML = buildResultsTable(eventFights);
        adminActions.style.display = 'none';
    });

    // ... (código anterior da função handleApuration e a nova handleMethodChange)
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
    const fightId = row.dataset.fightId;
    const winnerName = row.querySelector('.winner-select').value;
    const resultMethod = row.querySelector('.method-select').value;
    const resultDetails = row.querySelector('.details-input').value;
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

function addAdminActionListeners(token) {
    document.querySelectorAll('.submit-result-btn').forEach(button => {
        button.addEventListener('click', () => handleApuration(button, token));
    });
    document.querySelectorAll('.btn-edit-result').forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (button.textContent === 'Corrigir') {
                row.classList.remove('apured');
                row.querySelectorAll('select, input').forEach(el => el.disabled = false);
                button.textContent = 'Salvar Correção';
                button.classList.remove('btn-edit-result');
                button.classList.add('btn-primary');
                button.onclick = () => handleApuration(button, token);
            }
        });
    });
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
        const [eventResponse, allPicksResponse] = await Promise.all([
            fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/admin/all-picks`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (eventResponse.status === 403 || allPicksResponse.status === 403) throw new Error('Acesso negado. Você não tem permissão de administrador.');
        if (!eventResponse.ok || !allPicksResponse.ok) throw new Error('Falha ao carregar dados do painel. Verifique os logs do servidor.');
        const eventData = await eventResponse.json();
        const allPicksData = await allPicksResponse.json();
        renderAdminPanel(adminMainContainer, allPicksData, eventData.fights);
        addAdminActionListeners(token);
    } catch (error) {
        console.error('Erro ao carregar painel de admin:', error);
        adminMainContainer.innerHTML = `<div class="admin-section"><h2 style="color:red;">Erro ao Carregar Painel</h2><p>${error.message}</p></div>`;
    }
});
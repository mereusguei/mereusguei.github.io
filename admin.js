// =================== CÓDIGO FINAL E COMPLETO PARA admin.js ===================
const API_URL = 'https://site-palpites-pagos.vercel.app';

function renderAdminPanel(adminMainContainer, allData, eventFights) {
    let resultsHtml = `
        <div class="admin-section">
            <h2>Apuração de Resultados</h2>
            <form id="results-form">
                <table>
                    <thead><tr><th>Luta</th><th>Vencedor Real</th><th>Método Real</th><th>Detalhe Real</th></tr></thead>
                    <tbody>`;
    eventFights.forEach(fight => {
        const isApured = fight.winner_name;
        const disabled = isApured ? 'disabled' : '';
        resultsHtml += `
            <tr data-fight-id="${fight.id}" class="${isApured ? 'apured' : ''}">
                <td>${fight.fighter1_name} vs ${fight.fighter2_name}</td>
                <td>
                    <select class="custom-select winner-select" ${disabled}>
                        <option value="">-- Selecione --</option>
                        <option value="${fight.fighter1_name}" ${isApured && fight.winner_name === fight.fighter1_name ? 'selected' : ''}>${fight.fighter1_name}</option>
                        <option value="${fight.fighter2_name}" ${isApured && fight.winner_name === fight.fighter2_name ? 'selected' : ''}>${fight.fighter2_name}</option>
                    </select>
                </td>
                <td>
                    <select class="custom-select method-select" onchange="handleMethodChange(this)" ${disabled}>
                        <option value="">-- Selecione --</option>
                        <option value="KO/TKO" ${isApured && fight.result_method === 'KO/TKO' ? 'selected' : ''}>KO/TKO</option>
                        <option value="Submission" ${isApured && fight.result_method === 'Submission' ? 'selected' : ''}>Finalização</option>
                        <option value="Decision" ${isApured && fight.result_method === 'Decision' ? 'selected' : ''}>Decisão</option>
                    </select>
                </td>
                <td class="details-container">
                    <input type="text" class="custom-select details-input" value="${isApured ? fight.result_details : ''}" placeholder="Selecione um método..." ${disabled}>
                </td>
            </tr>`;
    });
    resultsHtml += `</tbody></table><div class="actions-footer"><button type="submit" class="btn btn-primary">Apurar Lutas Preenchidas</button></div></form></div>`;

    let picksAccordionHtml = `<div class="admin-section"><h2>Palpites por Evento</h2>`;
    for (const eventId in allData) {
        const event = allData[eventId];
        picksAccordionHtml += `<details class="accordion-event"><summary>${event.eventName}</summary>`;
        for (const userId in event.users) {
            const userData = event.users[userId];
            const stats = userData.stats;
            const winnerPct = stats.totalPicks > 0 ? ((stats.correctWinners / stats.totalPicks) * 100).toFixed(0) : 0;
            const methodPct = stats.correctWinners > 0 ? ((stats.correctMethods / stats.correctWinners) * 100).toFixed(0) : 0;
            const detailPct = stats.correctMethods > 0 ? ((stats.correctDetails / stats.correctMethods) * 100).toFixed(0) : 0;
            picksAccordionHtml += `
                <details class="accordion-user">
                    <summary>
                        <strong>${userData.username}</strong> | Pontos: ${stats.totalPoints} | 
                        Vencedores: ${winnerPct}% | Métodos: ${methodPct}% | Detalhes: ${detailPct}%
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

function addResultsFormListener(token) {
    const resultsForm = document.getElementById('results-form');
    if (!resultsForm) return;
    resultsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const promises = [];
        const rowsToApure = resultsForm.querySelectorAll('tr[data-fight-id]:not(.apured)');
        if (rowsToApure.length === 0) return alert('Todas as lutas já foram apuradas.');
        rowsToApure.forEach(row => {
            const fightId = row.dataset.fightId, winnerName = row.querySelector('.winner-select').value, resultMethod = row.querySelector('.method-select').value, resultDetails = row.querySelector('.details-input').value;
            if (winnerName && resultMethod && resultDetails) {
                promises.push(fetch(`${API_URL}/api/admin/results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ fightId, winnerName, resultMethod, resultDetails })
                }));
            }
        });
        if (promises.length === 0) return alert('Nenhuma luta foi preenchida para apuração.');
        if (!confirm(`Confirmar apuração para ${promises.length} luta(s)?`)) return;
        try {
            await Promise.all(promises);
            alert(`${promises.length} luta(s) apurada(s) com sucesso!`);
            window.location.reload();
        } catch (error) {
            alert(`Ocorreu um erro ao apurar: ${error.message}`);
        }
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
        addResultsFormListener(token);
    } catch (error) {
        console.error('Erro ao carregar painel de admin:', error);
        adminMainContainer.innerHTML = `<div class="admin-section"><h2 style="color:red;">Erro ao Carregar Painel</h2><p>${error.message}</p></div>`;
    }
});
const API_URL = 'https://site-palpites-pagos.vercel.app'; // Sua API na Vercel

// --- FUNÇÃO PARA RENDERIZAR O PAINEL ---
function renderAdminPanel(adminMainContainer, eventData, allPicks) {
    // Constrói a seção de Apuração de Resultados
    let resultsHtml = `
        <div class="admin-section">
            <h2>Apuração de Resultados - ${eventData.eventName}</h2>
            <table>
                <thead><tr><th>Luta</th><th>Vencedor Real</th><th>Método Real</th><th>Detalhe Real</th><th>Ação</th></tr></thead>
                <tbody>`;
    
    eventData.fights.forEach(fight => {
        resultsHtml += `
            <tr data-fight-id="${fight.id}">
                <td>${fight.fighter1_name} vs ${fight.fighter2_name}</td>
                <td>
                    <select class="custom-select winner-select">
                        <option value="">-- Selecione --</option>
                        <option value="${fight.fighter1_name}">${fight.fighter1_name}</option>
                        <option value="${fight.fighter2_name}">${fight.fighter2_name}</option>
                    </select>
                </td>
                <td>
    <select class="custom-select method-select" onchange="handleMethodChange(this)">
        <option value="">-- Selecione --</option>
        <option value="KO/TKO">KO/TKO</option>
        <option value="Submission">Finalização</option>
        <option value="Decision">Decisão</option>
    </select>
</td>
<td>
    <!-- Deixamos a coluna de detalhes vazia inicialmente -->
    <input type="text" class="custom-select details-input" placeholder="Selecione um método...">
</td>
                <td><button class="btn btn-primary submit-result-btn">Apurar</button></td>
            </tr>
        `;
    });
    resultsHtml += '</tbody></table></div>';

    // Constrói a seção de Visualização de Palpites
    let picksHtml = `
        <div class="admin-section">
            <h2>Palpites de Todos os Usuários</h2>
            <table>
                <thead><tr><th>Usuário</th><th>Luta ID</th><th>Palpite Vencedor</th><th>Palpite Método</th><th>Palpite Detalhe</th><th>Pontos</th></tr></thead>
                <tbody>`;
    
    allPicks.forEach(pick => {
        picksHtml += `
            <tr>
                <td>${pick.username}</td>
                <td>${pick.fight_id}</td>
                <td>${pick.predicted_winner_name}</td>
                <td>${pick.predicted_method}</td>
                <td>${pick.predicted_details}</td>
                <td><b>${pick.points_awarded}</b></td>
            </tr>
        `;
    });
    picksHtml += '</tbody></table></div>';

    // Insere o HTML construído na página
    adminMainContainer.innerHTML = resultsHtml + picksHtml;
}

// --- FUNÇÃO PARA ADICIONAR LISTENERS AOS BOTÕES DE APURAR ---
function addSubmitResultListeners(token) {
    document.querySelectorAll('.submit-result-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const fightId = row.dataset.fightId;
            const winnerName = row.querySelector('.winner-select').value;
            const resultMethod = row.querySelector('.method-select').value;
            const resultDetails = row.querySelector('.details-input').value;

            if (!winnerName || !resultMethod || !resultDetails) {
                return alert('Por favor, preencha todos os campos do resultado.');
            }

            if (!confirm(`Confirmar apuração para a luta ID ${fightId}? Esta ação é irreversível.`)) return;

            try {
                const response = await fetch(`${API_URL}/api/admin/results`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ fightId, winnerName, resultMethod, resultDetails })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                alert(data.message);
                // Recarrega a página inteira para garantir que todos os dados sejam atualizados.
                window.location.reload(); 
            } catch(error) {
                alert(`Erro: ${error.message}`);
            }
        });
    });
}

function handleMethodChange(methodSelect) {
    const row = methodSelect.closest('tr');
    const detailsContainer = row.querySelector('td:nth-child(4)'); // A 4ª coluna (td)

    const method = methodSelect.value;

    if (method === 'Decision') {
        detailsContainer.innerHTML = `
            <select class="custom-select details-input">
                <option value="Unanimous">Unânime</option>
                <option value="Split">Dividida</option>
            </select>
        `;
    } else if (method === 'KO/TKO' || method === 'Submission') {
        detailsContainer.innerHTML = `
            <select class="custom-select details-input">
                <option value="Round 1">Round 1</option>
                <option value="Round 2">Round 2</option>
                <option value="Round 3">Round 3</option>
                <option value="Round 4">Round 4</option>
                <option value="Round 5">Round 5</option>
            </select>
        `;
    } else {
        // Se nada for selecionado, volta para o campo de texto
        detailsContainer.innerHTML = `<input type="text" class="custom-select details-input" placeholder="Selecione um método...">`;
    }
}

// --- FUNÇÃO PRINCIPAL QUE RODA QUANDO A PÁGINA CARREGA ---
document.addEventListener('DOMContentLoaded', async () => {
    const adminMainContainer = document.getElementById('admin-main');
    const token = localStorage.getItem('token');

    if (!token) {
        adminMainContainer.innerHTML = '<h2>Acesso Negado</h2><p>Você precisa estar logado como administrador para ver esta página. <a href="login.html">Faça login</a></p>';
        return;
    }

    const eventId = 1;

    try {
        adminMainContainer.innerHTML = '<p>Carregando dados do painel...</p>';
        // Buscamos os dados do evento e os palpites de todos os usuários em paralelo
        const [eventResponse, picksResponse] = await Promise.all([
            fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/admin/event-picks/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (eventResponse.status === 403 || picksResponse.status === 403) {
             throw new Error('Acesso negado. Você não tem permissão de administrador.');
        }
        if (!eventResponse.ok || !picksResponse.ok) {
            throw new Error('Falha ao carregar dados do painel.');
        }

        const eventData = await eventResponse.json();
        const allPicks = await picksResponse.json();
        
        renderAdminPanel(adminMainContainer, eventData, allPicks);
        addSubmitResultListeners(token);

    } catch (error) {
        console.error('Erro:', error);
        adminMainContainer.innerHTML = `<h2 style="color:red;">Erro</h2><p>${error.message}</p>`;
    }
});
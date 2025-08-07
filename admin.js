// No admin.js
const API_URL = 'https://site-palites-pagos.vercel.app'; // Sua API na Vercel

document.addEventListener('DOMContentLoaded', () => {
    const adminMainContainer = document.getElementById('admin-main');
    const token = localStorage.getItem('token');

    if (!token) {
        adminMainContainer.innerHTML = '<h2>Acesso Negado</h2><p>Você precisa estar logado como administrador para ver esta página. <a href="login.html">Faça login</a></p>';
        return;
    }

    // O ID do evento que queremos administrar
    const eventId = 1;

    // Função principal que carrega todos os dados do painel
    async function loadAdminPanel() {
        try {
            // Buscamos os dados do evento e os palpites de todos os usuários
            const [eventResponse, picksResponse] = await Promise.all([
                fetch(`${API_URL}/api/events/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/event-picks/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!eventResponse.ok || !picksResponse.ok) {
                 if (eventResponse.status === 403 || picksResponse.status === 403) {
                    throw new Error('Acesso negado. Você não tem permissão de administrador.');
                 }
                throw new Error('Falha ao carregar dados do painel.');
            }

            const eventData = await eventResponse.json();
            const allPicks = await picksResponse.json();
            
            renderAdminPanel(eventData, allPicks);

        } catch (error) {
            console.error('Erro:', error);
            adminMainContainer.innerHTML = `<h2 style="color:red;">Erro</h2><p>${error.message}</p>`;
        }
    }

    // Função que desenha o painel na tela com os dados recebidos
    function renderAdminPanel(eventData, allPicks) {
        // --- Constrói a seção de Apuração de Resultados ---
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
                            <option value="${fight.fighter1_name}">${fight.fighter1_name}</option>
                            <option value="${fight.fighter2_name}">${fight.fighter2_name}</option>
                        </select>
                    </td>
                    <td>
                        <select class="custom-select method-select">
                            <option value="KO/TKO">KO/TKO</option>
                            <option value="Submission">Finalização</option>
                            <option value="Decision">Decisão</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="custom-select details-input" placeholder="Ex: Round 3 ou Unanimous">
                    </td>
                    <td><button class="btn btn-primary submit-result-btn">Apurar</button></td>
                </tr>
            `;
        });
        resultsHtml += '</tbody></table></div>';

        // --- Constrói a seção de Visualização de Palpites ---
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
                    <td>${pick.points_awarded}</td>
                </tr>
            `;
        });
        picksHtml += '</tbody></table></div>';

        // Insere o HTML construído na página
        adminMainContainer.innerHTML = resultsHtml + picksHtml;
        addSubmitResultListeners(); // Adiciona a funcionalidade aos botões "Apurar"
    }

    function addSubmitResultListeners(){
        document.querySelectorAll('.submit-result-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const row = e.target.closest('tr');
                const fightId = row.dataset.fightId;
                const winnerName = row.querySelector('.winner-select').value;
                const resultMethod = row.querySelector('.method-select').value;
                const resultDetails = row.querySelector('.details-input').value;

                if(!resultDetails){
                    alert('Por favor, preencha o detalhe do resultado (Ex: Round 1 ou Unanimous)');
                    return;
                }

                if(!confirm(`Confirmar apuração para a luta ID ${fightId}? Esta ação é irreversível.`)) return;

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
                    if(!response.ok) throw new Error(data.error);

                    alert(data.message);
                    loadAdminPanel(); // Recarrega o painel para mostrar os pontos atualizados
                } catch(error) {
                    alert(`Erro: ${error.message}`);
                }
            });
        });
    }

    // Inicia o carregamento do painel
    loadAdminPanel();
});
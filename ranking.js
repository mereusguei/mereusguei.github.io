const API_URL = 'https://site-palpites-pagos.vercel.app';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) { window.location.href = 'login.html'; return; }
    
    const rankingContent = document.getElementById('ranking-table-container');
    const eventSelectorContainer = document.getElementById('event-selector-container');
    const eventSelect = document.getElementById('event-select');
    let allEvents = []; // Armazenar eventos para o dropdown

    async function loadRanking(type, eventId = 1) {
        let url = `${API_URL}/api/rankings/`;
        if (type === 'general') {
            url += 'general';
        } else if (type === 'event') {
            url += `event/${eventId}`;
        } else { return; }

        try {
            rankingContent.innerHTML = '<p>Carregando ranking...</p>';
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar ranking.');
            const data = await response.json();
            buildTableHtml(type, data);
        } catch (error) {
            rankingContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }
    
    function buildTableHtml(type, data) {
        let tableHtml = '<table><thead><tr><th>Posição</th><th>Usuário</th>';
        let valueKey = '';
        if (type === 'general') {
            tableHtml += '<th>Pontuação Total</th></tr></thead><tbody>';
            valueKey = 'total_points';
        } else if (type === 'event') {
            tableHtml += '<th>Pontos no Evento</th></tr></thead><tbody>';
            valueKey = 'event_points';
        }

        if (data.length === 0) {
            tableHtml += '<tr><td colspan="3" style="text-align:center;">Nenhuma pontuação registrada.</td></tr>';
        } else {
            data.forEach((row, index) => {
                // CORREÇÃO: Usando a chave correta (valueKey)
                tableHtml += `<tr><td><b>${index + 1}º</b></td><td>${row.username}</td><td>${row[valueKey]}</td></tr>`;
            });
        }
        tableHtml += '</tbody></table>';
        rankingContent.innerHTML = tableHtml;
    }
    
    // Busca todos os eventos para popular o dropdown
    async function loadEventsForSelector() {
        // Precisaremos de uma rota para buscar todos os eventos, vamos criá-la.
        // Por enquanto, vamos usar um placeholder.
        allEvents = [{id: 1, name: "UFC 308: Pereira vs. Prochazka 2"}];
        allEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.name;
            eventSelect.appendChild(option);
        });
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.tab-button.active').classList.remove('active');
            button.classList.add('active');
            const rankingType = button.dataset.ranking;
            if (rankingType === 'event') {
                eventSelectorContainer.style.display = 'block';
                loadRanking('event', eventSelect.value);
            } else {
                eventSelectorContainer.style.display = 'none';
                loadRanking('general');
            }
        });
    });
    
    eventSelect.addEventListener('change', () => {
        loadRanking('event', eventSelect.value);
    });

    loadEventsForSelector();
    loadRanking('general'); // Carrega o ranking inicial
});
// ranking.js
const API_URL = 'https://site-palites-pagos.vercel.app';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = 'login.html'; // Redireciona se não estiver logado
        return;
    }

    const rankingContainer = document.getElementById('ranking-table-container');

    try {
        const response = await fetch(`${API_URL}/api/rankings/general`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar o ranking.');

        const rankingData = await response.json();
        
        let tableHtml = `
            <table>
                <thead><tr><th>Posição</th><th>Usuário</th><th>Pontuação Total</th></tr></thead>
                <tbody>`;
        
        if (rankingData.length === 0) {
            tableHtml += '<tr><td colspan="3" style="text-align:center;">Nenhuma pontuação registrada ainda.</td></tr>';
        } else {
            rankingData.forEach((player, index) => {
                tableHtml += `
                    <tr>
                        <td><b>${index + 1}º</b></td>
                        <td>${player.username}</td>
                        <td>${player.total_points}</td>
                    </tr>`;
            });
        }
        
        tableHtml += '</tbody></table>';
        rankingContainer.innerHTML = tableHtml;

    } catch (error) {
        console.error(error);
        rankingContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
});
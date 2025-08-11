const API_URL = 'https://site-palpites-pagos.vercel.app';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) { window.location.href = 'login.html'; return; }

    const eventsGrid = document.getElementById('events-grid-container');

    async function loadEvents(status) {
        try {
            eventsGrid.innerHTML = '<p style="text-align: center;">Carregando eventos...</p>';
            const response = await fetch(`${API_URL}/api/events?status=${status}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar eventos.');

            const events = await response.json();

            let eventsHtml = '';
            if (events.length === 0) {
                eventsHtml = `<p style="text-align: center;">Nenhum evento encontrado.</p>`;
            } else {
                events.forEach(event => {
                    const eventDate = new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    // Link para o index.html, passando o ID do evento na URL
                    const eventLink = `index.html?eventId=${event.id}`;

                    eventsHtml += `
                        <a href="${eventLink}" class="event-card-link">
                            <div class="event-card" style="background-image: url('${event.card_image_url || 'https://via.placeholder.com/400x200'}')">
                                ${status === 'past' ? '<span class="status-tag">Encerrado</span>' : ''}
                                <div class="event-card-info">
                                    <h3>${event.name}</h3>
                                    <p>${eventDate}</p>
                                </div>
                            </div>
                        </a>
                    `;
                });
            }
            eventsGrid.innerHTML = eventsHtml;

        } catch (error) {
            eventsGrid.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        }
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.tab-button.active').classList.remove('active');
            button.classList.add('active');
            loadEvents(button.dataset.status);
        });
    });

    // Carrega os eventos futuros por padrão
    loadEvents('upcoming');
});
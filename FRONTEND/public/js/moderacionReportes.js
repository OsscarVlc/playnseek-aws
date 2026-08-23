const scriptModeracion = document.currentScript;
const tokenModeracion = scriptModeracion.dataset.token;

const headersModeracion = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenModeracion}`
};

const listaReportes = document.getElementById('lista-reportes');

async function cargarReportes() {
    const res = await fetch('/reporte', { headers: headersModeracion });
    const data = await res.json();

    listaReportes.innerHTML = '';

    if (data.data.length === 0) {
        listaReportes.innerHTML = '<p class="text-muted">No hay reportes.</p>';
        return;
    }

    data.data.forEach((reporte) => {
        const div = document.createElement('div');
        div.className = 'card shadow-sm mb-2';
        div.innerHTML = `
            <div class="card-body">
                <p class="mb-1"><strong>De:</strong> ${reporte.remitente_id?.nombre || 'N/A'} → <strong>Reportado:</strong> ${reporte.reportado_id?.nombre || 'N/A'}</p>
                <p class="mb-1"><strong>Motivo:</strong> ${reporte.motivo}</p>
                ${reporte.descripcion ? `<p class="mb-1 small text-muted">${reporte.descripcion}</p>` : ''}
                <select class="form-select form-select-sm select-estado" data-id="${reporte._id}" style="width: auto;">
                    <option value="pendiente" ${reporte.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="resuelto" ${reporte.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                    <option value="rechazado" ${reporte.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                </select>
            </div>
        `;
        listaReportes.appendChild(div);
    });

    document.querySelectorAll('.select-estado').forEach((select) => {
        select.addEventListener('change', async () => {
            const id = select.dataset.id;
            await fetch(`/reporte/${id}`, {
                method: 'PATCH',
                headers: headersModeracion,
                body: JSON.stringify({ estado: select.value })
            });
        });
    });
}

cargarReportes();
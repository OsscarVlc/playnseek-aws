const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

const contenedorRecomendaciones = document.getElementById('contenedor-recomendaciones');
const contenedorSolicitudes = document.getElementById('contenedor-solicitudes');
const contenedorMatches = document.getElementById('contenedor-matches');

// --- Recomendaciones ---
async function cargarRecomendaciones() {
    const res = await fetch('/recomendacion', { headers });
    const data = await res.json();

    contenedorRecomendaciones.innerHTML = '';

    if (data.data.length === 0) {
        contenedorRecomendaciones.innerHTML = '<p class="text-muted">No hay recomendaciones por ahora.</p>';
        return;
    }

    data.data.forEach((candidato) => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <i class="bi bi-person-circle me-2" style="font-size: 32px;"></i>
                            <strong>${candidato.nombre}</strong>
                        </div>
                        <button class="btn btn-sm btn-primary btn-enviar-solicitud" data-id="${candidato.mongo_id}">
                            Enviar solicitud
                        </button>
                    </div>
                    <p class="mb-1 small">
                        <strong>Idiomas:</strong> ${(candidato.idiomas || []).join(', ') || 'No especificado'}
                    </p>
                    <p class="mb-0 small">
                        <strong>Plataformas:</strong> ${(candidato.plataformas || []).map(p => p.nombre).join(', ') || 'No especificado'}
                    </p>
                </div>
            </div>
        `;
        contenedorRecomendaciones.appendChild(col);
    });

    document.querySelectorAll('.btn-enviar-solicitud').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const aUsuario = btn.dataset.id;
            btn.disabled = true;

            const res = await fetch('/solicitud', {
                method: 'POST',
                headers,
                body: JSON.stringify({ aUsuario })
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                btn.disabled = false;
                return;
            }

            if (data.match) {
                alert('¡Es un match!');
                cargarMatches();
            } else {
                btn.textContent = 'Solicitud enviada';
            }
        });
    });
}

// --- Solicitudes recibidas ---
async function cargarSolicitudes() {
    const res = await fetch('/solicitud/recibidas', { headers });
    const data = await res.json();

    contenedorSolicitudes.innerHTML = '';

    if (data.data.length === 0) {
        contenedorSolicitudes.innerHTML = '<p class="text-muted">No tienes solicitudes pendientes.</p>';
        return;
    }

    data.data.forEach((solicitud) => {
        const remitente = solicitud.de_usuario;
        const div = document.createElement('div');
        div.className = 'card shadow-sm mb-2';
        div.innerHTML = `
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <div class="mb-1">
                        ${remitente.foto_perfil
                            ? `<img src="${remitente.foto_perfil}" class="rounded-circle me-2" width="32" height="32" style="object-fit: cover;">`
                            : `<i class="bi bi-person-circle me-2" style="font-size: 32px;"></i>`}
                        <strong>${remitente.nombre}</strong>
                    </div>
                    <p class="mb-0 small text-muted">
                        Idiomas: ${(remitente.idiomas || []).join(', ') || 'No especificado'}
                    </p>
                    <p class="mb-0 small text-muted">
                        Plataformas: ${(remitente.plataformas || []).map(p => p.nombre).join(', ') || 'No especificado'}
                    </p>
                </div>
                <div>
                    <button class="btn btn-sm btn-success btn-responder" data-id="${solicitud._id}" data-respuesta="aceptar">Aceptar</button>
                    <button class="btn btn-sm btn-outline-danger btn-responder" data-id="${solicitud._id}" data-respuesta="rechazar">Rechazar</button>
                </div>
            </div>
        `;
        contenedorSolicitudes.appendChild(div);
    });

    document.querySelectorAll('.btn-responder').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const respuesta = btn.dataset.respuesta;

            const res = await fetch(`/solicitud/${id}/responder`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ respuesta })
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                return;
            }

            alert(data.message);
            cargarSolicitudes();
            if (respuesta === 'aceptar') cargarMatches();
        });
    });
}

// --- Mis matches ---
async function cargarMatches() {
    const res = await fetch('/match/mis-matches', { headers });
    const data = await res.json();

    contenedorMatches.innerHTML = '';

    if (data.data.length === 0) {
        contenedorMatches.innerHTML = '<p class="text-muted">Aún no tienes matches.</p>';
        return;
    }

    data.data.forEach((match) => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <div class="card shadow-sm match-card" data-id="${match.companero.mongo_id}" style="cursor: pointer;">
                <div class="card-body">
                    <div>
                        ${match.companero.foto_perfil
                            ? `<img src="${match.companero.foto_perfil}" class="rounded-circle me-2" width="32" height="32" style="object-fit: cover;">`
                            : `<i class="bi bi-person-circle me-2" style="font-size: 32px;"></i>`}
                        <strong>${match.companero.nombre}</strong>
                    </div>
                    <div class="opciones-match mt-2 d-flex gap-2" style="display: none;">
                        <a href="/chat/${match.companero.mongo_id}" class="btn btn-sm btn-primary">Chatear</a>
                        <button class="btn btn-sm btn-outline-danger" onclick="abrirModalReportar('${match.companero.mongo_id}')">Reportar</button>
                        <button class="btn btn-sm btn-outline-secondary btn-eliminar-amigo" data-id="${match.companero.mongo_id}">Eliminar de amigos</button>
                    </div>
                </div>
            </div>
        `;
        contenedorMatches.appendChild(col);
    });

    // Toggle de opciones al hacer click en la tarjeta (no en botones internos)
    document.querySelectorAll('.match-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            const opciones = card.querySelector('.opciones-match');
            opciones.style.display = opciones.style.display === 'none' ? 'flex' : 'none';
        });
    });

    // Eliminar amigo
    document.querySelectorAll('.btn-eliminar-amigo').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('¿Seguro que quieres eliminar a este amigo?')) return;

            const id = btn.dataset.id;
            const res = await fetch(`/match/${id}`, {
                method: 'DELETE',
                headers
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                return;
            }

            cargarMatches();
        });
    });
}

cargarRecomendaciones();
cargarSolicitudes();
cargarMatches();
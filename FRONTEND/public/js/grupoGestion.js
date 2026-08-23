const scriptGestion = document.currentScript;
const tokenGestion = scriptGestion.dataset.token;
const grupoIdGestion = scriptGestion.dataset.grupoId;

const headersGestion = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenGestion}`
};

const btnSalir = document.getElementById('btn-salir');
if (btnSalir) {
    btnSalir.addEventListener('click', async () => {
        if (!confirm('¿Seguro que quieres salir del grupo?')) return;

        const res = await fetch(`/grupo/${grupoIdGestion}/salir`, {
            method: 'POST',
            headers: headersGestion
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        window.location.href = '/grupos';
    });
}

document.querySelectorAll('.btn-expulsar').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const usuarioId = btn.dataset.id;
        if (!confirm('¿Expulsar a este integrante?')) return;

        const res = await fetch(`/grupo/${grupoIdGestion}/integrantes`, {
            method: 'DELETE',
            headers: headersGestion,
            body: JSON.stringify({ usuarioId })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        window.location.reload();
    });
});

document.querySelectorAll('.btn-transferir').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const nuevoLiderId = btn.dataset.id;
        if (!confirm('¿Transferir el liderazgo a este integrante?')) return;

        const res = await fetch(`/grupo/${grupoIdGestion}/transferir-liderazgo`, {
            method: 'PATCH',
            headers: headersGestion,
            body: JSON.stringify({ nuevoLiderId })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        window.location.reload();
    });
});
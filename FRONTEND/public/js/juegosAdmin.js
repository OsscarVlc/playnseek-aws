const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

const inputBuscar = document.getElementById('input-buscar-juego');
const btnBuscar = document.getElementById('btn-buscar-juego');
const resultadosDiv = document.getElementById('resultados-busqueda-juego');

if (btnBuscar) {
    btnBuscar.addEventListener('click', async () => {
        const nombre = inputBuscar.value.trim();
        if (!nombre) return;

        resultadosDiv.innerHTML = '<p class="text-muted">Buscando...</p>';

        const res = await fetch(`/juegos/buscar?nombre=${encodeURIComponent(nombre)}`);
        const data = await res.json();

        resultadosDiv.innerHTML = '';

        if (!data.results || data.results.length === 0) {
            resultadosDiv.innerHTML = '<p class="text-muted">Sin resultados.</p>';
            return;
        }

        data.results.slice(0, 8).forEach((resultado) => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center border-bottom py-2';
            div.innerHTML = `
                <span>${resultado.name}</span>
                <button class="btn btn-sm btn-primary btn-importar" data-id="${resultado.id}">Importar</button>
            `;
            resultadosDiv.appendChild(div);
        });

        document.querySelectorAll('.btn-importar').forEach((btn) => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Importando...';

                const res = await fetch('/juegos/crearJuego', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ id: Number(btn.dataset.id) })
                });

                const data = await res.json();

                if (!res.ok) {
                    alert(data.message);
                    btn.disabled = false;
                    btn.textContent = 'Importar';
                    return;
                }

                alert(data.message);
                window.location.reload();
            });
        });
    });
}

document.querySelectorAll('.btn-eliminar-juego').forEach((btn) => {
    btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este juego del catálogo?')) return;

        const id = btn.dataset.id;
        const res = await fetch(`/juegos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.message);
            return;
        }

        window.location.reload();
    });
});
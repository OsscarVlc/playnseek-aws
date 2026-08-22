const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;
const juegoId = scriptActual.dataset.juegoId;

const toggleActivo = document.getElementById('toggle-juego-activo');
const toggleBusca = document.getElementById('toggle-busca-equipo');
const contenedorBusca = document.getElementById('contenedor-busca-equipo');

toggleActivo.addEventListener('change', async () => {
    if (toggleActivo.checked) {
        contenedorBusca.style.display = 'block';

        const res = await fetch(`/user/juegos-activos/${juegoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ busca_equipo: toggleBusca.checked })
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.message);
            toggleActivo.checked = false;
            contenedorBusca.style.display = 'none';
        }
    } else {
        contenedorBusca.style.display = 'none';

        const res = await fetch(`/user/juegos-activos/${juegoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.message);
            toggleActivo.checked = true;
            contenedorBusca.style.display = 'block';
        }
    }
});

toggleBusca.addEventListener('change', async () => {
    await fetch(`/user/juegos-activos/${juegoId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busca_equipo: toggleBusca.checked })
    });
});


const togglePasado = document.getElementById('toggle-juego-pasado');

if (togglePasado) {
    togglePasado.addEventListener('change', async () => {
        const url = `/user/juegos-pasados/${juegoId}`;
        const metodo = togglePasado.checked ? 'POST' : 'DELETE';

        const res = await fetch(url, {
            method: metodo,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.message);
            togglePasado.checked = !togglePasado.checked;
            return;
        }

        // si se marcó como pasado, refleja que ya no está activo
        if (togglePasado.checked && toggleActivo.checked) {
            toggleActivo.checked = false;
            contenedorBusca.style.display = 'none';
        }
    });
}
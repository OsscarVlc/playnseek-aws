const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;

const formCrearGrupo = document.getElementById('form-crear-grupo');
const mensajeDiv = document.getElementById('mensaje-crear-grupo');

formCrearGrupo.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensajeDiv.innerHTML = '';

    const nombre = formCrearGrupo.nombre.value;
    const descripcion = formCrearGrupo.descripcion.value;

    try {
        const response = await fetch('/grupo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, descripcion })
        });

        const data = await response.json();

        if (!response.ok) {
            mensajeDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        window.location.href = `/grupos/${data.grupo._id}`;

    } catch (err) {
        mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al crear el grupo</div>`;
    }
});
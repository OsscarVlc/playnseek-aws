const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;

const contenedorGamertags = document.getElementById('contenedor-gamertags');
const formPerfil = document.getElementById('form-perfil');
const mensajeDiv = document.getElementById('mensaje-perfil');

// Vista previa instantánea de la foto al seleccionarla
document.getElementById('input-foto').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (evento) => {
        document.getElementById('preview-foto').innerHTML =
            `<img src="${evento.target.result}" class="rounded-circle" width="120" height="120" style="object-fit: cover;">`;
    };
    lector.readAsDataURL(archivo);
});

// Cada vez que se marca/desmarca una plataforma, regeneramos los inputs de gamertag
document.querySelectorAll('.plataforma-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
        contenedorGamertags.innerHTML = '';

        const seleccionadas = Array.from(document.querySelectorAll('.plataforma-checkbox:checked')).map((cb) => cb.value);

        seleccionadas.forEach((plataforma) => {
            const div = document.createElement('div');
            div.className = 'mb-2';
            div.innerHTML = `
                <label class="form-label">Gamertag en ${plataforma}</label>
                <input type="text" class="form-control gamertag-input" data-plataforma="${plataforma}" placeholder="Tu gamertag en ${plataforma}">
            `;
            contenedorGamertags.appendChild(div);
        });
    });
});

formPerfil.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensajeDiv.innerHTML = '';

    const formData = new FormData();

    // campos simples de texto
    const nombre = formPerfil.nombre.value;
    const edad = formPerfil.edad.value;

    if (nombre) formData.append('nombre', nombre);
    if (edad) formData.append('edad', edad);

    // zona_horaria: radio, un solo valor
    const zonaSeleccionada = document.querySelector('input[name="zona_horaria"]:checked');
    if (zonaSeleccionada) formData.append('zona_horaria', zonaSeleccionada.value);

    // horario_juego: checkboxes marcados
    document.querySelectorAll('input[name="horario_juego"]:checked').forEach((cb) => formData.append('horario_juego', cb.value));

    // disponibilidad: checkboxes marcados
    document.querySelectorAll('input[name="disponibilidad"]:checked').forEach((cb) => formData.append('disponibilidad', cb.value));

    // idiomas: checkboxes marcados
    document.querySelectorAll('input[name="idiomas"]:checked').forEach((cb) => formData.append('idiomas', cb.value));

    // modo_juego: checkboxes marcados
    document.querySelectorAll('input[name="modo_juego"]:checked').forEach((cb) => formData.append('modo_juego', cb.value));

    // plataformas: checkboxes marcados + sus gamertags correspondientes
    const plataformasSeleccionadas = Array.from(document.querySelectorAll('.plataforma-checkbox:checked')).map((cb) => cb.value);
    const inputsGamertag = document.querySelectorAll('.gamertag-input');

    const plataformas = plataformasSeleccionadas.map((nombrePlataforma) => {
        const input = Array.from(inputsGamertag).find((i) => i.dataset.plataforma === nombrePlataforma);
        return { nombre: nombrePlataforma, gamertag: input ? input.value : '' };
    });

    if (plataformas.length > 0) {
        formData.append('plataformas', JSON.stringify(plataformas));
    }

    // foto de perfil, solo si se seleccionó una
    const archivo = document.getElementById('input-foto').files[0];
    if (archivo) {
        formData.append('foto_perfil', archivo);
    }

    try {
        const response = await fetch('/user/actualizar', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            mensajeDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        mensajeDiv.innerHTML = `<div class="alert alert-success">Perfil actualizado correctamente</div>`;
        setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
        mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al actualizar el perfil</div>`;
    }
});
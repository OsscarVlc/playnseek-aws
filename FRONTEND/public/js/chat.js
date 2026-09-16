const scriptActual = document.currentScript;
const grupoId = scriptActual.dataset.grupoId;
const token = scriptActual.dataset.token;
const miUsuarioId = scriptActual.dataset.miUsuarioId;

const socket = io({ auth: { token: token } });

const divMensajes = document.getElementById('mensajes');
const formMensaje = document.getElementById('form-mensaje');
const inputMensaje = document.getElementById('input-mensaje');

socket.on('connect', () => {
    socket.emit('unirse_grupo', grupoId);
});

socket.on('historial', (mensajes) => {
    mensajes.forEach(mostrarMensaje);
});

socket.on('mensaje_recibido', (mensaje) => {
    mostrarMensaje(mensaje);
});

socket.on('error_chat', (mensajeError) => {
    alert(mensajeError);
    formMensaje.style.display = 'none';
    divMensajes.innerHTML = `<p class="text-muted">${mensajeError}</p>`;
});

formMensaje.addEventListener('submit', (e) => {
    e.preventDefault();
    const contenido = inputMensaje.value.trim();
    if (!contenido) return;

    socket.emit('mensaje_nuevo', { grupoId, contenido });
    inputMensaje.value = '';
});

function idDelMensaje(mensaje) {
    if (mensaje.usuario_id && typeof mensaje.usuario_id === 'object') {
        return mensaje.usuario_id._id;
    }
    return mensaje.usuario_id;
}

function nombreDelMensaje(mensaje) {
    if (mensaje.usuario_id && typeof mensaje.usuario_id === 'object' && mensaje.usuario_id.nombre) {
        return mensaje.usuario_id.nombre;
    }
    return mensaje.nombreUsuario || 'Usuario';
}

function mostrarMensaje(mensaje) {
    const esMio = idDelMensaje(mensaje) === miUsuarioId;

    const div = document.createElement('div');
    div.className = `d-flex mb-2 ${esMio ? 'justify-content-end' : 'justify-content-start'}`;

    const burbuja = document.createElement('div');
    burbuja.className = `p-2 rounded ${esMio ? 'bg-primary text-white' : 'bg-light'}`;
    burbuja.style.maxWidth = '70%';

    if (!esMio) {
        const nombreDiv = document.createElement('div');
        nombreDiv.className = 'small fw-bold';
        nombreDiv.textContent = nombreDelMensaje(mensaje);
        burbuja.appendChild(nombreDiv);
    }

    const textoDiv = document.createElement('div');
    textoDiv.textContent = mensaje.contenido;
    burbuja.appendChild(textoDiv);

    div.appendChild(burbuja);
    divMensajes.appendChild(div);
    divMensajes.scrollTop = divMensajes.scrollHeight;
}
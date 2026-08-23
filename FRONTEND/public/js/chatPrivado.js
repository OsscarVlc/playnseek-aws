const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;
const otroUsuarioId = scriptActual.dataset.otroUsuarioId;
const miUsuarioId = scriptActual.dataset.miUsuarioId;

const socket = io({ auth: { token } });

const divMensajes = document.getElementById('mensajes-privado');
const formMensaje = document.getElementById('form-mensaje-privado');
const inputMensaje = document.getElementById('input-mensaje-privado');

socket.on('connect', () => {
    socket.emit('unirse_chat_privado', otroUsuarioId);
});

socket.on('historial_privado', (mensajes) => {
    mensajes.forEach(mostrarMensaje);
});

socket.on('mensaje_privado_recibido', (mensaje) => {
    mostrarMensaje(mensaje);
});

socket.on('error_chat_privado', (mensajeError) => {
    alert(mensajeError);
    formMensaje.style.display = 'none';
    divMensajes.innerHTML = `<p class="text-muted">${mensajeError}</p>`;
});

formMensaje.addEventListener('submit', (e) => {
    e.preventDefault();
    const contenido = inputMensaje.value.trim();
    if (!contenido) return;

    socket.emit('mensaje_privado_nuevo', { destinatarioId: otroUsuarioId, contenido });
    inputMensaje.value = '';
});

function mostrarMensaje(mensaje) {
    const esMio = mensaje.usuario_id === miUsuarioId || mensaje.usuario_id?._id === miUsuarioId;

    const div = document.createElement('div');
    div.className = `d-flex mb-2 ${esMio ? 'justify-content-end' : 'justify-content-start'}`;

    const burbuja = document.createElement('div');
    burbuja.className = `p-2 rounded ${esMio ? 'bg-primary text-white' : 'bg-light'}`;
    burbuja.style.maxWidth = '70%';
    burbuja.textContent = mensaje.contenido;

    div.appendChild(burbuja);
    divMensajes.appendChild(div);
    divMensajes.scrollTop = divMensajes.scrollHeight;
}
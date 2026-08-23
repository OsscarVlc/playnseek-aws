const scriptPosts = document.currentScript;
const tokenPosts = scriptPosts.dataset.token;
const grupoIdPosts = scriptPosts.dataset.grupoId;

const headersLectura = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenPosts}`
};

const listaPosts = document.getElementById('lista-posts');
const formNuevoPost = document.getElementById('form-nuevo-post');
const inputContenidoPost = document.getElementById('input-contenido-post');
const inputImagenPost = document.getElementById('input-imagen-post');

async function cargarPosts() {
    const res = await fetch(`/post?grupo_id=${grupoIdPosts}`, { headers: headersLectura });
    const data = await res.json();

    listaPosts.innerHTML = '';

    if (data.data.length === 0) {
        listaPosts.innerHTML = '<p class="text-muted">Aún no hay publicaciones en este grupo.</p>';
        return;
    }

    data.data.forEach((post) => {
        const imagenHtml = (post.imagenes && post.imagenes.length > 0)
            ? `<img src="${post.imagenes[0]}" class="img-fluid rounded mb-2" style="max-height: 250px;">`
            : '';

        const div = document.createElement('div');
        div.className = 'card shadow-sm mb-3';
        div.innerHTML = `
            <div class="card-body">
                <p class="mb-2">${post.contenido}</p>
                ${imagenHtml}
                <small class="text-muted">${new Date(post.fecha).toLocaleString()}</small>
                <div class="mt-2">
                    <div class="comentarios-lista mb-2" data-post-id="${post._id}"></div>
                    <form class="form-comentario d-flex gap-2" data-post-id="${post._id}">
                        <input type="text" class="form-control form-control-sm input-comentario" placeholder="Comentar...">
                        <button type="submit" class="btn btn-sm btn-outline-primary">Enviar</button>
                    </form>
                </div>
            </div>
        `;
        listaPosts.appendChild(div);
        cargarComentarios(post._id);
    });

    document.querySelectorAll('.form-comentario').forEach((form) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const postId = form.dataset.postId;
            const input = form.querySelector('.input-comentario');
            const contenido = input.value.trim();
            if (!contenido) return;

            await fetch('/comentario', {
                method: 'POST',
                headers: headersLectura,
                body: JSON.stringify({ post_id: postId, contenido })
            });

            input.value = '';
            cargarComentarios(postId);
        });
    });
}

async function cargarComentarios(postId) {
    const res = await fetch(`/comentario?post_id=${postId}`, { headers: headersLectura });
    const data = await res.json();

    const contenedor = document.querySelector(`.comentarios-lista[data-post-id="${postId}"]`);
    if (!contenedor) return;

    contenedor.innerHTML = data.data.map((c) =>
        `<p class="mb-1 small"><strong>${c.usuario_id?.nombre || 'Usuario'}:</strong> ${c.contenido}</p>`
    ).join('');
}

formNuevoPost.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contenido = inputContenidoPost.value.trim();
    if (!contenido) return;

    const formData = new FormData();
    formData.append('grupo_id', grupoIdPosts);
    formData.append('contenido', contenido);

    const archivo = inputImagenPost.files[0];
    if (archivo) {
        formData.append('imagen', archivo);
    }

    const res = await fetch('/post', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokenPosts}`
            // sin Content-Type, igual que en perfil.js
        },
        body: formData
    });

    if (res.ok) {
        inputContenidoPost.value = '';
        inputImagenPost.value = '';
        cargarPosts();
    }
});

cargarPosts();
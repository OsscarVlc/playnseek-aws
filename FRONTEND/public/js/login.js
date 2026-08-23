const formLogin = document.getElementById('form-login');
const mensajeDiv = document.getElementById('mensaje-login');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensajeDiv.innerHTML = '';

    const email = formLogin.email.value;
    const password = formLogin.password.value;

    try {
        const response = await fetch('/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            let extra = '';
            if (data.message.includes('confirmar tu correo')) {
                extra = `<button id="btn-reenviar" class="btn btn-sm btn-outline-secondary mt-2">Reenviar correo de confirmación</button>`;
            }
            mensajeDiv.innerHTML = `<div class="alert alert-danger">${data.message}${extra}</div>`;

            const btnReenviar = document.getElementById('btn-reenviar');
            if (btnReenviar) {
                btnReenviar.addEventListener('click', async () => {
                    btnReenviar.disabled = true;
                    const resReenvio = await fetch('/user/reenviar-confirmacion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const dataReenvio = await resReenvio.json();
                    mensajeDiv.innerHTML = `<div class="alert alert-info">${dataReenvio.message}</div>`;
                });
            }
            return;
        }

        document.cookie = `token=${data.token}; path=/; max-age=3600`;
        window.location.href = '/perfil';

    } catch (err) {
        mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al iniciar sesión</div>`;
    }
});
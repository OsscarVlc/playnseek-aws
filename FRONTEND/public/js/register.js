const formRegister = document.getElementById('form-register');
const mensajeDiv = document.getElementById('mensaje-register');

formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensajeDiv.innerHTML = '';

    const name = formRegister.name.value;
    const email = formRegister.email.value;
    const password = formRegister.password.value;

    try {
        const response = await fetch('/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            mensajeDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            return;
        }

        window.location.href = '/login?registrado=true';

    } catch (err) {
        mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al registrar la cuenta</div>`;
    }
});
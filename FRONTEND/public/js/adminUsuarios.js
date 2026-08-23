const scriptActual = document.currentScript;
const token = scriptActual.dataset.token;

document.querySelectorAll('.select-rol').forEach((select) => {
    select.addEventListener('change', async () => {
        const usuarioId = select.dataset.id;
        const nuevoRol = select.value;

        const res = await fetch(`/user/${usuarioId}/rol`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rol: nuevoRol })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        alert('Rol actualizado');
    });
});
const btnUnirse = document.getElementById('btn-unirse');
if (btnUnirse) {
    const scriptTag = document.currentScript;
    const token = scriptTag.dataset.token;
    const grupoId = scriptTag.dataset.grupoId;

    btnUnirse.addEventListener('click', async () => {
        btnUnirse.disabled = true;
        const res = await fetch(`/grupo/${grupoId}/unirse`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            btnUnirse.disabled = false;
            return;
        }

        window.location.reload();
    });
}
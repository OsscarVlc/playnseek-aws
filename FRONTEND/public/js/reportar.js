/* global bootstrap */

const scriptReportar = document.currentScript;
const tokenReportar = scriptReportar.dataset.token;

const formReportar = document.getElementById('form-reportar');
const mensajeReportar = document.getElementById('mensaje-reportar');
const modalReportar = new bootstrap.Modal(document.getElementById('modalReportar'));

function abrirModalReportar(reportadoId, grupoId) {
    document.getElementById('reportar-reportado-id').value = reportadoId;
    document.getElementById('reportar-grupo-id').value = grupoId || '';
    mensajeReportar.innerHTML = '';
    formReportar.reset();
    modalReportar.show();
}

// Botones "Reportar" de la lista de integrantes de un grupo (grupo-detalle).
// Antes no tenían ningún listener y no hacían nada al darles clic.
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-reportar');
    if (!btn) return;
    abrirModalReportar(btn.dataset.id, btn.dataset.grupoId);
});

formReportar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const reportadoId = document.getElementById('reportar-reportado-id').value;
    const grupoId = document.getElementById('reportar-grupo-id').value;
    const motivo = document.getElementById('reportar-motivo').value;
    const descripcion = document.getElementById('reportar-descripcion').value;

    const body = { reportado_id: reportadoId, motivo };
    if (descripcion) body.descripcion = descripcion;
    if (grupoId) body.grupo_id = grupoId;

    const res = await fetch('/reporte', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenReportar}`
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        mensajeReportar.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
        return;
    }

    modalReportar.hide();
    alert('Reporte enviado');
});
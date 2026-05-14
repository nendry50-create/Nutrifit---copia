/* ===== PUBLICAR RECETA ===== */

document.addEventListener('DOMContentLoaded', () => {
    const publicarForm = document.getElementById('publicarForm');
    if (!publicarForm) return;

    // Verificar sesión
    if (!Storage.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Manejo del formulario
    publicarForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titulo = document.getElementById('recetaTitulo').value.trim();
        const descripcion = document.getElementById('recetaDescripcion').value.trim();
        const categoria = document.getElementById('recetaCategoria').value;
        const tiempo = document.getElementById('recetaTiempo').value.trim();
        const dificultad = document.getElementById('recetaDificultad').value;
        const instrucciones = document.getElementById('recetaInstrucciones').value.trim();

        // Recoger ingredientes
        const ingredientesInputs = document.querySelectorAll('.publicar-form__ingredient-row input');
        const ingredientes = [];
        ingredientesInputs.forEach(input => {
            const val = input.value.trim();
            if (val) ingredientes.push(val);
        });

        // Validaciones
        if (!titulo) { alert('Por favor, escribe un título.'); return; }
        if (!descripcion) { alert('Por favor, escribe una descripción.'); return; }
        if (!categoria) { alert('Por favor, selecciona una categoría.'); return; }
        if (ingredientes.length === 0) { alert('Agrega al menos un ingrediente.'); return; }
        if (!instrucciones) { alert('Por favor, escribe las instrucciones.'); return; }

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descripcion', descripcion);
        formData.append('categoria', categoria);
        formData.append('tiempo', tiempo || 'No especificado');
        formData.append('dificultad', dificultad || 'No especificada');
        formData.append('instrucciones', instrucciones);
        formData.append('ingredientes', JSON.stringify(ingredientes));

        const fileInput = document.getElementById('recetaImagen');
        if (fileInput && fileInput.files[0]) {
            formData.append('imagen', fileInput.files[0]);
        }

        const resultado = await Storage.addRecipe(formData);

        if (resultado.success) {
            const mensajeDiv = document.getElementById('publicarMensaje');
            if (mensajeDiv) {
                mensajeDiv.innerHTML = '<div class="mensaje-exito"><i data-lucide="party-popper"></i> ¡Receta publicada exitosamente! Redirigiendo...</div>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            setTimeout(() => { window.location.href = 'feed.html'; }, 1500);
        } else {
            alert('Error al publicar receta: ' + (resultado.error || 'Error desconocido'));
        }
    });

    // Previsualización de imagen
    const fileInput = document.getElementById('recetaImagen');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('imagePreview');
                const uploadText = document.querySelector('.publicar-form__upload-icon');
                const uploadHint = document.querySelector('.publicar-form__upload-text');
                const uploadSub = document.querySelector('.publicar-form__upload-hint');

                if (preview) {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                }
                if (uploadText) uploadText.style.display = 'none';
                if (uploadHint) uploadHint.textContent = file.name;
                if (uploadSub) uploadSub.textContent = 'Click para cambiar imagen';
            };
            reader.readAsDataURL(file);
        });
    }
});

// Agregar ingrediente
function agregarIngrediente() {
    const lista = document.getElementById('ingredientesList');
    if (!lista) return;

    const row = document.createElement('div');
    row.className = 'publicar-form__ingredient-row';
    row.innerHTML = `
        <input type="text" placeholder="Ej: 1 taza de harina">
        <button type="button" class="publicar-form__remove-btn" onclick="eliminarIngrediente(this)"><i data-lucide="x"></i></button>
    `;
    lista.appendChild(row);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Focus al nuevo input
    row.querySelector('input').focus();
}

// Eliminar ingrediente
function eliminarIngrediente(btn) {
    const lista = document.getElementById('ingredientesList');
    const rows = lista.querySelectorAll('.publicar-form__ingredient-row');
    if (rows.length > 1) {
        btn.closest('.publicar-form__ingredient-row').remove();
    }
}

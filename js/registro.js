/* ===== REGISTRO DE USUARIO ===== */

document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registroForm');
    if (!registroForm) return;

    // Redirigir si ya está logueado
    if (Storage.isLoggedIn()) {
        window.location.href = 'feed.html';
        return;
    }

    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarErroresRegistro();

        const nombre = document.getElementById('regNombre').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // Validaciones
        let hayError = false;

        if (!nombre) {
            mostrarErrorRegistro('regNombre', 'El nombre es obligatorio.');
            hayError = true;
        } else if (nombre.length < 2) {
            mostrarErrorRegistro('regNombre', 'El nombre debe tener al menos 2 caracteres.');
            hayError = true;
        }

        if (!email) {
            mostrarErrorRegistro('regEmail', 'El correo es obligatorio.');
            hayError = true;
        } else if (!validarEmailRegistro(email)) {
            mostrarErrorRegistro('regEmail', 'Ingresa un correo válido.');
            hayError = true;
        }

        if (!password) {
            mostrarErrorRegistro('regPassword', 'La contraseña es obligatoria.');
            hayError = true;
        } else if (password.length < 6) {
            mostrarErrorRegistro('regPassword', 'La contraseña debe tener al menos 6 caracteres.');
            hayError = true;
        }

        if (password !== confirmPassword) {
            mostrarErrorRegistro('regConfirmPassword', 'Las contraseñas no coinciden.');
            hayError = true;
        }

        if (hayError) return;

        // Intentar registro
        const resultado = await Storage.registerUser(nombre, email, password);

        if (resultado.success) {
            mostrarMensajeRegistro('registroMensaje', '¡Cuenta creada exitosamente! Redirigiendo...', 'exito');
            setTimeout(() => {
                window.location.href = 'feed.html';
            }, 1200);
        } else {
            mostrarMensajeRegistro('registroMensaje', resultado.message, 'error');
        }
    });

    // Toggle mostrar/ocultar contraseñas
    document.querySelectorAll('.auth-field__toggle-pass').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.previousElementSibling || toggle.closest('.auth-field__input-wrapper').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                toggle.textContent = '🙈';
            } else {
                input.type = 'password';
                toggle.textContent = '👁️';
            }
        });
    });
});

// --- Funciones auxiliares de registro ---
function validarEmailRegistro(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mostrarErrorRegistro(inputId, mensaje) {
    const field = document.getElementById(inputId).closest('.auth-field');
    field.classList.add('has-error');
    const errorEl = field.querySelector('.auth-field__error');
    if (errorEl) {
        errorEl.textContent = mensaje;
        errorEl.style.display = 'block';
    }
}

function limpiarErroresRegistro() {
    document.querySelectorAll('.auth-field').forEach(field => {
        field.classList.remove('has-error');
        const errorEl = field.querySelector('.auth-field__error');
        if (errorEl) errorEl.style.display = 'none';
    });
}

function mostrarMensajeRegistro(containerId, texto, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="mensaje-${tipo}">${texto}</div>`;
}

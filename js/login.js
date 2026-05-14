/* ===== INICIO DE SESIÓN (LOGIN) ===== */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Redirigir si ya está logueado
    if (Storage.isLoggedIn()) {
        window.location.href = 'feed.html';
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarErrores();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Validaciones
        let hayError = false;

        if (!email) {
            mostrarError('loginEmail', 'El correo es obligatorio.');
            hayError = true;
        } else if (!validarEmail(email)) {
            mostrarError('loginEmail', 'Ingresa un correo válido.');
            hayError = true;
        }

        if (!password) {
            mostrarError('loginPassword', 'La contraseña es obligatoria.');
            hayError = true;
        }

        if (hayError) return;

        // Intentar login
        const resultado = await Storage.loginUser(email, password);

        if (resultado.success) {
            mostrarMensaje('loginMensaje', '¡Bienvenido de vuelta! Redirigiendo...', 'exito');
            setTimeout(() => {
                // Redirigir al panel admin si es administrador
                if (resultado.user && resultado.user.rol === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'feed.html';
                }
            }, 1000);
        } else {
            mostrarMensaje('loginMensaje', resultado.message, 'error');
        }
    });

    // Toggle mostrar/ocultar contraseña
    const togglePass = document.querySelector('.auth-field__toggle-pass');
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const input = document.getElementById('loginPassword');
            if (input.type === 'password') {
                input.type = 'text';
                togglePass.textContent = '🙈';
            } else {
                input.type = 'password';
                togglePass.textContent = '👁️';
            }
        });
    }
});

// --- Funciones auxiliares ---
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mostrarError(inputId, mensaje) {
    const field = document.getElementById(inputId).closest('.auth-field');
    field.classList.add('has-error');
    const errorEl = field.querySelector('.auth-field__error');
    if (errorEl) {
        errorEl.textContent = mensaje;
        errorEl.style.display = 'block';
    }
}

function limpiarErrores() {
    document.querySelectorAll('.auth-field').forEach(field => {
        field.classList.remove('has-error');
        const errorEl = field.querySelector('.auth-field__error');
        if (errorEl) errorEl.style.display = 'none';
    });
}

function mostrarMensaje(containerId, texto, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="mensaje-${tipo}">${texto}</div>`;
}

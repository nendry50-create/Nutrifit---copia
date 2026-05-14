/* ===== NAVEGACIÓN Y HEADER ===== */

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.header__hamburger');
    const nav = document.querySelector('.header__nav');

    // Efecto scroll en header
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Menú hamburguesa
    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            nav.classList.toggle('open');
        });

        // Cerrar al hacer click en un link
        nav.querySelectorAll('.header__nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                nav.classList.remove('open');
            });
        });
    }

    // Actualizar UI según estado de sesión
    actualizarHeaderSesion();
});

async function actualizarHeaderSesion() {
    const actionsContainer = document.querySelector('.header__actions');
    if (!actionsContainer) return;

    let user = Storage.getCurrentUser();

    // Refrescar datos del usuario desde el servidor para mantener rol/baneado sincronizado
    if (user && Storage.getToken()) {
        try {
            const res = await fetch('http://localhost:3000/api/usuario/perfil-completo', {
                headers: { 'Authorization': `Bearer ${Storage.getToken()}` }
            });
            if (res.ok) {
                const freshUser = await res.json();
                // Actualizar localStorage con datos frescos del servidor
                const updatedUser = { ...user, ...freshUser };
                localStorage.setItem('nutrifit_user', JSON.stringify(updatedUser));
                user = updatedUser;
            } else if (res.status === 403) {
                // Usuario baneado — cerrar sesión
                Storage.logout();
                window.location.href = 'login.html';
                return;
            }
        } catch (err) {
            console.warn('No se pudo refrescar datos del usuario:', err);
        }
    }

    if (user) {
        const inicial = user.nombre.charAt(0).toUpperCase();
        const adminBtn = user.rol === 'admin'
            ? `<a href="admin.html" class="header__admin-btn" title="Panel de Administración">
                <i data-lucide="shield-check"></i> Admin
               </a>`
            : '';
        actionsContainer.innerHTML = `
            ${adminBtn}
            <a href="publicar.html" class="btn-primary" style="padding: 8px 20px; font-size: 0.88rem;">
                <i data-lucide="plus"></i> Publicar
            </a>
            <a href="perfil.html" class="header__user">
                <div class="header__avatar">${inicial}</div>
                <span class="header__username">${user.nombre.split(' ')[0]}</span>
            </a>
            <button class="header__logout" onclick="cerrarSesion()">Salir</button>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        actionsContainer.innerHTML = `
            <a href="login.html" class="btn-secondary" style="padding: 8px 20px; font-size: 0.88rem;">
                <i data-lucide="log-in"></i> Iniciar sesión
            </a>
            <a href="registro.html" class="btn-primary" style="padding: 8px 20px; font-size: 0.88rem;">
                <i data-lucide="user-plus"></i> Registrarse
            </a>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}


function cerrarSesion() {
    Storage.logout();
    window.location.href = 'index.html';
}

// Marcar link activo
function marcarLinkActivo() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.header__nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', marcarLinkActivo);


// ===== UI GLOBAL (stub — el modal real está en feed.js) =====
const UI = {
    showRecipeDetails(receta) {
        // Delegar al sistema de modal de feed.js si está disponible
        if (typeof abrirModal === 'function' && receta && receta.id) {
            abrirModal(receta.id);
        }
    }
};

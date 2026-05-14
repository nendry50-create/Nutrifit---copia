/* ===== PANEL ADMINISTRATIVO ===== */
let adminData = {
    usuarios: [],
    recetas: [],
    comentarios: []
};

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que sea admin
    if (!Storage.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    let user = Storage.getCurrentUser();
    
    // Si no es admin en localStorage, intentar refrescar desde el servidor por si acaso
    if (!user || user.rol !== 'admin') {
        try {
            const res = await fetch('http://localhost:3000/api/usuario/perfil-completo', {
                headers: { 'Authorization': `Bearer ${Storage.getToken()}` }
            });
            if (res.ok) {
                const freshUser = await res.json();
                user = { ...user, ...freshUser };
                localStorage.setItem('nutrifit_user', JSON.stringify(user));
            }
        } catch (err) {
            console.error('Error verificando rol:', err);
        }
    }

    if (!user || user.rol !== 'admin') {
        alert('⛔ No tienes permiso para acceder al panel admin');
        window.location.href = 'index.html';
        return;
    }

    // Mostrar info del administrador en el sidebar
    const adminNameEl = document.getElementById('adminSidebarName');
    const adminAvatarEl = document.getElementById('adminSidebarAvatar');
    if (adminNameEl) adminNameEl.textContent = user.nombre;
    if (adminAvatarEl) adminAvatarEl.textContent = user.nombre.charAt(0).toUpperCase();

    // Cargar datos
    await cargarTodos();
    configurarNavegacion();
    configurarBusquedas();
    
    // Inicializar Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Actualizar cada 60 segundos
    setInterval(cargarTodos, 60000);
});

async function cargarTodos() {
    console.log('🔄 Actualizando datos del panel...');
    await cargarUsuarios();
    await cargarRecetas();
    await cargarComentarios();
    actualizarEstadisticas();
}

/* ===== USUARIOS ===== */
async function cargarUsuarios() {
    try {
        const token = Storage.getToken();
        const res = await fetch('http://localhost:3000/api/admin/usuarios', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar usuarios');
        const data = await res.json();
        adminData.usuarios = data;
        renderizarUsuarios(data);
        actualizarStatsUsuarios();
    } catch (err) {
        console.error('Error cargando usuarios:', err);
        const tbody = document.getElementById('usuariosTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--admin-danger);">❌ Error al cargar usuarios</td></tr>';
    }
}

function renderizarUsuarios(usuarios) {
    const tbody = document.getElementById('usuariosTable');
    if (!tbody) return;
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No hay usuarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map(u => {
        const estadoBadge = u.baneado 
            ? '<span style="background: rgba(224, 122, 95, 0.1); color: var(--admin-danger); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">🚫 Baneado</span>'
            : '<span style="background: rgba(42, 157, 143, 0.1); color: var(--admin-success); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">✅ Activo</span>';
        
        const rolBadge = u.rol === 'admin'
            ? '<span style="background: var(--admin-primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">👑 Admin</span>'
            : '<span style="background: #e9ecef; color: #495057; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">👤 Usuario</span>';
        
        const fecha = u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

        return `
            <tr>
                <td style="font-weight: 600; color: var(--admin-text-muted);">#${u.id}</td>
                <td style="font-weight: 700;">${u.nombre}</td>
                <td>${u.email}</td>
                <td>${rolBadge}</td>
                <td>${estadoBadge}</td>
                <td>${fecha}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="admin-btn admin-btn--primary" onclick="abrirModalUsuario(${u.id})" title="Ver detalles">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="admin-btn admin-btn--danger" onclick="eliminarUsuario(${u.id}, '${u.nombre.replace(/'/g, "\\'")}')" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function actualizarStatsUsuarios() {
    const total = adminData.usuarios.length;
    const baneados = adminData.usuarios.filter(u => u.baneado).length;
    const admins = adminData.usuarios.filter(u => u.rol === 'admin').length;

    const elTotal = document.getElementById('totalUsuarios');
    const elBaneados = document.getElementById('usuariosBaneados');
    const elAdmins = document.getElementById('administradores');

    if (elTotal) elTotal.textContent = total;
    if (elBaneados) elBaneados.textContent = baneados;
    if (elAdmins) elAdmins.textContent = admins;
}

function abrirModalUsuario(id) {
    const usuario = adminData.usuarios.find(u => u.id == id);
    if (!usuario) return;

    const modal = document.getElementById('modalUsuario');
    const detalles = document.getElementById('usuarioDetalles');
    if (!modal || !detalles) return;

    const fecha = usuario.fechaRegistro ? new Date(usuario.fechaRegistro).toLocaleDateString('es', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    detalles.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="width: 64px; height: 64px; background: var(--admin-primary); border-radius: 16px; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800;">
                    ${usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0;">${usuario.nombre}</h2>
                    <p style="color: var(--admin-text-muted); margin: 0;">${usuario.email}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: var(--admin-bg); padding: 20px; border-radius: 12px; border: 1px solid var(--admin-border);">
                <div>
                    <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-text-muted); font-weight: 700; display: block; margin-bottom: 5px;">ID Usuario</label>
                    <span style="font-weight: 700;">#${usuario.id}</span>
                </div>
                <div>
                    <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-text-muted); font-weight: 700; display: block; margin-bottom: 5px;">Rol Actual</label>
                    <span style="font-weight: 700;">${usuario.rol === 'admin' ? '👑 Administrador' : '👤 Usuario Estándar'}</span>
                </div>
                <div>
                    <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-text-muted); font-weight: 700; display: block; margin-bottom: 5px;">Estado de Cuenta</label>
                    <span style="font-weight: 700; color: ${usuario.baneado ? 'var(--admin-danger)' : 'var(--admin-success)'}">
                        ${usuario.baneado ? '🚫 BANEADO' : '✅ ACTIVO'}
                    </span>
                </div>
                <div>
                    <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-text-muted); font-weight: 700; display: block; margin-bottom: 5px;">Fecha Registro</label>
                    <span style="font-weight: 700;">${fecha}</span>
                </div>
            </div>
        </div>
    `;

    // Actualizar botones
    const btnPromover = document.getElementById('btnPromover');
    const btnBanear = document.getElementById('btnBanear');

    if (btnPromover) {
        btnPromover.onclick = () => promoverAdmin(usuario.id, usuario.rol);
        btnPromover.innerHTML = usuario.rol === 'admin' ? '<i data-lucide="user"></i> Degradar a Usuario' : '<i data-lucide="shield"></i> Hacer Admin';
        btnPromover.style.background = usuario.rol === 'admin' ? 'var(--admin-danger)' : 'var(--admin-primary)';
    }

    if (btnBanear) {
        btnBanear.innerHTML = usuario.baneado ? '<i data-lucide="check-circle"></i> Desbanear' : '<i data-lucide="slash"></i> Banear Cuenta';
        btnBanear.style.background = usuario.baneado ? 'var(--admin-success)' : 'var(--admin-danger)';
        btnBanear.onclick = () => banearUsuario(usuario.id, usuario.baneado);
    }

    modal.classList.add('admin-modal--visible');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function cerrarModalUsuario() {
    const modal = document.getElementById('modalUsuario');
    if (modal) modal.classList.remove('admin-modal--visible');
}

async function promoverAdmin(id, rolActual) {
    const nuevoRol = rolActual === 'admin' ? 'user' : 'admin';
    const mensaje = nuevoRol === 'admin'
        ? '¿Estás seguro de otorgar privilegios de ADMINISTRADOR a este usuario?'
        : '¿Estás seguro de revocar los privilegios de administrador?';

    if (!confirm(mensaje)) return;

    const data = await Storage.promoteUser(id, nuevoRol);
    if (data.success) {
        alert('✅ Éxito: ' + data.message);
        cerrarModalUsuario();
        await cargarUsuarios();
    } else {
        alert('❌ Error: ' + (data.error || 'No se pudo cambiar el rol'));
    }
}

async function banearUsuario(id, estaBaneado = false) {
    const mensaje = estaBaneado
        ? '¿Deseas reactivar esta cuenta?'
        : '¿Deseas bloquear el acceso a esta cuenta de forma permanente?';

    if (!confirm(mensaje)) return;

    const data = await Storage.banUser(id, !estaBaneado);
    if (data.success) {
        alert('✅ Éxito: ' + data.message);
        cerrarModalUsuario();
        await cargarUsuarios();
    } else {
        alert('❌ Error: ' + (data.error || 'No se pudo procesar la acción'));
    }
}

async function eliminarUsuario(id, nombre) {
    if (!confirm(`⚠️ ¿ELIMINAR DEFINITIVAMENTE a "${nombre}"? Esta acción borrará todas sus recetas y comentarios. No se puede deshacer.`)) return;

    try {
        const token = Storage.getToken();
        const res = await fetch(`http://localhost:3000/api/admin/eliminar-usuario/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert('✅ Usuario eliminado correctamente');
            await cargarUsuarios();
            await cargarRecetas(); // Las recetas del usuario también se eliminaron
            await cargarComentarios(); // Los comentarios también
        } else {
            const data = await res.json();
            alert('❌ Error: ' + (data.error || 'No se pudo eliminar al usuario'));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Error crítico de conexión');
    }
}

/* ===== RECETAS ===== */
async function cargarRecetas() {
    try {
        const token = Storage.getToken();
        const res = await fetch('http://localhost:3000/api/recetas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const recetas = await res.json();
        adminData.recetas = Array.isArray(recetas) ? recetas : [];
        renderizarRecetas(adminData.recetas);
        actualizarStatsRecetas();
    } catch (err) {
        console.error('Error cargando recetas:', err);
    }
}

function renderizarRecetas(recetas) {
    const tbody = document.getElementById('recetasTable');
    if (!tbody) return;
    if (recetas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No hay recetas publicadas</td></tr>';
        return;
    }

    tbody.innerHTML = recetas.map(r => {
        const fecha = r.fecha ? new Date(r.fecha).toLocaleDateString('es', { day: '2-digit', month: '2-digit' }) : '—';
        const titulo = (r.titulo || '').length > 35 ? r.titulo.substring(0, 35) + '...' : (r.titulo || '—');
        return `
            <tr>
                <td style="color: var(--admin-text-muted);">#${r.id}</td>
                <td style="font-weight: 700;">${titulo}</td>
                <td>${r.autorNombre || '—'}</td>
                <td><span style="background: var(--admin-primary-light); color: var(--admin-primary); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;">${r.categoria || '—'}</span></td>
                <td style="font-weight: 700; color: var(--admin-danger);">❤️ ${r.likes || 0}</td>
                <td>${fecha}</td>
                <td>
                    <button class="admin-btn admin-btn--danger" onclick="eliminarReceta(${r.id}, '${(r.titulo || '').replace(/'/g, "\\'")}')" title="Eliminar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function actualizarStatsRecetas() {
    const total = adminData.recetas.length;
    const likes = adminData.recetas.reduce((sum, r) => sum + (r.likes || 0), 0);

    const elTotal = document.getElementById('totalRecetas');
    const elLikes = document.getElementById('totalLikes');
    if (elTotal) elTotal.textContent = total;
    if (elLikes) elLikes.textContent = likes;
}

async function eliminarReceta(id, titulo) {
    if (!confirm(`¿Deseas eliminar permanentemente la receta "${titulo}"?`)) return;

    try {
        const token = Storage.getToken();
        const res = await fetch(`http://localhost:3000/api/recetas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert('✅ Receta eliminada');
            await cargarRecetas();
            await cargarComentarios(); // Los comentarios de la receta también se eliminaron
        } else {
            alert('❌ Error al eliminar receta');
        }
    } catch (err) {
        console.error(err);
        alert('❌ Error de conexión');
    }
}

/* ===== COMENTARIOS ===== */
async function cargarComentarios() {
    try {
        const comentarios = [];

        // Para mayor eficiencia, podríamos tener un endpoint de admin para todos los comentarios
        // pero por ahora iteramos las recetas cargadas
        for (const receta of adminData.recetas) {
            const res = await fetch(`http://localhost:3000/api/recetas/${receta.id}/comentarios`);
            if (!res.ok) continue;
            const coms = await res.json();
            coms.forEach(c => {
                comentarios.push({
                    ...c,
                    recetaTitulo: receta.titulo,
                    recetaId: receta.id
                });
            });
        }

        adminData.comentarios = comentarios;
        renderizarComentarios(comentarios);

        const elTotalCom = document.getElementById('totalComentarios');
        if (elTotalCom) elTotalCom.textContent = comentarios.length;
    } catch (err) {
        console.error('Error cargando comentarios:', err);
    }
}

function renderizarComentarios(comentarios) {
    const tbody = document.getElementById('comentariosTable');
    if (!tbody) return;
    if (comentarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No hay comentarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = comentarios.map(c => {
        const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es', { day: '2-digit', month: '2-digit' }) : '—';
        const texto = (c.texto || '').length > 50 ? (c.texto || '').substring(0, 50) + '...' : (c.texto || '');
        const recTitulo = (c.recetaTitulo || '').length > 25 ? (c.recetaTitulo || '').substring(0, 25) + '...' : (c.recetaTitulo || '');
        
        return `
            <tr>
                <td style="color: var(--admin-text-muted);">#${c.id}</td>
                <td style="font-weight: 700;">${c.usuarioNombre || '—'}</td>
                <td style="font-size: 0.85rem; color: var(--admin-primary); font-weight: 600;">${recTitulo}</td>
                <td title="${c.texto}">${texto}</td>
                <td>${fecha}</td>
                <td>
                    <button class="admin-btn admin-btn--danger" onclick="eliminarComentarioAdmin(${c.id})" title="Eliminar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function eliminarComentarioAdmin(id) {
    if (!confirm('¿Eliminar este comentario permanentemente?')) return;

    try {
        const token = Storage.getToken();
        const res = await fetch(`http://localhost:3000/api/comentarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert('✅ Comentario eliminado');
            await cargarComentarios();
        } else {
            alert('❌ Error al eliminar comentario');
        }
    } catch (err) {
        console.error(err);
        alert('❌ Error de red');
    }
}

/* ===== ESTADÍSTICAS ===== */
function actualizarEstadisticas() {
    const totalU = adminData.usuarios.length;
    const totalR = adminData.recetas.length;
    const totalLikes = adminData.recetas.reduce((sum, r) => sum + (r.likes || 0), 0);
    const totalC = adminData.comentarios.length;

    const ids = {
        statTotalUsuarios: totalU,
        statTotalRecetas: totalR,
        statTotalComentarios: totalC,
        statTotalLikes: totalLikes
    };

    Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Categorías populares
    const categorias = {};
    adminData.recetas.forEach(r => {
        if (r.categoria) categorias[r.categoria] = (categorias[r.categoria] || 0) + 1;
    });

    const catEl = document.getElementById('categoriasPopulares');
    if (catEl) {
        const html = Object.entries(categorias)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat, count]) => {
                const percentage = (count / (totalR || 1)) * 100;
                return `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 600; text-transform: capitalize;">${cat}</span>
                        <strong style="color: var(--admin-primary);">${count} recetas</strong>
                    </div>
                    <div style="height: 10px; background: #eee; border-radius: 5px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, var(--admin-primary), #40916c); border-radius: 5px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                </div>
            `;
            }).join('');
        catEl.innerHTML = html || '<p style="color:#888; text-align: center; padding: 20px;">Aún no hay suficientes datos para mostrar categorías.</p>';
    }

    // Top 5 recetas por likes
    const topEl = document.getElementById('topRecetas');
    if (topEl) {
        const top5 = [...adminData.recetas].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
        topEl.innerHTML = top5.length ? top5.map((r, i) => `
            <div style="display:flex; align-items:center; gap:15px; padding:15px 0; border-bottom: 1px solid var(--admin-border);">
                <div style="width:32px; height:32px; border-radius:8px; background: ${i === 0 ? 'var(--admin-primary)' : '#e9ecef'}; color: ${i === 0 ? 'white' : '#495057'}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem;">${i + 1}</div>
                <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.95rem; color: var(--admin-text-main);">${(r.titulo || '').substring(0, 40)}</div>
                    <div style="font-size:0.8rem; color: var(--admin-text-muted);">Publicado por <b>${r.autorNombre || '—'}</b></div>
                </div>
                <div style="color: var(--admin-danger); font-weight:800; background: rgba(224, 122, 95, 0.1); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem;">❤️ ${r.likes || 0}</div>
            </div>
        `).join('') : '<p style="color:#888; text-align: center; padding: 20px;">Sin recetas aún en el sistema.</p>';
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ===== NAVEGACIÓN ===== */
function configurarNavegacion() {
    const navLinks = document.querySelectorAll('.admin-nav__link');
    const sections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const section = link.dataset.section;
            if (!section) return; // Saltarse el botón de logout si está en el nav

            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('admin-section--active'));

            link.classList.add('active');
            const target = document.querySelector(`.admin-section[data-section="${section}"]`);
            if (target) target.classList.add('admin-section--active');
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    });
}

/* ===== BÚSQUEDAS ===== */
function configurarBusquedas() {
    const searchU = document.getElementById('searchUsuarios');
    if (searchU) {
        searchU.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = adminData.usuarios.filter(u =>
                (u.nombre || '').toLowerCase().includes(query) ||
                (u.email || '').toLowerCase().includes(query) ||
                (u.id || '').toString().includes(query)
            );
            renderizarUsuarios(filtered);
        });
    }

    const searchR = document.getElementById('searchRecetas');
    if (searchR) {
        searchR.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = adminData.recetas.filter(r =>
                (r.titulo || '').toLowerCase().includes(query) ||
                (r.autorNombre || '').toLowerCase().includes(query) ||
                (r.id || '').toString().includes(query)
            );
            renderizarRecetas(filtered);
        });
    }

    const searchC = document.getElementById('searchComentarios');
    if (searchC) {
        searchC.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = adminData.comentarios.filter(c =>
                (c.usuarioNombre || '').toLowerCase().includes(query) ||
                (c.texto || '').toLowerCase().includes(query) ||
                (c.recetaTitulo || '').toLowerCase().includes(query)
            );
            renderizarComentarios(filtered);
        });
    }
}

// Redirigir logout al sistema global de navegacion
function cerrarSesionAdmin() {
    if (typeof cerrarSesion === 'function') {
        if (confirm('¿Deseas salir del panel de administración?')) {
            cerrarSesion();
        }
    } else {
        if (confirm('¿Cerrar sesión?')) {
            Storage.logout();
            window.location.href = 'index.html';
        }
    }
}


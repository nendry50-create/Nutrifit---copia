/* ===== PERFIL DE USUARIO ===== */
let todasMisRecetas = [];
let todasRecetasGuardadas = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sesión
    if (!Storage.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    await refrescarPerfil();
    configurarTabs();
    configurarFormularios();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

async function refrescarPerfil() {
    const user = Storage.getCurrentUser();
    await cargarInfoPerfil(user);
    await cargarRecetasPerfil(user);
    await cargarSiguiendoPerfil(user);
}

async function cargarInfoPerfil(user) {
    // Avatar e inicial
    const avatar = document.getElementById('perfilAvatar');
    if (avatar) {
        avatar.textContent = user.nombre.charAt(0).toUpperCase();
    }

    // Nombre
    const nombre = document.getElementById('perfilNombre');
    if (nombre) nombre.textContent = user.nombre;

    // Email
    const email = document.getElementById('perfilEmail');
    if (email) email.textContent = user.email;

    // Estadísticas
    const misRecetas = await Storage.getRecipesByUser(user.id);
    const guardadas = await Storage.getLikedRecipes();
    const totalLikes = misRecetas.reduce((sum, r) => sum + (r.likes || 0), 0);

    // Nuevas estadísticas de seguidores
    const profileData = await Storage.getUsuarioPerfil(user.id);

    const statRecetas = document.getElementById('statRecetas');
    if (statRecetas) statRecetas.textContent = misRecetas.length;

    const statSeguidores = document.getElementById('statSeguidores');
    if (statSeguidores) statSeguidores.textContent = profileData ? profileData.seguidores : 0;

    const statSiguiendo = document.getElementById('statSiguiendo');
    if (statSiguiendo) statSiguiendo.textContent = profileData ? profileData.siguiendo : 0;

    const statGuardadas = document.getElementById('statGuardadas');
    if (statGuardadas) statGuardadas.textContent = guardadas.length;

    const statLikes = document.getElementById('statLikes');
    if (statLikes) statLikes.textContent = totalLikes;

    // Info de cuenta (inputs si existen)
    const inputNombre = document.getElementById('inputNombre');
    if (inputNombre) inputNombre.value = user.nombre;

    const inputEmail = document.getElementById('inputEmail');
    if (inputEmail) inputEmail.value = user.email;

    // Botón de Admin si el usuario tiene el rol
    const actionsContainer = document.querySelector('.perfil-info__actions');
    if (actionsContainer && user.rol === 'admin') {
        if (!document.getElementById('btnAdminPerfil')) {
            const adminBtn = document.createElement('a');
            adminBtn.href = 'admin.html';
            adminBtn.id = 'btnAdminPerfil';
            adminBtn.className = 'btn-secondary btn-small';
            adminBtn.style.background = 'linear-gradient(135deg, #2d6a4f, #1b4332)';
            adminBtn.style.color = 'white';
            adminBtn.style.marginRight = '10px';
            adminBtn.innerHTML = '<i data-lucide="shield-check"></i> Panel Admin';
            actionsContainer.prepend(adminBtn);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

async function cargarRecetasPerfil(user) {
    // Mis recetas
    const gridMisRecetas = document.getElementById('panelMisRecetas');
    if (gridMisRecetas) {
        todasMisRecetas = await Storage.getRecipesByUser(user.id);
        if (todasMisRecetas.length === 0) {
            gridMisRecetas.innerHTML = `
                <div class="feed-empty" style="grid-column: 1 / -1;">
                    <div class="feed-empty__icon"><i data-lucide="file-text" style="width:64px;height:64px;"></i></div>
                    <h3 class="feed-empty__title">Aún no has publicado recetas</h3>
                    <p class="feed-empty__text">¡Comparte tu primera receta con la comunidad!</p>
                    <a href="publicar.html" class="btn-primary" style="margin-top: 20px;"><i data-lucide="plus"></i> Publicar receta</a>
                </div>
            `;
        } else {
            gridMisRecetas.innerHTML = todasMisRecetas.map(r => crearTarjetaPerfilReceta(r, true)).join('');
        }
    }

    // Recetas que me gustaron
    const gridGuardadas = document.getElementById('panelGuardadas');
    if (gridGuardadas) {
        const guardadas = await Storage.getLikedRecipes();
        todasRecetasGuardadas = guardadas;
        if (guardadas.length === 0) {
            gridGuardadas.innerHTML = `
                <div class="feed-empty" style="grid-column: 1 / -1;">
                    <div class="feed-empty__icon"><i data-lucide="heart" style="width:64px;height:64px;"></i></div>
                    <h3 class="feed-empty__title">No has guardado recetas</h3>
                    <p class="feed-empty__text">Explora el feed y dale <i data-lucide="heart"></i> a las recetas que te gusten.</p>
                    <a href="feed.html" class="btn-primary" style="margin-top: 20px;">Explorar recetas</a>
                </div>
            `;
        } else {
            gridGuardadas.innerHTML = guardadas.map(r => crearTarjetaPerfilReceta(r, false)).join('');
        }
    }
}

async function cargarSiguiendoPerfil(user) {
    const lista = document.getElementById('listaSiguiendo');
    if (!lista) return;

    const siguiendo = await Storage.getListaSiguiendo(user.id);
    if (siguiendo.length === 0) {
        lista.innerHTML = `
            <div class="feed-empty" style="grid-column: 1 / -1;">
                <div class="feed-empty__icon"><i data-lucide="users" style="width:64px;height:64px;"></i></div>
                <h3 class="feed-empty__title">No sigues a nadie aún</h3>
                <p class="feed-empty__text">Explora recetas y sigue a otros cocineros.</p>
            </div>
        `;
    } else {
        lista.innerHTML = siguiendo.map(u => `
            <div class="following-card" style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #eee; display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.location.href='usuario.html?id=${u.id}'">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #2d6a4f; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                    ${u.nombre.charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; color: #1b4332; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.nombre}</div>
                    <div style="font-size: 0.75rem; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.email}</div>
                </div>
            </div>
        `).join('');
    }
}

function crearTarjetaPerfilReceta(receta, esMia) {
    const colores = [
        'linear-gradient(135deg, #2d6a4f, #40916c)',
        'linear-gradient(135deg, #e07a5f, #f4a261)',
        'linear-gradient(135deg, #264653, #2a9d8f)',
        'linear-gradient(135deg, #6d597a, #b56576)',
    ];
    const colorIndex = parseInt(receta.id) % colores.length;
    const bgColor = colores[colorIndex];

    const imagenHTML = receta.imagen
        ? `<img src="${receta.imagen}" alt="${receta.titulo}">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bgColor};color:white;font-size:3rem;">🥗</div>`;

    const actions = (esMia || (user && user.rol === 'admin'))
        ? `
        <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="btn-secondary" style="font-size:0.75rem;padding:5px 10px;" onclick="event.stopPropagation(); abrirModalEditar('${receta.id}', '${receta.titulo.replace(/'/g, "\\'")}', '${receta.descripcion.replace(/'/g, "\\'")}')"><i data-lucide="edit-3"></i> Editar</button>
            <button class="btn-danger" style="font-size:0.75rem;padding:5px 10px;" onclick="event.stopPropagation(); eliminarReceta('${receta.id}')"><i data-lucide="trash-2"></i> Borrar</button>
        </div>`
        : '';

    return `
        <article class="recipe-card" onclick="verRecetaPerfil('${receta.id}', ${esMia})">
            <div class="recipe-card__image">
                ${imagenHTML}
            </div>
            <div class="recipe-card__body">
                <h3 class="recipe-card__title">${receta.titulo}</h3>
                <p class="recipe-card__desc">${receta.descripcion}</p>
                <div class="recipe-card__meta">
                    <div style="display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="event.stopPropagation(); window.location.href='usuario.html?id=${receta.autorId}'">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: #2d6a4f; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold;">
                            ${receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style="font-size: 0.8rem; color: #1b4332; font-weight: 600;">${receta.autorNombre}</span>
                    </div>
                    <span class="recipe-card__stat"><i data-lucide="heart"></i> ${receta.likes || 0} likes</span>
                    ${actions}
                </div>
            </div>
        </article>
    `;
}

async function verRecetaPerfil(id, esMia) {
    const lista = esMia ? todasMisRecetas : todasRecetasGuardadas;
    let receta = lista.find(r => r.id == id);
    if (!receta) return;

    // Cargar comentarios
    const comentarios = await Storage.getComentarios(id);
    const user = Storage.getCurrentUser();

    const colores = [
        'linear-gradient(135deg, #2d6a4f, #40916c)',
        'linear-gradient(135deg, #e07a5f, #f4a261)',
        'linear-gradient(135deg, #264653, #2a9d8f)',
        'linear-gradient(135deg, #6d597a, #b56576)',
    ];
    const bgColor = colores[parseInt(receta.id) % colores.length];

    // Crear o reutilizar overlay
    let overlay = document.getElementById('recetaModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'recetaModal';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrarModalDetalle();
        });
    }

    const imagenHTML = receta.imagen
        ? `<img src="${receta.imagen.startsWith('http') ? receta.imagen : 'http://localhost:3000' + receta.imagen}" alt="${receta.titulo}" class="modal-hero__img">`
        : `<div class="modal-hero__placeholder" style="background:${bgColor}">🥗</div>`;

    const ingHTML = (receta.ingredientes || []).map(i => `<li class="modal-ingredient">${i}</li>`).join('');

    const promedio = parseFloat(receta.promedioEstrellas) || 0;
    let starsHTML = '<div class="modal-stars" id="modalStars">';
    for (let i = 1; i <= 5; i++) {
        const cls = i <= Math.floor(promedio) ? 'star--filled' : 'star--empty';
        starsHTML += `<span class="star star--interactive ${cls}" onclick="valorarDesdePerfilM(${receta.id}, ${i})"><i data-lucide="star" class="${i <= Math.floor(promedio) ? 'lucide-star-filled' : ''}"></i></span>`;
    }
    starsHTML += `<span class="modal-stars__avg" id="modalStarsAvg">${promedio > 0 ? promedio.toFixed(1) + ' <i data-lucide="star" class="lucide-star-filled" style="width:14px;height:14px;"></i>' : 'Sin valoraciones'}</span></div>`;

    const comHTML = comentarios.map(c => {
        const inicial = c.usuarioNombre ? c.usuarioNombre.charAt(0).toUpperCase() : '?';
        const fecha = new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        const deleteBtn = (user && (c.usuarioId == user.id || user.rol === 'admin'))
            ? `<button class="comment-delete" onclick="eliminarComPerf(${c.id}, ${receta.id})" title="Eliminar">✕</button>`
            : '';
        return `
            <div class="comment" id="comment-${c.id}">
                <div class="comment__avatar">${inicial}</div>
                <div class="comment__body">
                    <div class="comment__header">
                        <span class="comment__author">${c.usuarioNombre}</span>
                        <span class="comment__date">${fecha}</span>
                        ${deleteBtn}
                    </div>
                    <p class="comment__text">${c.texto}</p>
                </div>
            </div>
        `;
    }).join('');

    const commentForm = user ? `
        <form class="comment-form" id="commentForm" onsubmit="enviarComPerf(event, ${receta.id})">
            <div class="comment-form__avatar">${user.nombre.charAt(0).toUpperCase()}</div>
            <input type="text" class="comment-form__input" id="commentInput" placeholder="Escribe un comentario..." required>
            <button type="submit" class="comment-form__btn">Enviar</button>
        </form>
    ` : `<p class="comment-login-msg"><a href="login.html">Inicia sesión</a> para comentar</p>`;

    const editarBtns = esMia ? `
        <div style="display:flex; gap:10px; margin-top:12px;">
            <button class="btn-secondary btn-small" onclick="cerrarModalDetalle(); abrirModalEditar('${receta.id}', '${(receta.titulo||'').replace(/'/g, "\\'")}')"><i data-lucide="edit-3"></i> Editar</button>
            <button class="btn-danger btn-small" onclick="cerrarModalDetalle(); eliminarReceta('${receta.id}')"><i data-lucide="trash-2"></i> Eliminar</button>
        </div>` : '';

    overlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="cerrarModalDetalle()">✕</button>
            <div class="modal-hero">${imagenHTML}</div>
            <div class="modal-body">
                <div class="modal-header">
                    <div class="modal-author" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: rgba(0,0,0,0.03); padding: 10px 15px; border-radius: 50px; width: fit-content; cursor: pointer;" onclick="window.location.href='usuario.html?id=${receta.autorId}'">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #2d6a4f; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                            ${receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style="font-weight: 600; color: #1b4332; font-size: 0.95rem;">${receta.autorNombre}</span>
                    </div>
                    <span class="modal-category">${receta.categoria}</span>
                    <h2 class="modal-title">${receta.titulo}</h2>
                    <div class="modal-meta-row">
                        <span><i data-lucide="clock"></i> ${receta.tiempo || '—'}</span>
                        <span><i data-lucide="bar-chart"></i> ${receta.dificultad || '—'}</span>
                        <span><i data-lucide="heart"></i> ${receta.likes || 0} likes</span>
                        <span><i data-lucide="message-square"></i> ${comentarios.length} comentarios</span>
                    </div>
                    ${starsHTML}
                    ${editarBtns}
                </div>
                <div class="modal-section">
                    <h3 class="modal-section__title"><i data-lucide="file-text"></i> Descripción</h3>
                    <p class="modal-section__text">${receta.descripcion}</p>
                </div>
                <div class="modal-section">
                    <h3 class="modal-section__title"><i data-lucide="shopping-bag"></i> Ingredientes</h3>
                    <ul class="modal-ingredients-list">${ingHTML || '<li>No especificados</li>'}</ul>
                </div>
                <div class="modal-section">
                    <h3 class="modal-section__title"><i data-lucide="chef-hat"></i> Instrucciones</h3>
                    <p class="modal-section__text modal-section__text--instructions">${receta.instrucciones || 'No especificadas'}</p>
                </div>
                <div class="modal-section modal-comments-section">
                    <h3 class="modal-section__title"><i data-lucide="message-circle"></i> Comentarios (${comentarios.length})</h3>
                    ${commentForm}
                    <div class="comments-list" id="commentsList">
                        ${comHTML || '<p class="comments-empty">Sé el primero en comentar <i data-lucide="party-popper"></i></p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.classList.add('modal-overlay--visible');
    document.body.style.overflow = 'hidden';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function cerrarModalDetalle() {
    const overlay = document.getElementById('recetaModal');
    if (overlay) {
        overlay.classList.remove('modal-overlay--visible');
        document.body.style.overflow = '';
    }
}

async function valorarDesdePerfilM(recetaId, estrellas) {
    if (!Storage.isLoggedIn()) return alert('Debes iniciar sesión para valorar.');
    const result = await Storage.calificar(recetaId, estrellas);
    const stars = document.querySelectorAll('#modalStars .star--interactive');
    stars.forEach((s, i) => {
        s.classList.remove('star--user-filled', 'star--filled', 'star--empty');
        s.classList.add(i < estrellas ? 'star--user-filled' : 'star--empty');
    });
    if (result.promedio !== undefined) {
        const avg = document.getElementById('modalStarsAvg');
        if (avg) avg.textContent = parseFloat(result.promedio).toFixed(1) + ' ⭐';
    }
}

async function enviarComPerf(event, recetaId) {
    event.preventDefault();
    const input = document.getElementById('commentInput');
    const texto = input.value.trim();
    if (!texto) return;
    const btn = event.target.querySelector('.comment-form__btn');
    btn.disabled = true; btn.textContent = '...';
    const result = await Storage.addComentario(recetaId, texto);
    if (result.success) {
        input.value = '';
        const list = document.getElementById('commentsList');
        const emptyMsg = list.querySelector('.comments-empty');
        if (emptyMsg) emptyMsg.remove();
        const user = Storage.getCurrentUser();
        const div = document.createElement('div');
        div.className = 'comment comment--new';
        div.id = `comment-${result.id || Date.now()}`;
        div.innerHTML = `
            <div class="comment__avatar">${user.nombre.charAt(0).toUpperCase()}</div>
            <div class="comment__body">
                <div class="comment__header">
                    <span class="comment__author">${user.nombre}</span>
                    <span class="comment__date">${new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <button class="comment-delete" onclick="eliminarComPerf(${result.id || 0}, ${recetaId})">✕</button>
                </div>
                <p class="comment__text">${texto}</p>
            </div>
        `;
        list.prepend(div);
    } else { alert('Error al enviar comentario.'); }
    btn.disabled = false; btn.textContent = 'Enviar';
}

async function eliminarComPerf(commentId, recetaId) {
    if (!confirm('¿Eliminar este comentario?')) return;
    await fetch(`http://localhost:3000/api/comentarios/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Storage.getToken()}` }
    });
    const el = document.getElementById(`comment-${commentId}`);
    if (el) el.remove();
}

// Escape para cerrar modal de detalles
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModalDetalle();
});

function configurarTabs() {
    const tabs = document.querySelectorAll('.perfil-tab');
    const panels = document.querySelectorAll('.perfil-tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todos
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => {
                p.classList.remove('perfil-tab-panel--active');
                // Si tiene estilo grid (recetas), ocultarlo con none
                if (p.style.gridTemplateColumns) {
                    p.style.display = 'none';
                } else {
                    p.style.display = 'none';
                }
            });

            // Activar seleccionado
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('perfil-tab-panel--active');
                // Si es panel de recetas, mostrar como grid; si es cuenta, como block
                if (targetPanel.style.gridTemplateColumns) {
                    targetPanel.style.display = 'grid';
                } else {
                    targetPanel.style.display = 'block';
                }
            }
        });
    });
}

async function eliminarReceta(recipeId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
        await Storage.deleteRecipe(recipeId);
        await refrescarPerfil();
    }
}

function configurarFormularios() {
    const perfilForm = document.getElementById('perfilForm');
    if (perfilForm) {
        perfilForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = prompt('Para guardar los cambios, ingresa tu contraseña actual:');
            if (!currentPassword) return;

            const formData = {
                nombre: document.getElementById('inputNombre').value,
                email: document.getElementById('inputEmail').value,
                currentPassword: currentPassword
            };

            const newPass = document.getElementById('inputNewPassword').value;
            if (newPass) formData.newPassword = newPass;

            const res = await Storage.updateProfile(formData);
            if (res.success) {
                alert('Perfil actualizado correctamente.');
                await refrescarPerfil();
            } else {
                alert('Error: ' + res.message);
            }
        });
    }

    const editRecipeForm = document.getElementById('editRecipeForm');
    if (editRecipeForm) {
        editRecipeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editRecipeId').value;
            const formData = new FormData();
            formData.append('titulo', document.getElementById('editRecipeTitulo').value);
            formData.append('descripcion', document.getElementById('editRecipeDesc').value);
            // Mantenemos otros campos igual (simplificado para esta prueba)
            
            const res = await Storage.updateRecipe(id, formData);
            if (res.success) {
                cerrarModal();
                await refrescarPerfil();
            } else {
                alert('Error al actualizar receta');
            }
        });
    }
}

function abrirModalEditar(id, titulo, desc) {
    const modal = document.getElementById('modalEditar');
    if (!modal) return;
    
    document.getElementById('editRecipeId').value = id;
    document.getElementById('editRecipeTitulo').value = titulo;
    document.getElementById('editRecipeDesc').value = desc;
    
    modal.style.display = 'block';
}

function cerrarModal() {
    const modal = document.getElementById('modalEditar');
    if (modal) modal.style.display = 'none';
}

function cerrarSesionPerfil() {
    Storage.logout();
    window.location.href = 'index.html';
}

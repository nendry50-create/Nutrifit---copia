/* ===== FEED DE RECETAS — NutriFit ===== */

let categoriaActual = 'todas';
let busquedaActual = '';
let recetasCache = []; // Cache para acceso rápido desde el modal

document.addEventListener('DOMContentLoaded', () => {
    cargarRecetas();

    const searchInput = document.getElementById('feedSearch');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                busquedaActual = e.target.value.trim().toLowerCase();
                cargarRecetas();
            }, 300);
        });
    }

    document.querySelectorAll('.feed-sidebar__cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.feed-sidebar__cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            categoriaActual = btn.dataset.categoria;
            cargarRecetas();
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Cerrar modal al hacer click fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            cerrarModal();
        }
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal();
    });
});

async function cargarRecetas() {
    const grid = document.getElementById('feedGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="feed-empty" style="grid-column:1/-1;">
            <div class="modal-loading__spinner"></div>
            <p style="margin-top:16px; color:#888;">Cargando recetas...</p>
        </div>`;

    try {
        recetasCache = await Storage.getRecipes(categoriaActual, busquedaActual);

        if (recetasCache.length === 0) {
            grid.innerHTML = `
                <div class="feed-empty">
                    <div class="feed-empty__icon"><i data-lucide="utensils" style="width:64px;height:64px;"></i></div>
                    <h3 class="feed-empty__title">No se encontraron recetas</h3>
                    <p class="feed-empty__text">Intenta con otra búsqueda o categoría</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        grid.innerHTML = recetasCache.map((receta, i) => crearTarjetaReceta(receta, i)).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Error cargando recetas:', err);
        grid.innerHTML = `
            <div class="feed-empty">
                <div class="feed-empty__icon"><i data-lucide="alert-circle" style="width:64px;height:64px;"></i></div>
                <h3 class="feed-empty__title">Error al cargar recetas</h3>
                <p class="feed-empty__text">Verifica que el servidor esté encendido</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

const categoriaMap = {
    'ensaladas': '<i data-lucide="leaf"></i> Ensaladas',
    'bebidas': '<i data-lucide="cup-soda"></i> Bebidas',
    'platos-principales': '<i data-lucide="utensils"></i> Platos',
    'desayunos': '<i data-lucide="coffee"></i> Desayunos',
    'postres': '<i data-lucide="cake"></i> Postres',
    'sopas': '<i data-lucide="soup"></i> Sopas',
    'snacks': '<i data-lucide="cookie"></i> Snacks'
};

const colores = [
    'linear-gradient(135deg, #2d6a4f, #40916c)',
    'linear-gradient(135deg, #e07a5f, #f4a261)',
    'linear-gradient(135deg, #264653, #2a9d8f)',
    'linear-gradient(135deg, #6d597a, #b56576)',
    'linear-gradient(135deg, #bc6c25, #dda15e)',
    'linear-gradient(135deg, #023e8a, #0077b6)'
];

// ===== GENERAR ESTRELLAS (solo lectura) =====
function generarEstrellas(promedio, size = '1rem') {
    let html = `<div class="stars-display" style="font-size:${size}">`;
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(promedio)) {
            html += '<i data-lucide="star" class="lucide-star-filled" style="width:0.9em;height:0.9em;"></i>';
        } else if (i - 0.5 <= promedio) {
            html += '<i data-lucide="star-half" class="lucide-star-filled" style="width:0.9em;height:0.9em;"></i>';
        } else {
            html += '<i data-lucide="star" style="width:0.9em;height:0.9em;color:#ccc;"></i>';
        }
    }
    html += '</div>';
    return html;
}

// ===== TARJETA DE RECETA =====
function crearTarjetaReceta(receta, index = 0) {
    const user = Storage.getCurrentUser();
    const inicial = receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?';
    const bgColor = colores[parseInt(receta.id) % colores.length];

    const imagenHTML = receta.imagen
        ? `<img src="${receta.imagen.startsWith('http') ? receta.imagen : 'http://localhost:3000' + receta.imagen}" alt="${receta.titulo}">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bgColor};color:white;font-size:3rem;">🥗</div>`;

    const promedio = parseFloat(receta.promedioEstrellas) || 0;
    const totalComentarios = receta.totalComentarios || 0;

    return `
        <article class="recipe-card" style="animation-delay: ${index * 0.08}s" onclick="abrirModal(${receta.id})">
            <div class="recipe-card__image">
                ${imagenHTML}
                <span class="recipe-card__category">${categoriaMap[receta.categoria] || receta.categoria}</span>
                <div class="recipe-card__save" onclick="event.stopPropagation(); toggleLike(${receta.id})">
                    🤍
                </div>
            </div>
            <div class="recipe-card__body">
                <h3 class="recipe-card__title">${receta.titulo}</h3>
                <div class="recipe-card__rating">
                    ${generarEstrellas(promedio, '0.9rem')}
                    <span class="recipe-card__rating-text">${promedio > 0 ? promedio.toFixed(1) : 'Sin valorar'}</span>
                </div>
                <p class="recipe-card__desc">${receta.descripcion}</p>
                <div class="recipe-card__meta">
                    <div class="recipe-card__author">
                        <div class="recipe-card__author-avatar">${inicial}</div>
                        <a class="recipe-card__author-name" href="usuario.html?id=${receta.autorId}"
                           onclick="event.stopPropagation()">${receta.autorNombre}</a>
                    </div>
                    <div class="recipe-card__stats">
                        <span class="recipe-card__stat" onclick="event.stopPropagation(); toggleLike(${receta.id})">
                            <i data-lucide="heart"></i> ${receta.likes || 0}
                        </span>
                        <span class="recipe-card__stat"><i data-lucide="message-square"></i> ${totalComentarios}</span>
                        <span class="recipe-card__stat"><i data-lucide="clock"></i> ${receta.tiempo || '—'}</span>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// ===== MODAL DE DETALLE =====
async function abrirModal(recetaId) {
    let overlay = document.getElementById('recetaModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'recetaModal';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-loading">
                <div class="modal-loading__spinner"></div>
                <p>Cargando receta...</p>
            </div>
        </div>
    `;
    overlay.classList.add('modal-overlay--visible');
    document.body.style.overflow = 'hidden';

    try {
        // Cargar receta desde cache o buscar
        let receta = recetasCache.find(r => r.id == recetaId);
        if (!receta) {
            // Fallback: buscar en el servidor
            const res = await fetch(`http://localhost:3000/api/recetas?categoria=todas`);
            const todas = await res.json();
            receta = todas.find(r => r.id == recetaId);
        }

        const comentarios = await Storage.getComentarios(recetaId);
        renderModal(receta, comentarios);
    } catch (err) {
        overlay.querySelector('.modal-content').innerHTML = `
            <button class="modal-close" onclick="cerrarModal()">✕</button>
            <div class="modal-error">
                <p>⚠️ Error al cargar: ${err.message}</p>
            </div>
        `;
    }
}

async function renderModal(receta, comentarios) {
    if (!receta) {
        cerrarModal();
        return;
    }

    const user = Storage.getCurrentUser();
    const userId = user ? user.id : null;
    const bgColor = colores[parseInt(receta.id) % colores.length];
    const promedio = parseFloat(receta.promedioEstrellas) || 0;
    const userRating = receta.userRating || 0;

    const imagenHTML = receta.imagen
        ? `<img src="${receta.imagen.startsWith('http') ? receta.imagen : 'http://localhost:3000' + receta.imagen}" alt="${receta.titulo}" class="modal-hero__img">`
        : `<div class="modal-hero__placeholder" style="background:${bgColor}">🥗</div>`;

    // Estrellas interactivas
    let starsHTML = '<div class="modal-stars" id="modalStars">';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= userRating ? 'star--user-filled' : (i <= Math.floor(promedio) ? 'star--filled' : 'star--empty');
        const icon = i <= userRating || i <= Math.floor(promedio) ? 'star' : 'star';
        starsHTML += `<span class="star star--interactive ${filled}" data-value="${i}" onclick="valorarReceta(${receta.id}, ${i})"><i data-lucide="${icon}"></i></span>`;
    }
    starsHTML += `<span class="modal-stars__avg" id="modalStarsAvg">${promedio > 0 ? promedio.toFixed(1) + ' <i data-lucide="star" class="lucide-star-filled" style="width:14px;height:14px;"></i>' : 'Sin valoraciones'}</span>`;
    starsHTML += '</div>';

    // Ingredientes
    const ingHTML = (receta.ingredientes || []).map(i => `<li class="modal-ingredient">${i}</li>`).join('');

    // Comentarios HTML
    const comHTML = await Promise.all(comentarios.map(async c => {
        const inicial = c.usuarioNombre ? c.usuarioNombre.charAt(0).toUpperCase() : '?';
        const fecha = new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        const deleteBtn = (user && (c.usuarioId == user.id || user.rol === 'admin'))
            ? `<button class="comment-delete" onclick="eliminarComentario(${c.id}, ${receta.id})" title="Eliminar">✕</button>`
            : '';

        // Cargar respuestas
        const respuestas = await Storage.getRespuestas(c.id);
        const respuestasHTML = respuestas.map(r => {
            const ri = r.usuarioNombre ? r.usuarioNombre.charAt(0).toUpperCase() : '?';
            const rf = new Date(r.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' });
            const rDel = (user && (r.usuarioId == user.id || user.rol === 'admin'))
                ? `<button class="comment-delete" onclick="eliminarRespFeed(${r.id})">✕</button>`
                : '';
            return `
                <div class="comment" id="resp-${r.id}" style="margin-top:10px; padding-left:46px;">
                    <div class="comment__avatar" style="width:28px;height:28px;font-size:0.65rem;">${ri}</div>
                    <div class="comment__body">
                        <div class="comment__header">
                            <span class="comment__author">${r.usuarioNombre}</span>
                            <span class="comment__date">${rf}</span>
                            ${rDel}
                        </div>
                        <p class="comment__text">${r.texto}</p>
                    </div>
                </div>
            `;
        }).join('');

        const respForm = user ? `
            <div style="padding-left:46px; margin-top:8px;">
                <form onsubmit="enviarRespFeed(event, ${c.id})" style="display:flex; gap:8px;">
                    <input type="text" placeholder="Responder..." class="comment-form__input" style="flex:1; padding:6px 12px; font-size:0.82rem;" required>
                    <button type="submit" class="comment-form__btn" style="padding:6px 14px; font-size:0.8rem;">↩ Responder</button>
                </form>
            </div>` : '';

        return `
            <div class="comment" id="comment-${c.id}">
                <div class="comment__avatar">${inicial}</div>
                <div class="comment__body" style="flex:1;">
                    <div class="comment__header">
                        <span class="comment__author">${c.usuarioNombre}</span>
                        <span class="comment__date">${fecha}</span>
                        ${deleteBtn}
                    </div>
                    <p class="comment__text">${c.texto}</p>
                    <div id="respuestas-${c.id}">${respuestasHTML}</div>
                    ${respForm}
                </div>
            </div>
        `;
    }));

    // Formulario de comentario
    const commentForm = user ? `
        <form class="comment-form" id="commentForm" onsubmit="enviarComentario(event, ${receta.id})">
            <div class="comment-form__avatar">${user.nombre.charAt(0).toUpperCase()}</div>
            <input type="text" class="comment-form__input" id="commentInput" placeholder="Escribe un comentario..." required>
            <button type="submit" class="comment-form__btn">Enviar</button>
        </form>
    ` : `<p class="comment-login-msg"><a href="login.html">Inicia sesión</a> para comentar</p>`;

    // Botón like grande en modal
    const likeBtn = user ? `
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="toggleLike(${receta.id})" style="background:#fff1f2; color:#e11d48; border:2px solid #fecdd3; padding:8px 20px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.9rem; transition:all 0.2s;">
                ❤️ Me gusta (<span id="modalLikeCount">${receta.likes || 0}</span>)
            </button>
            ${(user.rol === 'admin' || user.id == receta.autorId) ? `
                <button onclick="eliminarRecetaFeed(${receta.id})" style="background:#fef2f2; color:#b91c1c; border:2px solid #fee2e2; padding:8px 20px; border-radius:30px; font-weight:600; cursor:pointer; font-size:0.9rem; transition:all 0.2s;">
                    <i data-lucide="trash-2" style="width:16px; height:16px;"></i> Eliminar Receta
                </button>
            ` : ''}
        </div>
    ` : '';

    const overlay = document.getElementById('recetaModal');
    overlay.querySelector('.modal-content').innerHTML = `
        <button class="modal-close" onclick="cerrarModal()">✕</button>

        <div class="modal-hero">
            ${imagenHTML}
        </div>

        <div class="modal-body">
            <div class="modal-header">
                <div class="modal-author" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: rgba(0,0,0,0.03); padding: 10px 15px; border-radius: 50px; width: fit-content; cursor: pointer;" onclick="window.location.href='usuario.html?id=${receta.autorId}'">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #2d6a4f; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                        ${receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span style="font-weight: 600; color: #1b4332; font-size: 0.95rem;">${receta.autorNombre}</span>
                </div>
                <span class="modal-category">${categoriaMap[receta.categoria] || receta.categoria}</span>
                <h2 class="modal-title">${receta.titulo}</h2>
                <div class="modal-meta-row">
                    <span><i data-lucide="clock"></i> ${receta.tiempo || '—'}</span>
                    <span><i data-lucide="bar-chart"></i> ${receta.dificultad || '—'}</span>
                    <span><i data-lucide="heart"></i> <span id="modalLikeCount">${receta.likes || 0}</span> likes</span>
                    <span><i data-lucide="message-square"></i> ${comentarios.length} comentarios</span>
                </div>
                ${starsHTML}
                ${likeBtn}
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
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function cerrarModal() {
    const overlay = document.getElementById('recetaModal');
    if (overlay) {
        overlay.classList.remove('modal-overlay--visible');
        document.body.style.overflow = '';
    }
}

// ===== VALORAR RECETA CON ESTRELLAS =====
async function valorarReceta(recetaId, estrellas) {
    if (!Storage.isLoggedIn()) {
        alert('Debes iniciar sesión para valorar.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const result = await Storage.calificar(recetaId, estrellas);

        // Actualizar estrellas en el modal
        const starsContainer = document.getElementById('modalStars');
        if (starsContainer) {
            const stars = starsContainer.querySelectorAll('.star--interactive');
            stars.forEach((star, i) => {
                star.classList.remove('star--user-filled', 'star--filled', 'star--empty');
                star.classList.add(i < estrellas ? 'star--user-filled' : 'star--empty');
            });
            const avgSpan = document.getElementById('modalStarsAvg');
            if (avgSpan && result.promedio !== undefined) {
                avgSpan.textContent = parseFloat(result.promedio).toFixed(1) + ' ⭐';
            }
        }

        // Actualizar cache
        const cached = recetasCache.find(r => r.id == recetaId);
        if (cached && result.promedio !== undefined) {
            cached.promedioEstrellas = result.promedio;
            cached.userRating = estrellas;
        }
    } catch (err) {
        alert('Error al valorar: ' + err.message);
    }
}

// ===== COMENTARIOS =====
async function enviarComentario(event, recetaId) {
    event.preventDefault();
    const input = document.getElementById('commentInput');
    const texto = input.value.trim();
    if (!texto) return;

    const btn = event.target.querySelector('.comment-form__btn');
    btn.disabled = true;
    btn.textContent = '...';

    try {
        const result = await Storage.addComentario(recetaId, texto);
        input.value = '';

        const list = document.getElementById('commentsList');
        const emptyMsg = list.querySelector('.comments-empty');
        if (emptyMsg) emptyMsg.remove();

        const user = Storage.getCurrentUser();
        const inicial = user.nombre.charAt(0).toUpperCase();
        const fecha = new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        const comentarioId = result.id || Date.now();

        const div = document.createElement('div');
        div.className = 'comment comment--new';
        div.id = `comment-${comentarioId}`;
        div.innerHTML = `
            <div class="comment__avatar">${inicial}</div>
            <div class="comment__body">
                <div class="comment__header">
                    <span class="comment__author">${user.nombre}</span>
                    <span class="comment__date">${fecha}</span>
                    ${(user && (user.id == userId || user.rol === 'admin')) ? `<button class="comment-delete" onclick="eliminarComentario(${comentarioId}, ${recetaId})" title="Eliminar">✕</button>` : ''}
                </div>
                <p class="comment__text">${texto}</p>
            </div>
        `;
        list.prepend(div);
    } catch (err) {
        alert('Error: ' + err.message);
    }

    btn.disabled = false;
    btn.textContent = 'Enviar';
}

async function eliminarComentario(commentId, recetaId) {
    if (!confirm('¿Eliminar este comentario?')) return;
    try {
        await fetch(`http://localhost:3000/api/comentarios/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${Storage.getToken()}` }
        });
        const el = document.getElementById(`comment-${commentId}`);
        if (el) {
            el.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => el.remove(), 300);
        }
    } catch (err) {
        alert('Error al eliminar comentario.');
    }
}

// ===== LIKE =====
async function toggleLike(recipeId) {
    if (!Storage.isLoggedIn()) {
        alert('Debes iniciar sesión para dar like.');
        window.location.href = 'login.html';
        return;
    }
    try {
        const result = await Storage.toggleLike(recipeId);
        await cargarRecetas();
        const likeCount = document.getElementById('modalLikeCount');
        if (likeCount && result) { /* actualizado */ }
    } catch (err) {
        console.error('Error en like:', err);
    }
}

// ===== RESPUESTAS A COMENTARIOS =====
async function enviarRespFeed(event, comentarioId) {
    event.preventDefault();
    const input = event.target.querySelector('input');
    const texto = input.value.trim();
    if (!texto) return;
    const btn = event.target.querySelector('button');
    btn.disabled = true; btn.textContent = '...';

    const result = await Storage.addRespuesta(comentarioId, texto);
    if (result.success) {
        input.value = '';
        const user = Storage.getCurrentUser();
        const container = document.getElementById(`respuestas-${comentarioId}`);
        if (container) {
            const div = document.createElement('div');
            div.className = 'comment comment--new';
            div.id = `resp-${result.id}`;
            div.style = 'margin-top:10px; padding-left:46px;';
            div.innerHTML = `
                <div class="comment__avatar" style="width:28px;height:28px;font-size:0.65rem;">${user.nombre.charAt(0).toUpperCase()}</div>
                <div class="comment__body">
                    <div class="comment__header">
                        <span class="comment__author">${user.nombre}</span>
                        <span class="comment__date">${new Date().toLocaleDateString('es', {day:'numeric', month:'short'})}</span>
                        <button class="comment-delete" onclick="eliminarRespFeed(${result.id})">✕</button>
                    </div>
                    <p class="comment__text">${texto}</p>
                </div>
            `;
            container.appendChild(div);
        }
    } else {
        alert('Error al enviar respuesta.');
    }
    btn.disabled = false; btn.textContent = '↩ Responder';
}

async function eliminarRespFeed(respuestaId) {
    if (!confirm('¿Eliminar esta respuesta?')) return;
    await Storage.deleteRespuesta(respuestaId);
    const el = document.getElementById(`resp-${respuestaId}`);
    if (el) {
        el.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }
}

async function eliminarRecetaFeed(recetaId) {
    if (!confirm('¿Estás seguro de eliminar esta receta? Esta acción no se puede deshacer.')) return;
    try {
        const res = await Storage.deleteRecipe(recetaId);
        if (res.success || !res.error) {
            cerrarModal();
            // Buscar la card y eliminarla
            const cards = document.querySelectorAll('.recipe-card');
            cards.forEach(card => {
                if (card.getAttribute('onclick')?.includes(`abrirModal(${recetaId})`) || 
                    card.getAttribute('onclick')?.includes(`verRecetaPerfil('${recetaId}'`)) {
                    card.remove();
                }
            });
            alert('Receta eliminada correctamente.');
        } else {
            alert('Error: ' + res.error);
        }
    } catch (err) { alert('Error de conexión'); }
}
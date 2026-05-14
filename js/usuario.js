/* ===== PERFIL PÚBLICO DE USUARIO ===== */

const coloresUsr = [
    'linear-gradient(135deg, #2d6a4f, #40916c)',
    'linear-gradient(135deg, #e07a5f, #f4a261)',
    'linear-gradient(135deg, #264653, #2a9d8f)',
    'linear-gradient(135deg, #6d597a, #b56576)',
    'linear-gradient(135deg, #bc6c25, #dda15e)',
    'linear-gradient(135deg, #023e8a, #0077b6)'
];

const categoriaMapUsr = {
    'ensaladas': '<i data-lucide="leaf"></i> Ensaladas',
    'bebidas': '<i data-lucide="cup-soda"></i> Bebidas',
    'platos-principales': '<i data-lucide="utensils"></i> Platos',
    'desayunos': '<i data-lucide="coffee"></i> Desayunos',
    'postres': '<i data-lucide="cake"></i> Postres',
    'sopas': '<i data-lucide="soup"></i> Sopas',
    'snacks': '<i data-lucide="cookie"></i> Snacks'
};

let recetasUsuario = [];

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        window.location.href = 'feed.html';
        return;
    }

    const currentUser = Storage.getCurrentUser();

    // Si es mi propio perfil, redirigir
    if (currentUser && currentUser.id == userId) {
        window.location.href = 'perfil.html';
        return;
    }

    const data = await Storage.getUsuarioPerfil(userId);
    if (!data || data.error) {
        document.getElementById('usuarioCargando').innerHTML = `
            <div style="font-size:3rem;"><i data-lucide="user-x"></i></div>
            <p>No se encontró este usuario.</p>
            <a href="feed.html" class="btn-primary" style="margin-top:16px;display:inline-block;">Volver al feed</a>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    recetasUsuario = data.recetas || [];

    // Llenar datos del perfil
    const inicial = data.usuario.nombre.charAt(0).toUpperCase();
    document.getElementById('usuarioAvatar').textContent = inicial;
    document.getElementById('usuarioNombre').textContent = data.usuario.nombre;
    document.title = `${data.usuario.nombre} — NutriFit`;

    const fechaReg = new Date(data.usuario.fechaRegistro).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    document.getElementById('usuarioMiembro').textContent = `Miembro desde ${fechaReg}`;

    document.getElementById('statRecetas').textContent = recetasUsuario.length;
    document.getElementById('statSeguidores').textContent = data.seguidores;
    document.getElementById('statSiguiendo').textContent = data.siguiendo;

    // Botón seguir (solo si está logueado y no es su propio perfil)
    const accionesDiv = document.getElementById('accionesSeguir');
    if (currentUser) {
        const checkRes = await Storage.checkSiguiendo(userId);
        const estaSiguiendo = checkRes.siguiendo;

        accionesDiv.innerHTML = `
            <button id="btnSeguir" class="${estaSiguiendo ? 'siguiendo' : 'no-siguiendo'}"
                    onclick="toggleSeguir(${userId})">
                ${estaSiguiendo ? '✓ Siguiendo' : '+ Seguir'}
            </button>
        `;
    }

    // Mostrar recetas
    const grid = document.getElementById('usuarioGrid');
    if (recetasUsuario.length === 0) {
        grid.innerHTML = `
            <div class="feed-empty" style="grid-column:1/-1;">
                <div class="feed-empty__icon"><i data-lucide="inbox" style="width:64px;height:64px;"></i></div>
                <h3 class="feed-empty__title">Sin recetas publicadas</h3>
                <p class="feed-empty__text">Este usuario aún no ha compartido recetas.</p>
            </div>
        `;
    } else {
        grid.innerHTML = recetasUsuario.map((r, i) => crearTarjetaUsuario(r, i)).join('');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Ocultar loader y mostrar contenido
    document.getElementById('usuarioCargando').style.display = 'none';
    document.getElementById('usuarioContenido').style.display = 'block';

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModalUsuario();
    });
    document.addEventListener('click', (e) => {
        if (e.target.id === 'recetaModalUsr') cerrarModalUsuario();
    });
});

function crearTarjetaUsuario(receta, index) {
    const bgColor = coloresUsr[parseInt(receta.id) % coloresUsr.length];
    const inicial = receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?';
    const promedio = parseFloat(receta.promedioEstrellas) || 0;

    const imagenHTML = receta.imagen
        ? `<img src="${receta.imagen.startsWith('http') ? receta.imagen : 'http://localhost:3000' + receta.imagen}" alt="${receta.titulo}">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bgColor};color:white;font-size:3rem;">🥗</div>`;

    return `
        <article class="recipe-card" style="animation-delay:${index * 0.07}s" onclick="abrirModalUsuario(${receta.id})">
            <div class="recipe-card__image">
                ${imagenHTML}
                <span class="recipe-card__category">${categoriaMapUsr[receta.categoria] || receta.categoria}</span>
            </div>
            <div class="recipe-card__body">
                <h3 class="recipe-card__title">${receta.titulo}</h3>
                <div class="recipe-card__rating">
                    <span style="color:#f4a261; font-size:0.9rem;">★</span>
                    <span class="recipe-card__rating-text">${promedio > 0 ? promedio.toFixed(1) : 'Sin valorar'}</span>
                </div>
                <p class="recipe-card__desc">${receta.descripcion}</p>
                <div class="recipe-card__meta">
                    <div class="recipe-card__stats">
                        <span class="recipe-card__stat"><i data-lucide="heart"></i> ${receta.likes || 0}</span>
                        <span class="recipe-card__stat"><i data-lucide="message-square"></i> ${receta.totalComentarios || 0}</span>
                        <span class="recipe-card__stat"><i data-lucide="clock"></i> ${receta.tiempo || '—'}</span>
                    </div>
                </div>
            </div>
        </article>
    `;
}

async function abrirModalUsuario(recetaId) {
    const receta = recetasUsuario.find(r => r.id == recetaId);
    if (!receta) return;

    const comentarios = await Storage.getComentarios(recetaId);
    const user = Storage.getCurrentUser();
    const bgColor = coloresUsr[parseInt(receta.id) % coloresUsr.length];

    let overlay = document.getElementById('recetaModalUsr');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'recetaModalUsr';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    const imagenHTML = receta.imagen
        ? `<img src="${receta.imagen.startsWith('http') ? receta.imagen : 'http://localhost:3000' + receta.imagen}" alt="${receta.titulo}" class="modal-hero__img">`
        : `<div class="modal-hero__placeholder" style="background:${bgColor}">🥗</div>`;

    const ingHTML = (receta.ingredientes || []).map(i => `<li class="modal-ingredient">${i}</li>`).join('');

    const promedio = parseFloat(receta.promedioEstrellas) || 0;
    let starsHTML = '<div class="modal-stars" id="modalStarsUsr">';
    for (let i = 1; i <= 5; i++) {
        const cls = i <= Math.floor(promedio) ? 'star--filled' : 'star--empty';
        starsHTML += `<span class="star star--interactive ${cls}" onclick="valorarRecetaUsr(${receta.id}, ${i})"><i data-lucide="star" class="${i <= Math.floor(promedio) ? 'lucide-star-filled' : ''}"></i></span>`;
    }
    starsHTML += `<span class="modal-stars__avg" id="modalStarsAvgUsr">${promedio > 0 ? promedio.toFixed(1) + ' <i data-lucide="star" class="lucide-star-filled" style="width:14px;height:14px;"></i>' : 'Sin valoraciones'}</span></div>`;

    const comHTML = await renderComentariosConRespuestas(comentarios, user);
    const commentForm = user ? `
        <form class="comment-form" id="commentFormUsr" onsubmit="enviarComUsr(event, ${receta.id})">
            <div class="comment-form__avatar">${user.nombre.charAt(0).toUpperCase()}</div>
            <input type="text" class="comment-form__input" id="commentInputUsr" placeholder="Escribe un comentario..." required>
            <button type="submit" class="comment-form__btn">Enviar</button>
        </form>
    ` : `<p class="comment-login-msg"><a href="login.html">Inicia sesión</a> para comentar</p>`;

    overlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="cerrarModalUsuario()">✕</button>
            <div class="modal-hero">${imagenHTML}</div>
            <div class="modal-body">
                <div class="modal-header">
                    <div class="modal-author" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: rgba(0,0,0,0.03); padding: 10px 15px; border-radius: 50px; width: fit-content; cursor: pointer;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #2d6a4f; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                            ${receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style="font-weight: 600; color: #1b4332; font-size: 0.95rem;">${receta.autorNombre}</span>
                    </div>
                    <span class="modal-category">${categoriaMapUsr[receta.categoria] || receta.categoria}</span>
                    <h2 class="modal-title">${receta.titulo}</h2>
                    <div class="modal-meta-row">
                    <div class="modal-meta-row">
                        <span><i data-lucide="clock"></i> ${receta.tiempo || '—'}</span>
                        <span><i data-lucide="bar-chart"></i> ${receta.dificultad || '—'}</span>
                        <span><i data-lucide="heart"></i> ${receta.likes || 0} likes</span>
                        <span><i data-lucide="message-square"></i> ${comentarios.length} comentarios</span>
                    </div>
                    ${starsHTML}
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
                    <div class="comments-list" id="commentsListUsr">
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

async function renderComentariosConRespuestas(comentarios, user) {
    if (!comentarios || comentarios.length === 0) return '';

    const html = await Promise.all(comentarios.map(async (c) => {
        const inicial = c.usuarioNombre ? c.usuarioNombre.charAt(0).toUpperCase() : '?';
        const fecha = new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        const deleteBtn = (user && c.usuarioId == user.id)
            ? `<button class="comment-delete" onclick="eliminarComUsr(${c.id})" title="Eliminar">✕</button>`
            : '';

        const respuestas = await Storage.getRespuestas(c.id);
        const respuestasHTML = respuestas.map(r => {
            const ri = r.usuarioNombre ? r.usuarioNombre.charAt(0).toUpperCase() : '?';
            const rf = new Date(r.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' });
            const rDel = (user && r.usuarioId == user.id)
                ? `<button class="comment-delete" onclick="eliminarRespUsr(${r.id})" title="Eliminar">✕</button>`
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
                <form onsubmit="enviarRespUsr(event, ${c.id})" style="display:flex; gap:8px;">
                    <input type="text" placeholder="Responder..." class="comment-form__input" style="flex:1; padding:6px 12px; font-size:0.82rem;" required>
                    <button type="submit" class="comment-form__btn" style="padding:6px 14px; font-size:0.8rem;">↩ Responder</button>
                </form>
            </div>
        ` : '';

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
                    <div id="respuestas-${c.id}">
                        ${respuestasHTML}
                    </div>
                    ${respForm}
                </div>
            </div>
        `;
    }));

    return html.join('');
}

function cerrarModalUsuario() {
    const overlay = document.getElementById('recetaModalUsr');
    if (overlay) {
        overlay.classList.remove('modal-overlay--visible');
        document.body.style.overflow = '';
    }
}

async function valorarRecetaUsr(recetaId, estrellas) {
    if (!Storage.isLoggedIn()) return alert('Debes iniciar sesión para valorar.');
    const result = await Storage.calificar(recetaId, estrellas);
    const stars = document.querySelectorAll('#modalStarsUsr .star--interactive');
    stars.forEach((s, i) => {
        s.classList.remove('star--user-filled', 'star--filled', 'star--empty');
        s.classList.add(i < estrellas ? 'star--user-filled' : 'star--empty');
    });
    const avg = document.getElementById('modalStarsAvgUsr');
    if (avg && result.promedio !== undefined)
        avg.textContent = parseFloat(result.promedio).toFixed(1) + ' ⭐';
}

async function enviarComUsr(event, recetaId) {
    event.preventDefault();
    const input = document.getElementById('commentInputUsr');
    const texto = input.value.trim();
    if (!texto) return;
    const btn = event.target.querySelector('.comment-form__btn');
    btn.disabled = true; btn.textContent = '...';

    const result = await Storage.addComentario(recetaId, texto);
    if (result.success) {
        input.value = '';
        const list = document.getElementById('commentsListUsr');
        const emptyMsg = list.querySelector('.comments-empty');
        if (emptyMsg) emptyMsg.remove();
        const user = Storage.getCurrentUser();
        const div = document.createElement('div');
        div.className = 'comment comment--new';
        div.id = `comment-${result.id}`;
        div.innerHTML = `
            <div class="comment__avatar">${user.nombre.charAt(0).toUpperCase()}</div>
            <div class="comment__body" style="flex:1;">
                <div class="comment__header">
                    <span class="comment__author">${user.nombre}</span>
                    <span class="comment__date">${new Date().toLocaleDateString('es', {day:'numeric',month:'short'})}</span>
                    <button class="comment-delete" onclick="eliminarComUsr(${result.id})">✕</button>
                </div>
                <p class="comment__text">${texto}</p>
                <div id="respuestas-${result.id}"></div>
                <div style="padding-left:46px; margin-top:8px;">
                    <form onsubmit="enviarRespUsr(event, ${result.id})" style="display:flex; gap:8px;">
                        <input type="text" placeholder="Responder..." class="comment-form__input" style="flex:1; padding:6px 12px; font-size:0.82rem;" required>
                        <button type="submit" class="comment-form__btn" style="padding:6px 14px; font-size:0.8rem;">↩ Responder</button>
                    </form>
                </div>
            </div>
        `;
        list.prepend(div);
    }
    btn.disabled = false; btn.textContent = 'Enviar';
}

async function eliminarComUsr(commentId) {
    if (!confirm('¿Eliminar este comentario?')) return;
    await fetch(`http://localhost:3000/api/comentarios/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Storage.getToken()}` }
    });
    const el = document.getElementById(`comment-${commentId}`);
    if (el) el.remove();
}

async function enviarRespUsr(event, comentarioId) {
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
        const div = document.createElement('div');
        div.className = 'comment comment--new';
        div.id = `resp-${result.id}`;
        div.style = 'margin-top:10px; padding-left:46px;';
        div.innerHTML = `
            <div class="comment__avatar" style="width:28px;height:28px;font-size:0.65rem;">${user.nombre.charAt(0).toUpperCase()}</div>
            <div class="comment__body">
                <div class="comment__header">
                    <span class="comment__author">${user.nombre}</span>
                    <span class="comment__date">${new Date().toLocaleDateString('es', {day:'numeric',month:'short'})}</span>
                    <button class="comment-delete" onclick="eliminarRespUsr(${result.id})">✕</button>
                </div>
                <p class="comment__text">${texto}</p>
            </div>
        `;
        container.appendChild(div);
    }
    btn.disabled = false; btn.textContent = '↩ Responder';
}

async function eliminarRespUsr(respuestaId) {
    if (!confirm('¿Eliminar esta respuesta?')) return;
    await Storage.deleteRespuesta(respuestaId);
    const el = document.getElementById(`resp-${respuestaId}`);
    if (el) el.remove();
}

async function toggleSeguir(userId) {
    if (!Storage.isLoggedIn()) {
        alert('Debes iniciar sesión para seguir a este usuario.');
        window.location.href = 'login.html';
        return;
    }
    const btn = document.getElementById('btnSeguir');
    btn.disabled = true;
    const result = await Storage.seguirUsuario(userId);
    if (result.error) { alert(result.error); btn.disabled = false; return; }

    const ahora = result.siguiendo;
    btn.textContent = ahora ? '✓ Siguiendo' : '+ Seguir';
    btn.className = ahora ? 'siguiendo' : 'no-siguiendo';

    // Actualizar contador de seguidores
    const el = document.getElementById('statSeguidores');
    if (el) el.textContent = parseInt(el.textContent) + (ahora ? 1 : -1);
    btn.disabled = false;
}

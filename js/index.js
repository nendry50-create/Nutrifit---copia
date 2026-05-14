/* ===== PÁGINA DE INICIO ===== */

document.addEventListener('DOMContentLoaded', async () => {
    await cargarRecetasPopulares();
    animarAlEntrar();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

let popularesLocal = [];

async function cargarRecetasPopulares() {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;

    popularesLocal = await Storage.getRecipes();
    const recetas = popularesLocal.slice(0, 3);

    if (recetas.length === 0) {
        grid.innerHTML = `
            <div class="feed-empty" style="grid-column: 1 / -1;">
                <div class="feed-empty__icon"><i data-lucide="utensils" style="width:64px;height:64px;"></i></div>
                <h3 class="feed-empty__title">Aún no hay recetas</h3>
                <p class="feed-empty__text">¡Sé el primero en publicar una receta!</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const colores = [
        'linear-gradient(135deg, #2d6a4f, #40916c)',
        'linear-gradient(135deg, #e07a5f, #f4a261)',
        'linear-gradient(135deg, #264653, #2a9d8f)',
    ];

    const categoriaMap = {
        'ensaladas': '<i data-lucide="leaf"></i> Ensaladas',
        'bebidas': '<i data-lucide="cup-soda"></i> Bebidas',
        'platos-principales': '<i data-lucide="utensils"></i> Platos',
        'desayunos': '<i data-lucide="coffee"></i> Desayunos',
        'postres': '<i data-lucide="cake"></i> Postres',
        'sopas': '<i data-lucide="soup"></i> Sopas',
        'snacks': '<i data-lucide="cookie"></i> Snacks'
    };

    grid.innerHTML = recetas.map((receta, i) => {
        const bgColor = colores[i % colores.length];
        const inicial = receta.autorNombre ? receta.autorNombre.charAt(0).toUpperCase() : '?';
        const imagenHTML = receta.imagen
            ? `<img src="${receta.imagen}" alt="${receta.titulo}">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bgColor};color:white;font-size:3rem;">🥗</div>`;

        return `
            <article class="recipe-card" style="animation-delay: ${i * 0.1}s" onclick="verRecetaHome('${receta.id}')">
                <div class="recipe-card__image">
                    ${imagenHTML}
                    <span class="recipe-card__category">${categoriaMap[receta.categoria] || receta.categoria}</span>
                </div>
                <div class="recipe-card__body">
                    <h3 class="recipe-card__title">${receta.titulo}</h3>
                    <p class="recipe-card__desc">${receta.descripcion}</p>
                    <div class="recipe-card__meta">
                        <div class="recipe-card__author">
                            <div class="recipe-card__author-avatar">${inicial}</div>
                            <span class="recipe-card__author-name">${receta.autorNombre}</span>
                        </div>
                        <div class="recipe-card__stats">
                            <span class="recipe-card__stat"><i data-lucide="heart"></i> ${receta.likes || 0}</span>
                            <span class="recipe-card__stat"><i data-lucide="clock"></i> ${receta.tiempo || '—'}</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function verRecetaHome(id) {
    const receta = popularesLocal.find(r => r.id == id);
    UI.showRecipeDetails(receta);
}

/* Animación simple de entrada para secciones al hacer scroll */
function animarAlEntrar() {
    const elementos = document.querySelectorAll('.feature-card, .popular .recipe-card');
    if (!elementos.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    elementos.forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });
}
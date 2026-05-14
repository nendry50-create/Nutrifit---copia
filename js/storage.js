/* ===== API CLIENT (Reemplaza LocalStorage) ===== */

const API_URL = 'http://localhost:3000/api';

const Storage = {
    // ---- Autenticación y Sesión ----
    async loginUser(email, password) {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('nutrifit_token', data.token);
                localStorage.setItem('nutrifit_user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message };
        } catch (err) {
            return { success: false, message: 'Error de conexión con el servidor.' };
        }
    },

    async registerUser(nombre, email, password) {
        try {
            const res = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('nutrifit_token', data.token);
                localStorage.setItem('nutrifit_user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message };
        } catch (err) {
            return { success: false, message: 'Error de conexión.' };
        }
    },

    getCurrentUser() {
        const user = localStorage.getItem('nutrifit_user');
        return user ? JSON.parse(user) : null;
    },

    getToken() {
        return localStorage.getItem('nutrifit_token');
    },

    isLoggedIn() {
        return this.getToken() !== null;
    },

    logout() {
        localStorage.removeItem('nutrifit_token');
        localStorage.removeItem('nutrifit_user');
    },

    // ---- Recetas ----
    async getRecipes(categoria = 'todas', busqueda = '') {
        try {
            let url = `${API_URL}/recetas?categoria=${categoria}`;
            if (busqueda) url += `&q=${busqueda}`;
            
            const res = await fetch(url);
            return await res.json();
        } catch (err) {
            console.error('Error al cargar recetas:', err);
            return [];
        }
    },

    async addRecipe(formData) {
        try {
            const res = await fetch(`${API_URL}/recetas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                    // No poner Content-Type si es FormData
                },
                body: formData
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error de conexión.' };
        }
    },

    async getRecipesByUser(userId) {
        try {
            const res = await fetch(`${API_URL}/recetas/usuario/${userId}`);
            return await res.json();
        } catch (err) {
            console.error('Error al cargar recetas del usuario:', err);
            return [];
        }
    },

    async getLikedRecipes() {
        try {
            const res = await fetch(`${API_URL}/recetas/likes`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            return await res.json();
        } catch (err) {
            console.error('Error al cargar recetas guardadas:', err);
            return [];
        }
    },

    async updateRecipe(recipeId, formData) {
        try {
            const res = await fetch(`${API_URL}/recetas/${recipeId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.getToken()}` },
                body: formData
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error de conexión.' };
        }
    },

    async deleteRecipe(recipeId) {
        try {
            const res = await fetch(`${API_URL}/recetas/${recipeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al eliminar.' };
        }
    },

    async updateProfile(profileData) {
        try {
            const res = await fetch(`${API_URL}/usuario/perfil`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}` 
                },
                body: JSON.stringify(profileData)
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('nutrifit_user', JSON.stringify(data.user));
            }
            return data;
        } catch (err) {
            return { success: false, message: 'Error de conexión.' };
        }
    },

    // ---- Interacción ----
    async toggleLike(recipeId) {
        try {
            const res = await fetch(`${API_URL}/recetas/${recipeId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            return await res.json();
        } catch (err) {
            return null;
        }
    },

    async calificar(recipeId, estrellas) {
        try {
            const res = await fetch(`${API_URL}/recetas/${recipeId}/calificar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ estrellas })
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al calificar.' };
        }
    },

    async getComentarios(recipeId) {
        try {
            const res = await fetch(`${API_URL}/recetas/${recipeId}/comentarios`);
            return await res.json();
        } catch (err) {
            return [];
        }
    },

    async addComentario(recipeId, texto) {
        try {
            const res = await fetch(`${API_URL}/recetas/${recipeId}/comentarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ texto })
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al comentar.' };
        }
    },

    // ---- Perfiles Públicos ----
    async getUsuarioPerfil(userId) {
        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}`);
            return await res.json();
        } catch (err) {
            return null;
        }
    },

    async seguirUsuario(userId) {
        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}/seguir`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al seguir.' };
        }
    },

    async checkSiguiendo(userId) {
        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}/siguiendo`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            return await res.json();
        } catch (err) {
            return { siguiendo: false };
        }
    },

    async getListaSiguiendo(userId) {
        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}/lista-siguiendo`);
            return await res.json();
        } catch (err) {
            return [];
        }
    },

    // ---- Respuestas a Comentarios ----
    async getRespuestas(comentarioId) {
        try {
            const res = await fetch(`${API_URL}/comentarios/${comentarioId}/respuestas`);
            return await res.json();
        } catch (err) {
            return [];
        }
    },

    async addRespuesta(comentarioId, texto) {
        try {
            const res = await fetch(`${API_URL}/comentarios/${comentarioId}/respuestas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ texto })
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al responder.' };
        }
    },

    async deleteRespuesta(respuestaId) {
        try {
            const res = await fetch(`${API_URL}/respuestas/${respuestaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al eliminar.' };
        }
    },

    // ---- Administración ----
    async banUser(userId, baneado) {
        try {
            const res = await fetch(`${API_URL}/admin/banear/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ baneado })
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al banear usuario.' };
        }
    },

    async promoteUser(userId, rol) {
        try {
            const res = await fetch(`${API_URL}/admin/promover/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ rol })
            });
            return await res.json();
        } catch (err) {
            return { error: 'Error al actualizar rol.' };
        }
    }
};

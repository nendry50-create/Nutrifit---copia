import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getPool, sql } from './sql.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nutrifit_secret_key_123';

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(__dirname));

// Servir imágenes subidas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// ===== MULTER (subida de imágenes) =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `img_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Solo se permiten imágenes'));
    }
});

// ===== MIDDLEWARE AUTH =====
function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'Token requerido' });

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.baneado) {
            return res.status(403).json({ error: 'Tu cuenta ha sido baneada. Contacta al soporte.' });
        }
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

// ===================================================
// RUTAS: USUARIOS
// ===================================================

app.post('/api/registro', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });

    try {
        const pool = await getPool();

        // 1. Verificar si el correo está en la lista negra (baneos permanentes)
        const enListaNegra = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT 1 FROM ListaNegra WHERE email = @email');
        
        if (enListaNegra.recordset.length > 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Este correo electrónico tiene prohibido el acceso a la plataforma de forma permanente.' 
            });
        }

        // 2. Verificar si el correo ya está registrado en la tabla Usuarios
        const existe = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM Usuarios WHERE email = @email');

        if (existe.recordset.length > 0)
            return res.status(409).json({ success: false, message: 'Este correo ya está registrado.' });

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hash)
            .query('INSERT INTO Usuarios (nombre, email, password) OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.email VALUES (@nombre, @email, @password)');

        const user = result.recordset[0];
        const token = jwt.sign({ 
            id: user.id, 
            nombre: user.nombre, 
            email: user.email,
            rol: 'user',
            baneado: false
        }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, token, user: { ...user, rol: 'user', baneado: false } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id, nombre, email, password, rol, baneado FROM Usuarios WHERE email = @email');

        if (result.recordset.length === 0)
            return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });

        const user = result.recordset[0];
        if (user.baneado) {
            return res.status(403).json({ success: false, message: 'Tu cuenta ha sido baneada.' });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });

        const token = jwt.sign({ 
            id: user.id, 
            nombre: user.nombre, 
            email: user.email,
            rol: user.rol,
            baneado: user.baneado
        }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, baneado: user.baneado } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

// ===================================================
// RUTAS: PERFIL DE USUARIO
// ===================================================

app.get('/api/usuario/perfil', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.BigInt, req.user.id)
            .query('SELECT id, nombre, email, fechaRegistro FROM Usuarios WHERE id = @id');
        
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfil.' });
    }
});

// Obtener perfil completo (incluyendo rol y baneado) para sincronización de sesión
app.get('/api/usuario/perfil-completo', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.BigInt, req.user.id)
            .query('SELECT id, nombre, email, rol, baneado FROM Usuarios WHERE id = @id');
        
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfil completo.' });
    }
});

app.put('/api/usuario/perfil', authMiddleware, async (req, res) => {
    const { nombre, email, currentPassword, newPassword } = req.body;
    const usuarioId = req.user.id;

    try {
        const pool = await getPool();
        const userRes = await pool.request()
            .input('id', sql.BigInt, usuarioId)
            .query('SELECT password FROM Usuarios WHERE id = @id');
        
        const valid = await bcrypt.compare(currentPassword, userRes.recordset[0].password);
        if (!valid) return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta.' });

        let updateQuery = 'UPDATE Usuarios SET nombre = @nombre, email = @email';
        const request = pool.request()
            .input('id', sql.BigInt, usuarioId)
            .input('nombre', sql.NVarChar, nombre)
            .input('email', sql.NVarChar, email);

        if (newPassword) {
            const hash = await bcrypt.hash(newPassword, 10);
            updateQuery += ', password = @pass';
            request.input('pass', sql.NVarChar, hash);
        }

        updateQuery += ' WHERE id = @id';
        await request.query(updateQuery);

        res.json({ success: true, user: { id: usuarioId, nombre, email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al actualizar perfil.' });
    }
});

// ===================================================
// RUTAS: RECETAS
// ===================================================

app.get('/api/recetas', async (req, res) => {
    const { categoria, q } = req.query;
    try {
        const pool = await getPool();
        let query = `
            SELECT r.*, 
                   (SELECT AVG(CAST(estrellas AS FLOAT)) FROM Calificaciones WHERE recetaId = r.id) as promedioEstrellas,
                   (SELECT COUNT(*) FROM Calificaciones WHERE recetaId = r.id) as totalCalificaciones,
                   (SELECT COUNT(*) FROM Comentarios WHERE recetaId = r.id) as totalComentarios
            FROM Recetas r WHERE 1=1
        `;
        const request = pool.request();

        if (categoria && categoria !== 'todas') {
            query += ' AND r.categoria = @categoria';
            request.input('categoria', sql.NVarChar, categoria);
        }
        if (q) {
            query += ' AND (r.titulo LIKE @q OR r.descripcion LIKE @q)';
            request.input('q', sql.NVarChar, `%${q}%`);
        }
        query += ' ORDER BY r.fecha DESC';

        const result = await request.query(query);
        
        const recetas = await Promise.all(result.recordset.map(async (r) => {
            const ing = await pool.request()
                .input('id', sql.BigInt, r.id)
                .query('SELECT texto FROM Ingredientes WHERE recetaId = @id');
            return { ...r, ingredientes: ing.recordset.map(i => i.texto) };
        }));

        res.json(recetas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener recetas.' });
    }
});

app.get('/api/recetas/usuario/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.BigInt, req.params.id)
            .query('SELECT * FROM Recetas WHERE autorId = @uid ORDER BY fecha DESC');
        
        const recetas = await Promise.all(result.recordset.map(async (r) => {
            const ing = await pool.request()
                .input('id', sql.BigInt, r.id)
                .query('SELECT texto FROM Ingredientes WHERE recetaId = @id');
            return { ...r, ingredientes: ing.recordset.map(i => i.texto) };
        }));
        res.json(recetas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener recetas del usuario.' });
    }
});

app.get('/api/recetas/likes', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.BigInt, req.user.id)
            .query(`
                SELECT r.* FROM Recetas r
                JOIN Likes l ON r.id = l.recetaId
                WHERE l.usuarioId = @uid
                ORDER BY l.fecha DESC
            `);
        
        const recetas = await Promise.all(result.recordset.map(async (r) => {
            const ing = await pool.request()
                .input('id', sql.BigInt, r.id)
                .query('SELECT texto FROM Ingredientes WHERE recetaId = @id');
            return { ...r, ingredientes: ing.recordset.map(i => i.texto) };
        }));
        res.json(recetas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener recetas guardadas.' });
    }
});

app.post('/api/recetas', authMiddleware, upload.single('imagen'), async (req, res) => {
    const { titulo, descripcion, instrucciones, categoria, tiempo, dificultad, ingredientes } = req.body;
    const imagenUrl = req.file ? `/uploads/${req.file.filename}` : '';

    console.log('--- Intentando crear receta ---');
    console.log('Body:', { titulo, categoria, autorId: req.user.id });
    console.log('Imagen:', imagenUrl);

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('titulo', sql.NVarChar, titulo)
            .input('descripcion', sql.NVarChar, descripcion)
            .input('instrucciones', sql.NVarChar, instrucciones)
            .input('categoria', sql.NVarChar, categoria)
            .input('tiempo', sql.NVarChar, tiempo)
            .input('dificultad', sql.NVarChar, dificultad)
            .input('imagen', sql.NVarChar, imagenUrl)
            .input('autorId', sql.BigInt, req.user.id)
            .input('autorNombre', sql.NVarChar, req.user.nombre)
            .query(`
                INSERT INTO Recetas (titulo, descripcion, instrucciones, categoria, tiempo, dificultad, imagen, autorId, autorNombre)
                OUTPUT INSERTED.id
                VALUES (@titulo, @descripcion, @instrucciones, @categoria, @tiempo, @dificultad, @imagen, @autorId, @autorNombre)
            `);

        const recetaId = result.recordset[0].id;
        console.log('✅ Receta creada con ID:', recetaId);

        let listaIng = [];
        try {
            listaIng = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : (ingredientes || []);
        } catch (e) {
            console.error('Error al parsear ingredientes:', e);
            listaIng = [];
        }

        for (const texto of listaIng) {
            if (texto && texto.trim()) {
                await pool.request()
                    .input('rid', sql.BigInt, recetaId)
                    .input('txt', sql.NVarChar, texto.trim())
                    .query('INSERT INTO Ingredientes (recetaId, texto) VALUES (@rid, @txt)');
            }
        }
        console.log('✅ Ingredientes guardados');

        res.status(201).json({ success: true, id: recetaId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear receta.' });
    }
});

app.put('/api/recetas/:id', authMiddleware, upload.single('imagen'), async (req, res) => {
    const { titulo, descripcion, instrucciones, categoria, tiempo, dificultad, ingredientes } = req.body;
    const recetaId = req.params.id;
    const usuarioId = req.user.id;

    try {
        const pool = await getPool();
        // Verificar autoría
        const check = await pool.request()
            .input('rid', sql.BigInt, recetaId)
            .query('SELECT autorId, imagen FROM Recetas WHERE id = @rid');
        
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });
        
        // Permitir si es el autor O si es admin
        if (check.recordset[0].autorId != usuarioId && req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso' });
        }

        let imagenUrl = check.recordset[0].imagen;
        if (req.file) imagenUrl = `/uploads/${req.file.filename}`;

        await pool.request()
            .input('rid', sql.BigInt, recetaId)
            .input('titulo', sql.NVarChar, titulo)
            .input('descripcion', sql.NVarChar, descripcion)
            .input('instrucciones', sql.NVarChar, instrucciones)
            .input('categoria', sql.NVarChar, categoria)
            .input('tiempo', sql.NVarChar, tiempo)
            .input('dificultad', sql.NVarChar, dificultad)
            .input('imagen', sql.NVarChar, imagenUrl)
            .query(`
                UPDATE Recetas SET 
                    titulo = @titulo, descripcion = @descripcion, instrucciones = @instrucciones, 
                    categoria = @categoria, tiempo = @tiempo, dificultad = @dificultad, imagen = @imagen
                WHERE id = @rid
            `);

        // Actualizar ingredientes (borrar y reinsertar es lo más simple)
        await pool.request().input('rid', sql.BigInt, recetaId).query('DELETE FROM Ingredientes WHERE recetaId = @rid');
        
        let listaIng = [];
        try {
            listaIng = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : (ingredientes || []);
        } catch (e) { listaIng = []; }

        for (const texto of listaIng) {
            if (texto && texto.trim()) {
                await pool.request()
                    .input('rid', sql.BigInt, recetaId)
                    .input('txt', sql.NVarChar, texto.trim())
                    .query('INSERT INTO Ingredientes (recetaId, texto) VALUES (@rid, @txt)');
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar receta.' });
    }
});

app.delete('/api/recetas/:id', authMiddleware, async (req, res) => {
    const recetaId = req.params.id;
    const usuarioId = req.user.id;

    try {
        const pool = await getPool();
        // Verificar autoría
        const check = await pool.request()
            .input('rid', sql.BigInt, recetaId)
            .query('SELECT autorId FROM Recetas WHERE id = @rid');
        
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });
        
        // Permitir si es el autor O si es admin
        if (check.recordset[0].autorId != usuarioId && req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso' });
        }

        // Borrar todo lo asociado
        await pool.request().input('rid', sql.BigInt, recetaId).query('DELETE FROM Ingredientes WHERE recetaId = @rid');
        await pool.request().input('rid', sql.BigInt, recetaId).query('DELETE FROM Comentarios WHERE recetaId = @rid');
        await pool.request().input('rid', sql.BigInt, recetaId).query('DELETE FROM Calificaciones WHERE recetaId = @rid');
        await pool.request().input('rid', sql.BigInt, recetaId).query('DELETE FROM Likes WHERE recetaId = @rid');
        await pool.request().input('rid', sql.BigInt, recetaId).query('DELETE FROM Recetas WHERE id = @rid');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar receta.' });
    }
});

// ===================================================
// RUTAS: CARACTERÍSTICAS SOCIALES
// ===================================================

app.post('/api/recetas/:id/calificar', authMiddleware, async (req, res) => {
    const { estrellas } = req.body;
    const recetaId = req.params.id;
    const usuarioId = req.user.id;

    if (!estrellas || estrellas < 1 || estrellas > 5)
        return res.status(400).json({ error: 'Calificación inválida (1-5).' });

    try {
        const pool = await getPool();
        await pool.request()
            .input('rid', sql.BigInt, recetaId)
            .input('uid', sql.BigInt, usuarioId)
            .input('est', sql.Int, estrellas)
            .query(`
                IF EXISTS (SELECT 1 FROM Calificaciones WHERE recetaId = @rid AND usuarioId = @uid)
                    UPDATE Calificaciones SET estrellas = @est WHERE recetaId = @rid AND usuarioId = @uid
                ELSE
                    INSERT INTO Calificaciones (recetaId, usuarioId, estrellas) VALUES (@rid, @uid, @est)
            `);

        // Devolver nuevo promedio
        const avgRes = await pool.request()
            .input('rid', sql.BigInt, recetaId)
            .query('SELECT AVG(CAST(estrellas AS FLOAT)) as promedio FROM Calificaciones WHERE recetaId = @rid');
        
        const promedio = avgRes.recordset[0].promedio || 0;
        res.json({ success: true, promedio, message: 'Calificación guardada.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al calificar.' });
    }
});

app.get('/api/recetas/:id/comentarios', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('rid', sql.BigInt, req.params.id)
            .query('SELECT * FROM Comentarios WHERE recetaId = @rid ORDER BY fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comentarios.' });
    }
});

app.post('/api/recetas/:id/comentarios', authMiddleware, async (req, res) => {
    const { texto } = req.body;
    if (!texto) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('rid', sql.BigInt, req.params.id)
            .input('uid', sql.BigInt, req.user.id)
            .input('unom', sql.NVarChar, req.user.nombre)
            .input('txt', sql.NVarChar, texto)
            .query('INSERT INTO Comentarios (recetaId, usuarioId, usuarioNombre, texto) OUTPUT INSERTED.id, INSERTED.fecha, INSERTED.usuarioNombre, INSERTED.texto VALUES (@rid, @uid, @unom, @txt)');
        
        const comentario = result.recordset[0];
        res.status(201).json({ success: true, id: comentario.id, fecha: comentario.fecha, usuarioNombre: comentario.usuarioNombre, texto: comentario.texto });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al comentar.' });
    }
});

app.delete('/api/comentarios/:id', authMiddleware, async (req, res) => {
    const comentarioId = req.params.id;
    const usuarioId = req.user.id;
    try {
        const pool = await getPool();
        // Verificar que el comentario pertenece al usuario
        const check = await pool.request()
            .input('cid', sql.BigInt, comentarioId)
            .query('SELECT usuarioId FROM Comentarios WHERE id = @cid');
        
        if (check.recordset.length === 0)
            return res.status(404).json({ error: 'Comentario no encontrado.' });
        
        // Permitir si es el autor O si es admin
        if (check.recordset[0].usuarioId != usuarioId && req.user.rol !== 'admin')
            return res.status(403).json({ error: 'No tienes permiso.' });

        await pool.request()
            .input('cid', sql.BigInt, comentarioId)
            .query('DELETE FROM Comentarios WHERE id = @cid');
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar comentario.' });
    }
});

app.post('/api/recetas/:id/like', authMiddleware, async (req, res) => {
    const recetaId = req.params.id;
    const usuarioId = req.user.id;
    try {
        const pool = await getPool();
        const existe = await pool.request()
            .input('rid', sql.BigInt, recetaId)
            .input('uid', sql.BigInt, usuarioId)
            .query('SELECT 1 FROM Likes WHERE recetaId = @rid AND usuarioId = @uid');

        if (existe.recordset.length > 0) {
            await pool.request().input('rid', sql.BigInt, recetaId).input('uid', sql.BigInt, usuarioId)
                .query('DELETE FROM Likes WHERE recetaId = @rid AND usuarioId = @uid');
            await pool.request().input('rid', sql.BigInt, recetaId)
                .query('UPDATE Recetas SET likes = likes - 1 WHERE id = @rid');
            res.json({ liked: false });
        } else {
            await pool.request().input('rid', sql.BigInt, recetaId).input('uid', sql.BigInt, usuarioId)
                .query('INSERT INTO Likes (recetaId, usuarioId) VALUES (@rid, @uid)');
            await pool.request().input('rid', sql.BigInt, recetaId)
                .query('UPDATE Recetas SET likes = likes + 1 WHERE id = @rid');
            res.json({ liked: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en like.' });
    }
});


// ===================================================
// RUTAS: PERFILES PÚBLICOS Y SEGUIDORES
// ===================================================

app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const uid = req.params.id;

        // Datos básicos del usuario
        const userRes = await pool.request()
            .input('id', sql.BigInt, uid)
            .query('SELECT id, nombre, fechaRegistro FROM Usuarios WHERE id = @id');

        if (userRes.recordset.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado.' });

        const usuario = userRes.recordset[0];

        // Recetas del usuario
        const recetasRes = await pool.request()
            .input('uid', sql.BigInt, uid)
            .query(`
                SELECT r.*,
                    (SELECT AVG(CAST(estrellas AS FLOAT)) FROM Calificaciones WHERE recetaId = r.id) as promedioEstrellas,
                    (SELECT COUNT(*) FROM Comentarios WHERE recetaId = r.id) as totalComentarios
                FROM Recetas r WHERE r.autorId = @uid ORDER BY r.fecha DESC
            `);

        const recetas = await Promise.all(recetasRes.recordset.map(async (r) => {
            const ing = await pool.request()
                .input('id', sql.BigInt, r.id)
                .query('SELECT texto FROM Ingredientes WHERE recetaId = @id');
            return { ...r, ingredientes: ing.recordset.map(i => i.texto) };
        }));

        // Estadísticas de seguidores
        const segRes = await pool.request()
            .input('uid', sql.BigInt, uid)
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM Seguidores WHERE seguidoId = @uid) as seguidores,
                    (SELECT COUNT(*) FROM Seguidores WHERE seguidorId = @uid) as siguiendo
            `);

        const stats = segRes.recordset[0];

        res.json({
            usuario,
            recetas,
            seguidores: stats.seguidores,
            siguiendo: stats.siguiendo
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfil.' });
    }
});

app.post('/api/usuarios/:id/seguir', authMiddleware, async (req, res) => {
    const seguidoId = req.params.id;
    const seguidorId = req.user.id;

    if (seguidoId == seguidorId)
        return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });

    try {
        const pool = await getPool();
        const existe = await pool.request()
            .input('seg', sql.BigInt, seguidorId)
            .input('uid', sql.BigInt, seguidoId)
            .query('SELECT 1 FROM Seguidores WHERE seguidorId = @seg AND seguidoId = @uid');

        if (existe.recordset.length > 0) {
            await pool.request()
                .input('seg', sql.BigInt, seguidorId)
                .input('uid', sql.BigInt, seguidoId)
                .query('DELETE FROM Seguidores WHERE seguidorId = @seg AND seguidoId = @uid');
            res.json({ siguiendo: false });
        } else {
            await pool.request()
                .input('seg', sql.BigInt, seguidorId)
                .input('uid', sql.BigInt, seguidoId)
                .query('INSERT INTO Seguidores (seguidorId, seguidoId) VALUES (@seg, @uid)');
            res.json({ siguiendo: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al seguir usuario.' });
    }
});

app.get('/api/usuarios/:id/siguiendo', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const existe = await pool.request()
            .input('seg', sql.BigInt, req.user.id)
            .input('uid', sql.BigInt, req.params.id)
            .query('SELECT 1 FROM Seguidores WHERE seguidorId = @seg AND seguidoId = @uid');
        res.json({ siguiendo: existe.recordset.length > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Error.' });
    }
});

app.get('/api/usuarios/:id/lista-siguiendo', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.BigInt, req.params.id)
            .query(`
                SELECT u.id, u.nombre, u.email 
                FROM Usuarios u
                JOIN Seguidores s ON u.id = s.seguidoId
                WHERE s.seguidorId = @uid
                ORDER BY s.fecha DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener lista de siguiendo.' });
    }
});

// ===================================================
// RUTAS: RESPUESTAS A COMENTARIOS
// ===================================================

app.get('/api/comentarios/:id/respuestas', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cid', sql.BigInt, req.params.id)
            .query('SELECT * FROM RespuestasComentarios WHERE comentarioId = @cid ORDER BY fecha ASC');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener respuestas.' });
    }
});

app.post('/api/comentarios/:id/respuestas', authMiddleware, async (req, res) => {
    const { texto } = req.body;
    if (!texto) return res.status(400).json({ error: 'La respuesta no puede estar vacía.' });

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cid', sql.BigInt, req.params.id)
            .input('uid', sql.BigInt, req.user.id)
            .input('unom', sql.NVarChar, req.user.nombre)
            .input('txt', sql.NVarChar, texto)
            .query(`INSERT INTO RespuestasComentarios (comentarioId, usuarioId, usuarioNombre, texto)
                    OUTPUT INSERTED.id, INSERTED.fecha, INSERTED.usuarioNombre, INSERTED.texto
                    VALUES (@cid, @uid, @unom, @txt)`);

        const r = result.recordset[0];
        res.status(201).json({ success: true, id: r.id, fecha: r.fecha, usuarioNombre: r.usuarioNombre, texto: r.texto });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al responder.' });
    }
});

app.delete('/api/respuestas/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const check = await pool.request()
            .input('rid', sql.BigInt, req.params.id)
            .query('SELECT usuarioId FROM RespuestasComentarios WHERE id = @rid');

        if (check.recordset.length === 0)
            return res.status(404).json({ error: 'Respuesta no encontrada.' });
        if (check.recordset[0].usuarioId != req.user.id)
            return res.status(403).json({ error: 'No tienes permiso.' });

        await pool.request()
            .input('rid', sql.BigInt, req.params.id)
            .query('DELETE FROM RespuestasComentarios WHERE id = @rid');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar respuesta.' });
    }
});

// ===================================================
// RUTAS: ADMINISTRACIÓN
// ===================================================

app.post('/api/admin/banear/:id', authMiddleware, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const targetId = req.params.id;
    const { baneado } = req.body;

    try {
        const pool = await getPool();
        
        // Obtener el email del usuario antes de banear/desbanear
        const userRes = await pool.request()
            .input('id', sql.BigInt, targetId)
            .query('SELECT email FROM Usuarios WHERE id = @id');
        
        if (userRes.recordset.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        const email = userRes.recordset[0].email;

        // Actualizar estado en la tabla Usuarios
        await pool.request()
            .input('id', sql.BigInt, targetId)
            .input('ban', sql.Bit, baneado)
            .query('UPDATE Usuarios SET baneado = @ban WHERE id = @id');
        
        // Sincronizar con ListaNegra para prevenir nuevos registros
        if (baneado) {
            await pool.request()
                .input('email', sql.NVarChar, email)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM ListaNegra WHERE email = @email)
                    INSERT INTO ListaNegra (email) VALUES (@email)
                `);
        } else {
            await pool.request()
                .input('email', sql.NVarChar, email)
                .query('DELETE FROM ListaNegra WHERE email = @email');
        }
        
        res.json({ success: true, message: baneado ? 'Usuario baneado y añadido a lista negra' : 'Usuario desbaneado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al procesar el baneo' });
    }
});

app.post('/api/admin/promover/:id', authMiddleware, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const targetId = req.params.id;
    const { rol } = req.body; // 'user' o 'admin'

    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.BigInt, targetId)
            .input('rol', sql.NVarChar, rol)
            .query('UPDATE Usuarios SET rol = @rol WHERE id = @id');
        
        res.json({ success: true, message: `Rol actualizado a ${rol}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al promover usuario' });
    }
});

// Listar todos los usuarios (solo admin)
app.get('/api/admin/usuarios', authMiddleware, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT id, nombre, email, rol, baneado, fechaRegistro FROM Usuarios ORDER BY fechaRegistro DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Eliminar usuario (solo admin)
app.delete('/api/admin/eliminar-usuario/:id', authMiddleware, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const targetId = req.params.id;

    // No permitir que el admin se elimine a si mismo
    if (targetId == req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    try {
        const pool = await getPool();
        // Borrar datos relacionados primero
        await pool.request().input('uid', sql.BigInt, targetId).query('DELETE FROM Likes WHERE usuarioId = @uid');
        await pool.request().input('uid', sql.BigInt, targetId).query('DELETE FROM Calificaciones WHERE usuarioId = @uid');
        await pool.request().input('uid', sql.BigInt, targetId).query('DELETE FROM Comentarios WHERE usuarioId = @uid');
        await pool.request().input('uid', sql.BigInt, targetId).query('DELETE FROM Seguidores WHERE seguidorId = @uid OR seguidoId = @uid');
        // Borrar recetas del usuario
        const recetasRes = await pool.request().input('uid', sql.BigInt, targetId).query('SELECT id FROM Recetas WHERE autorId = @uid');
        for (const r of recetasRes.recordset) {
            await pool.request().input('rid', sql.BigInt, r.id).query('DELETE FROM Ingredientes WHERE recetaId = @rid');
            await pool.request().input('rid', sql.BigInt, r.id).query('DELETE FROM Comentarios WHERE recetaId = @rid');
            await pool.request().input('rid', sql.BigInt, r.id).query('DELETE FROM Calificaciones WHERE recetaId = @rid');
            await pool.request().input('rid', sql.BigInt, r.id).query('DELETE FROM Likes WHERE recetaId = @rid');
            await pool.request().input('rid', sql.BigInt, r.id).query('DELETE FROM Recetas WHERE id = @rid');
        }
        await pool.request().input('uid', sql.BigInt, targetId).query('DELETE FROM Usuarios WHERE id = @uid');
        res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`🚀 NutriFit Server running on http://localhost:${PORT}`);
    try {
        const pool = await getPool();
        
        // Inicializar tabla ListaNegra si no existe
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ListaNegra' AND xtype='U')
            CREATE TABLE ListaNegra (
                id INT PRIMARY KEY IDENTITY(1,1),
                email NVARCHAR(255) UNIQUE NOT NULL,
                fechaBaneo DATETIME DEFAULT GETDATE()
            )
        `);
        console.log("✅ Base de datos verificada (ListaNegra lista)");
        
    } catch (err) {
        console.error('❌ Error inicial de conexión/DB:', err.message);
    }
});

// ===== NUTRIFIT - SERVIDOR EXPRESS =====
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { getPool, sql } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../')));

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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// ===================================================
// RUTAS: USUARIOS
// ===================================================

// POST /api/registro
app.post('/api/registro', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });

    try {
        const pool = await getPool();

        // Verificar si el email ya existe
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
        const token = jwt.sign({ id: user.id, nombre: user.nombre, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ success: true, token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Correo y contraseña son obligatorios.' });

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id, nombre, email, password FROM Usuarios WHERE email = @email');

        if (result.recordset.length === 0)
            return res.status(401).json({ success: false, message: 'No se encontró una cuenta con este correo.' });

        const user = result.recordset[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid)
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });

        const token = jwt.sign({ id: user.id, nombre: user.nombre, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// ===================================================
// RUTAS: RECETAS
// ===================================================

// GET /api/recetas  (con filtros opcionales: ?categoria=ensaladas&q=quinoa)
app.get('/api/recetas', async (req, res) => {
    const { categoria, q } = req.query;
    try {
        const pool = await getPool();

        let query = `
            SELECT
                r.id, r.titulo, r.descripcion, r.instrucciones,
                r.categoria, r.tiempo, r.dificultad, r.imagen,
                r.autorId, r.autorNombre, r.likes, r.fecha,
                (SELECT STRING_AGG(texto, '||') FROM Ingredientes WHERE recetaId = r.id) AS ingredientes
            FROM Recetas r
            WHERE 1=1
        `;
        const request = pool.request();

        if (categoria && categoria !== 'todas') {
            query += ' AND r.categoria = @categoria';
            request.input('categoria', sql.NVarChar, categoria);
        }
        if (q) {
            query += ` AND (
                r.titulo       LIKE @q OR
                r.descripcion  LIKE @q OR
                r.autorNombre  LIKE @q OR
                EXISTS (SELECT 1 FROM Ingredientes i WHERE i.recetaId = r.id AND i.texto LIKE @q)
            )`;
            request.input('q', sql.NVarChar, `%${q}%`);
        }

        query += ' ORDER BY r.fecha DESC';

        const result = await request.query(query);

        // Parsear ingredientes e incluir likes/saves del usuario autenticado
        const authHeader = req.headers['authorization'];
        let userId = null;
        if (authHeader) {
            try { userId = jwt.verify(authHeader.split(' ')[1], JWT_SECRET).id; } catch { }
        }

        const recetas = await Promise.all(result.recordset.map(async (r) => {
            const likedBy = userId ? await checkLike(pool, r.id, userId) : false;
            const savedBy = userId ? await checkSave(pool, r.id, userId) : false;
            return {
                ...r,
                ingredientes: r.ingredientes ? r.ingredientes.split('||') : [],
                isLiked: likedBy,
                isSaved: savedBy
            };
        }));

        res.json(recetas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener recetas.' });
    }
});

// GET /api/recetas/usuario/:userId
app.get('/api/recetas/usuario/:userId', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('autorId', sql.BigInt, req.params.userId)
            .query(`
                SELECT r.id, r.titulo, r.descripcion, r.categoria, r.tiempo, r.imagen,
                       r.autorNombre, r.likes, r.fecha
                FROM Recetas r
                WHERE r.autorId = @autorId
                ORDER BY r.fecha DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener recetas del usuario.' });
    }
});

// GET /api/recetas/guardadas/:userId
app.get('/api/recetas/guardadas/:userId', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('usuarioId', sql.BigInt, req.params.userId)
            .query(`
                SELECT r.id, r.titulo, r.descripcion, r.categoria, r.tiempo, r.imagen,
                       r.autorNombre, r.likes, r.fecha
                FROM Recetas r
                INNER JOIN Guardadas g ON g.recetaId = r.id
                WHERE g.usuarioId = @usuarioId
                ORDER BY r.fecha DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener recetas guardadas.' });
    }
});

// POST /api/recetas
app.post('/api/recetas', authMiddleware, upload.single('imagen'), async (req, res) => {
    const { titulo, descripcion, instrucciones, categoria, tiempo, dificultad, ingredientes } = req.body;
    if (!titulo || !descripcion || !instrucciones || !categoria)
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });

    const imagenUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imagenBase64 || '');

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('titulo', sql.NVarChar, titulo)
            .input('descripcion', sql.NVarChar, descripcion)
            .input('instrucciones', sql.NVarChar, instrucciones)
            .input('categoria', sql.NVarChar, categoria)
            .input('tiempo', sql.NVarChar, tiempo || 'No especificado')
            .input('dificultad', sql.NVarChar, dificultad || 'No especificada')
            .input('imagen', sql.NVarChar, imagenUrl)
            .input('autorId', sql.BigInt, req.user.id)
            .input('autorNombre', sql.NVarChar, req.user.nombre)
            .query(`
                INSERT INTO Recetas (titulo, descripcion, instrucciones, categoria, tiempo, dificultad, imagen, autorId, autorNombre)
                OUTPUT INSERTED.id
                VALUES (@titulo, @descripcion, @instrucciones, @categoria, @tiempo, @dificultad, @imagen, @autorId, @autorNombre)
            `);

        const recetaId = result.recordset[0].id;

        // Insertar ingredientes
        const lista = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : (ingredientes || []);
        for (const texto of lista) {
            if (texto.trim()) {
                await pool.request()
                    .input('recetaId', sql.BigInt, recetaId)
                    .input('texto', sql.NVarChar, texto.trim())
                    .query('INSERT INTO Ingredientes (recetaId, texto) VALUES (@recetaId, @texto)');
            }
        }

        res.status(201).json({ success: true, id: recetaId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la receta.' });
    }
});

// DELETE /api/recetas/:id
app.delete('/api/recetas/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();

        // Verificar que la receta pertenece al usuario
        const check = await pool.request()
            .input('id', sql.BigInt, req.params.id)
            .input('autorId', sql.BigInt, req.user.id)
            .query('SELECT id FROM Recetas WHERE id = @id AND autorId = @autorId');

        if (check.recordset.length === 0)
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta receta.' });

        await pool.request()
            .input('id', sql.BigInt, req.params.id)
            .query('DELETE FROM Recetas WHERE id = @id');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar la receta.' });
    }
});

// ===================================================
// RUTAS: LIKES Y GUARDADAS
// ===================================================

// POST /api/recetas/:id/like
app.post('/api/recetas/:id/like', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const recetaId = req.params.id;
        const userId = req.user.id;

        const existe = await checkLike(pool, recetaId, userId);

        if (existe) {
            await pool.request()
                .input('recetaId', sql.BigInt, recetaId)
                .input('usuarioId', sql.BigInt, userId)
                .query('DELETE FROM Likes WHERE recetaId = @recetaId AND usuarioId = @usuarioId');
            await pool.request()
                .input('id', sql.BigInt, recetaId)
                .query('UPDATE Recetas SET likes = likes - 1 WHERE id = @id');
        } else {
            await pool.request()
                .input('recetaId', sql.BigInt, recetaId)
                .input('usuarioId', sql.BigInt, userId)
                .query('INSERT INTO Likes (recetaId, usuarioId) VALUES (@recetaId, @usuarioId)');
            await pool.request()
                .input('id', sql.BigInt, recetaId)
                .query('UPDATE Recetas SET likes = likes + 1 WHERE id = @id');
        }

        const updated = await pool.request()
            .input('id', sql.BigInt, recetaId)
            .query('SELECT likes FROM Recetas WHERE id = @id');

        res.json({ success: true, liked: !existe, likes: updated.recordset[0].likes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al procesar el like.' });
    }
});

// POST /api/recetas/:id/guardar
app.post('/api/recetas/:id/guardar', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const recetaId = req.params.id;
        const userId = req.user.id;

        const existe = await checkSave(pool, recetaId, userId);

        if (existe) {
            await pool.request()
                .input('recetaId', sql.BigInt, recetaId)
                .input('usuarioId', sql.BigInt, userId)
                .query('DELETE FROM Guardadas WHERE recetaId = @recetaId AND usuarioId = @usuarioId');
        } else {
            await pool.request()
                .input('recetaId', sql.BigInt, recetaId)
                .input('usuarioId', sql.BigInt, userId)
                .query('INSERT INTO Guardadas (recetaId, usuarioId) VALUES (@recetaId, @usuarioId)');
        }

        res.json({ success: true, saved: !existe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la receta.' });
    }
});

// ===== SUBIDA DE IMAGEN INDIVIDUAL =====
app.post('/api/upload', authMiddleware, upload.single('imagen'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// ===================================================
// HELPERS
// ===================================================
async function checkLike(pool, recetaId, userId) {
    const r = await pool.request()
        .input('recetaId', sql.BigInt, recetaId)
        .input('usuarioId', sql.BigInt, userId)
        .query('SELECT 1 FROM Likes WHERE recetaId = @recetaId AND usuarioId = @usuarioId');
    return r.recordset.length > 0;
}

async function checkSave(pool, recetaId, userId) {
    const r = await pool.request()
        .input('recetaId', sql.BigInt, recetaId)
        .input('usuarioId', sql.BigInt, userId)
        .query('SELECT 1 FROM Guardadas WHERE recetaId = @recetaId AND usuarioId = @usuarioId');
    return r.recordset.length > 0;
}

// ===================================================
// INICIAR SERVIDOR
// ===================================================
app.listen(PORT, () => {
    console.log(`🚀 NutriFit API corriendo en http://localhost:${PORT}`);
    getPool().catch(err => console.error('❌ Error conectando a SQL Server:', err.message));
});

// ===== CONEXIÓN SQL SERVER =====
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,           // true si usas Azure
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool;

async function getPool() {
    if (!pool) {
        pool = await sql.connect(config);
        console.log('✅ Conectado a SQL Server');
    }
    return pool;
}

module.exports = { getPool, sql };

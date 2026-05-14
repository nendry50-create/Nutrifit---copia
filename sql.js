import mssql from 'mssql/msnodesqlv8.js';
import dotenv from 'dotenv';
dotenv.config();

const connectionConfig = {
    connectionString: `Driver={SQL Server};Server=${process.env.DB_SERVER || 'localhost'};Database=${process.env.DB_DATABASE || 'NutriFitDB'};Trusted_Connection=yes;`,
};

let pool;

export async function getPool() {
    try {
        if (!pool) {
            console.log("Intentando conectar con:", connectionConfig.connectionString);
            pool = await mssql.connect(connectionConfig);
            console.log("✅ Conectado a SQL Server (Windows Auth)");
        }
        return pool;
    } catch (error) {
        console.error("❌ Error de conexión detallado:");
        console.dir(error); // Muestra el objeto completo
        throw error;
    }
}

export default async function testConnection() {
    try {
        const p = await getPool();
        const result = await p.request().query('SELECT TOP (1) * FROM Usuarios');
        console.log("Test exitoso:", result.recordset);
    } catch (error) {
        console.error("Error en test:", error);
    }
}

export { mssql as sql };

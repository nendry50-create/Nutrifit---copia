CREATE DATABASE NutriFitDB;
GO

USE NutriFitDB;
GO

-- Usuarios
ALTER TABLE Usuarios 
ADD rol NVARCHAR(20) DEFAULT 'user';
-- Añadir columna de Baneo (0 = activo, 1 = bloqueado)
ALTER TABLE Usuarios 
ADD baneado BIT DEFAULT 0;
UPDATE Usuarios SET rol = 'user' WHERE rol IS NULL;
UPDATE Usuarios SET baneado = 0 WHERE baneado IS NULL;


-- Recetas
CREATE TABLE Recetas (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    titulo NVARCHAR(150) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL,
    instrucciones NVARCHAR(MAX) NOT NULL,
    categoria NVARCHAR(50) NOT NULL,
    tiempo NVARCHAR(50),
    dificultad NVARCHAR(20),
    imagen NVARCHAR(500),
    autorId BIGINT NOT NULL,
    autorNombre NVARCHAR(100) NOT NULL,
    likes INT DEFAULT 0,
    fecha DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (autorId) REFERENCES Usuarios(id) ON DELETE CASCADE
);
GO

-- Ingredientes
CREATE TABLE Ingredientes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    recetaId BIGINT NOT NULL,
    texto NVARCHAR(255) NOT NULL,
    FOREIGN KEY (recetaId) REFERENCES Recetas(id) ON DELETE CASCADE
);
GO

-- Likes (evitar duplicados)
CREATE TABLE Likes (
    recetaId BIGINT NOT NULL,
    usuarioId BIGINT NOT NULL,
    PRIMARY KEY (recetaId, usuarioId),
    FOREIGN KEY (recetaId) REFERENCES Recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(id) ON DELETE CASCADE
);
GO

-- Guardadas
CREATE TABLE Guardadas (
    recetaId BIGINT NOT NULL,
    usuarioId BIGINT NOT NULL,
    PRIMARY KEY (recetaId, usuarioId),
    FOREIGN KEY (recetaId) REFERENCES Recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(id) ON DELETE CASCADE
);
GO

-- COMENTARIOS (nuevo)
CREATE TABLE Comentarios (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    recetaId BIGINT NOT NULL,
    usuarioId BIGINT NOT NULL,
    usuarioNombre NVARCHAR(100) NOT NULL,
    texto NVARCHAR(MAX) NOT NULL,
    fecha DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (recetaId) REFERENCES Recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(id) ON DELETE CASCADE
);
GO

-- TABLA 1: Seguidores
CREATE TABLE Seguidores (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    seguidorId BIGINT NOT NULL,
    seguidoId  BIGINT NOT NULL,
    fecha      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Seguidor UNIQUE (seguidorId, seguidoId)
);

-- TABLA 2: Respuestas a comentarios
CREATE TABLE RespuestasComentarios (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    comentarioId   BIGINT NOT NULL,
    usuarioId      BIGINT NOT NULL,
    usuarioNombre  NVARCHAR(100) NOT NULL,
    texto          NVARCHAR(MAX) NOT NULL,
    fecha          DATETIME2 DEFAULT GETDATE()
);


-- Índices para rendimiento
CREATE INDEX IX_Recetas_autorId ON Recetas(autorId);
CREATE INDEX IX_Recetas_categoria ON Recetas(categoria);
CREATE INDEX IX_Comentarios_recetaId ON Comentarios(recetaId);
GO

-- 1. Agregar columnas a la tabla Usuarios si no existen
ALTER TABLE Usuarios ADD 
    rol NVARCHAR(20) DEFAULT 'user',
    baneado BIT DEFAULT 0;  

-- 2. Establecer un usuario como ADMIN (REEMPLAZA 1 con tu ID de usuario)       
UPDATE Usuarios SET rol = 'admin' WHERE id = 1;

-- 3. Verificar que los cambios se aplicaron
SELECT id, nombre, email, rol, baneado FROM Usuarios;
select baneado From Usuarios

select * from Usuarios
    select * from Recetas
    select * from Ingredientes
     select * from Likes
     select * from RespuestasComentarios

select id,rol from Usuarios

-- Migración: Agregar tabla de configuración del sistema
-- Fecha: 2025-01-XX

CREATE TABLE IF NOT EXISTS Configuracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL UNIQUE,
    valor TEXT,
    tipo TEXT DEFAULT 'text' CHECK(tipo IN ('text', 'number', 'boolean', 'json')),
    descripcion TEXT,
    fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Insertar configuraciones por defecto
INSERT OR IGNORE INTO Configuracion (clave, valor, tipo, descripcion) VALUES
    ('modo_oscuro', 'true', 'boolean', 'Modo oscuro activado'),
    ('respaldo_automatico', 'false', 'boolean', 'Respaldo automático activado'),
    ('frecuencia_respaldo', 'diario', 'text', 'Frecuencia de respaldo automático'),
    ('max_backups', '20', 'number', 'Número máximo de backups a mantener'),
    ('reportes_automaticos', 'false', 'boolean', 'Generación automática de reportes'),
    ('hora_reportes', '23:00', 'text', 'Hora para generar reportes automáticos');

-- Tabla para backups
CREATE TABLE IF NOT EXISTS Backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_archivo TEXT NOT NULL,
    ruta_completa TEXT NOT NULL,
    fecha_creacion TEXT DEFAULT (datetime('now', 'localtime')),
    tamano_bytes INTEGER,
    descripcion TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON Configuracion(clave);
CREATE INDEX IF NOT EXISTS idx_backups_fecha ON Backups(fecha_creacion);


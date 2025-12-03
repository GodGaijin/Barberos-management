-- Migración: Agregar tabla para porcentajes de comisión personalizados por empleado
-- Fecha: 2025-01-XX

CREATE TABLE IF NOT EXISTS PorcentajesComision (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_empleado INTEGER NOT NULL UNIQUE,
    porcentaje_comision REAL NOT NULL DEFAULT 60 CHECK(porcentaje_comision >= 0 AND porcentaje_comision <= 100),
    fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_porcentajes_empleado ON PorcentajesComision(id_empleado);


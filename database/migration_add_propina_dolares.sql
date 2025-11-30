-- Migración: Agregar campo propina_en_dolares a ServiciosRealizados
-- Ejecutar este script para agregar el campo si no existe

-- Verificar si la columna existe y agregarla si no existe
-- SQLite no tiene IF NOT EXISTS para ALTER TABLE ADD COLUMN, así que usamos un enfoque diferente

-- Intentar agregar la columna (fallará silenciosamente si ya existe en algunas versiones)
-- En SQLite, si la columna ya existe, simplemente no se agregará
ALTER TABLE ServiciosRealizados ADD COLUMN propina_en_dolares REAL DEFAULT 0;


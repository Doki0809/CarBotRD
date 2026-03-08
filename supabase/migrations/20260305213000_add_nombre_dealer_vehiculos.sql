-- Migration: Add nombre_dealer to vehiculos and update views
-- Created: 2026-03-05

-- 1. Add column to vehiculos
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS nombre_dealer TEXT;

-- 2. Populate data from dealers table
UPDATE vehiculos
SET nombre_dealer = d.nombre
FROM dealers d
WHERE vehiculos.dealer_id = d.id;

-- 3. Update views to include the new column (Postgres views require refresh/recreation to see new columns from SELECT *)
DROP VIEW IF EXISTS vista_inventario_disponible;
CREATE VIEW vista_inventario_disponible AS
SELECT * FROM vehiculos WHERE estado = 'Disponible';

DROP VIEW IF EXISTS vista_inventario_vendido;
CREATE VIEW vista_inventario_vendido AS
SELECT * FROM vehiculos WHERE estado = 'Vendido';

-- Populate the empty `nombre_dealer` column for existing users using data from the `dealers` table
UPDATE usuarios
SET nombre_dealer = d.nombre
FROM dealers d
WHERE usuarios.dealer_id = d.id;

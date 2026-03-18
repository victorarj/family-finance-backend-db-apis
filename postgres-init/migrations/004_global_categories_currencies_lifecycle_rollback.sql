DROP TABLE IF EXISTS moedas_usuario;
DROP TABLE IF EXISTS categorias_usuario;

ALTER TABLE moedas
  DROP COLUMN IF EXISTS owner_email,
  DROP COLUMN IF EXISTS is_default,
  DROP COLUMN IF EXISTS ativo;

ALTER TABLE categorias
  DROP COLUMN IF EXISTS owner_email,
  DROP COLUMN IF EXISTS is_default;

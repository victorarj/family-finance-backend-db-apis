ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255) NULL REFERENCES usuarios(email) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categorias_nome_key'
  ) THEN
    ALTER TABLE categorias DROP CONSTRAINT categorias_nome_key;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_default_nome_unique
  ON categorias (nome)
  WHERE owner_email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_owner_nome_unique
  ON categorias (owner_email, nome)
  WHERE owner_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS categorias_usuario (
  usuario_email VARCHAR(255) NOT NULL REFERENCES usuarios(email) ON DELETE CASCADE,
  categoria_id INT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (usuario_email, categoria_id)
);

UPDATE categorias
SET is_default = TRUE
WHERE id <= 8;

ALTER TABLE moedas
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE moedas
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE moedas
  ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255) NULL REFERENCES usuarios(email) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS moedas_usuario (
  usuario_email VARCHAR(255) NOT NULL REFERENCES usuarios(email) ON DELETE CASCADE,
  moeda_codigo CHAR(3) NOT NULL REFERENCES moedas(codigo) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (usuario_email, moeda_codigo)
);

UPDATE moedas
SET is_default = TRUE
WHERE codigo IN ('USD', 'BRL', 'EUR', 'GBP');

ALTER TABLE DESPESAS
    DROP CONSTRAINT IF EXISTS despesas_nome_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'despesas_owner_nome_key'
    ) THEN
        ALTER TABLE DESPESAS
            ADD CONSTRAINT despesas_owner_nome_key UNIQUE (dono_despesa, nome);
    END IF;
END
$$;

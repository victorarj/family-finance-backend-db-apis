CREATE DOMAIN DONO AS VARCHAR(100);

CREATE TABLE USUARIOS (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    senha       VARCHAR(255) NOT NULL,
    telefone    VARCHAR(20),
    onboarding_completed_at TIMESTAMP NULL,
    last_transaction_date DATE NULL,
    planning_completed_at TIMESTAMP NULL
);

CREATE TABLE CATEGORIAS (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    owner_email VARCHAR(255) NULL
                    REFERENCES USUARIOS(email)
                    ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_categorias_default_nome_unique
    ON CATEGORIAS (nome)
    WHERE owner_email IS NULL;

CREATE UNIQUE INDEX idx_categorias_owner_nome_unique
    ON CATEGORIAS (owner_email, nome)
    WHERE owner_email IS NOT NULL;

CREATE TABLE CATEGORIAS_USUARIO (
    usuario_email   VARCHAR(255) NOT NULL
                        REFERENCES USUARIOS(email)
                        ON DELETE CASCADE,
    categoria_id    INT NOT NULL
                        REFERENCES CATEGORIAS(id)
                        ON DELETE CASCADE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (usuario_email, categoria_id)
);

CREATE TABLE PRIORIDADES (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(50) UNIQUE NOT NULL,
    nivel       INT NOT NULL CHECK (nivel >= 0)
);

CREATE TABLE MOEDAS (
    codigo      CHAR(3) PRIMARY KEY,             -- ISO‑4217
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    owner_email VARCHAR(255) NULL
                    REFERENCES USUARIOS(email)
                    ON DELETE CASCADE
);

CREATE TABLE MOEDAS_USUARIO (
    usuario_email   VARCHAR(255) NOT NULL
                        REFERENCES USUARIOS(email)
                        ON DELETE CASCADE,
    moeda_codigo    CHAR(3) NOT NULL
                        REFERENCES MOEDAS(codigo)
                        ON DELETE CASCADE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (usuario_email, moeda_codigo)
);

CREATE TABLE CONTAS_BANCARIAS (
    id              SERIAL PRIMARY KEY,
    nome_conta      VARCHAR(100) NOT NULL,
    dono_conta      VARCHAR(100) NOT NULL
                        REFERENCES USUARIOS(email),
    banco           VARCHAR(100) NOT NULL,
    moeda           CHAR(3) NOT NULL
                        REFERENCES MOEDAS(codigo),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(dono_conta, nome_conta)
);

CREATE TABLE DESPESAS (
    id                      SERIAL PRIMARY KEY,
    nome                    VARCHAR(255) NOT NULL,
    valor_total             DECIMAL(10,2) NOT NULL CHECK (valor_total >= 0),
    valor_mensal            DECIMAL(10,2) NOT NULL CHECK (valor_mensal >= 0),
    numero_parcelas         INT NOT NULL CHECK (numero_parcelas >= 1),
    data_inicio             DATE NOT NULL,
    data_fim                DATE NOT NULL,
    debito_bancario         BOOLEAN NOT NULL,
    categoria_id            INT NOT NULL
                                REFERENCES CATEGORIAS(id),
    conta_bancaria_id       INT NOT NULL
                                REFERENCES CONTAS_BANCARIAS(id),
    prioridade_id           INT NOT NULL
                                REFERENCES PRIORIDADES(id),
    frequencia_pagamento    VARCHAR(50) NOT NULL,
    descricao               TEXT,
    tipo_despesa            VARCHAR(50) NOT NULL,
    dono_despesa            VARCHAR(100) NOT NULL
                                REFERENCES USUARIOS(email),
    moeda                   CHAR(3) NOT NULL
                                REFERENCES MOEDAS(codigo),
    UNIQUE (nome)
);

CREATE TABLE RECEITAS (
    id                  SERIAL PRIMARY KEY,
    nome                VARCHAR(255) NOT NULL,
    valor               DECIMAL(10,2) NOT NULL CHECK (valor >= 0),
    dono_receita        VARCHAR(100) NOT NULL
                            REFERENCES USUARIOS(email),
    data_recebimento    DATE NOT NULL,
    descricao           TEXT,
    moeda               CHAR(3) NOT NULL
                            REFERENCES MOEDAS(codigo),
    UNIQUE (dono_receita, nome)
);

CREATE TABLE RESUMOS (
    id              SERIAL PRIMARY KEY,
    nome_resumo     VARCHAR(255) NOT NULL,
    total_despesas  DECIMAL(10,2) NOT NULL CHECK (total_despesas >= 0),
    total_receitas  DECIMAL(10,2) NOT NULL CHECK (total_receitas >= 0),
    saldo           DECIMAL(10,2) NOT NULL,
    data_resumo     DATE NOT NULL,
    dono_resumo     VARCHAR(100) NOT NULL
                        REFERENCES USUARIOS(email),
    moeda           CHAR(3) NOT NULL
                        REFERENCES MOEDAS(codigo),
    UNIQUE (nome_resumo)
);

CREATE TABLE REPRESENTATIVIDADES (
    id                          SERIAL PRIMARY KEY,
    nome_representatividade     VARCHAR(255) NOT NULL,
    percentual                  DECIMAL(5,2) NOT NULL
                                    CHECK (percentual BETWEEN 0 AND 100),
    dono_representatividade     VARCHAR(100) NOT NULL
                                    REFERENCES USUARIOS(email),
    UNIQUE (dono_representatividade, nome_representatividade)
);

CREATE TABLE DISTRIBUICOES (
    dono_distribuicao   VARCHAR(100) NOT NULL
                          REFERENCES USUARIOS(email),
    nome_distribuicao   VARCHAR(255) NOT NULL,
    valor_distribuido   DECIMAL(10,2) NOT NULL CHECK (valor_distribuido >= 0),
    data_distribuicao   DATE NOT NULL,
    moeda               CHAR(3) NOT NULL
                          REFERENCES MOEDAS(codigo),
    PRIMARY KEY (dono_distribuicao, nome_distribuicao)
);

CREATE TABLE PREFERENCIAS_USUARIO (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE REFERENCES USUARIOS(id) ON DELETE CASCADE,
    tipo_residencia VARCHAR(50) NOT NULL,
    modo_registro VARCHAR(30) NOT NULL CHECK (modo_registro IN ('despesas', 'completo')),
    planejamento_guiado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE TRANSACOES_RECORRENTES (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    categoria_id INT NULL REFERENCES CATEGORIAS(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('income', 'expense')),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor >= 0),
    frequencia VARCHAR(20) NOT NULL CHECK (frequencia IN ('mensal')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ORCAMENTOS_MENSAIS (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    mes CHAR(7) NOT NULL CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$'),
    categoria_id INT NOT NULL REFERENCES CATEGORIAS(id),
    valor_planejado DECIMAL(10,2) NOT NULL CHECK (valor_planejado >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, mes, categoria_id)
);

CREATE TABLE SNAPSHOTS_MENSAIS (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    mes CHAR(7) NOT NULL CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$'),
    total_receitas DECIMAL(10,2) NOT NULL,
    total_fixas DECIMAL(10,2) NOT NULL,
    total_variaveis DECIMAL(10,2) NOT NULL,
    saldo_projetado DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, mes)
);

CREATE TABLE ALOCACOES_SUPERAVIT (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    mes CHAR(7) NOT NULL CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$'),
    tipo_alocacao VARCHAR(40) NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orcamentos_usuario_mes ON ORCAMENTOS_MENSAIS(usuario_id, mes);
CREATE INDEX idx_snapshots_usuario_mes ON SNAPSHOTS_MENSAIS(usuario_id, mes);
CREATE INDEX idx_alocacoes_usuario_mes ON ALOCACOES_SUPERAVIT(usuario_id, mes);
CREATE INDEX idx_recorrentes_usuario ON TRANSACOES_RECORRENTES(usuario_id);

-- Seed data
INSERT INTO USUARIOS (nome, email, senha, telefone) VALUES
    ('Admin User', 'admin@example.com', 'hashed_password_123', '1234567890');

INSERT INTO CATEGORIAS (nome) VALUES
    ('Alimentação'),
    ('Transporte'),
    ('Saúde'),
    ('Educação'),
    ('Entretenimento'),
    ('Moradia'),
    ('Utilidades'),
    ('Outros');

UPDATE CATEGORIAS SET is_default = TRUE;

INSERT INTO PRIORIDADES (nome, nivel) VALUES
    ('Baixa', 1),
    ('Média', 2),
    ('Alta', 3),
    ('Crítica', 4);

INSERT INTO MOEDAS (codigo) VALUES
    ('USD'),
    ('BRL'),
    ('EUR'),
    ('GBP');

UPDATE MOEDAS SET is_default = TRUE;

INSERT INTO CONTAS_BANCARIAS (nome_conta, dono_conta, banco, moeda, ativo) VALUES
    ('Conta Principal', 'admin@example.com', 'Banco Brasil', 'BRL', TRUE),
    ('Conta Dólares', 'admin@example.com', 'Banco Brasil', 'USD', TRUE);

CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'ready', 'failed');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('payslip', 'bill', 'bank_statement', 'other')),
    status document_status NOT NULL DEFAULT 'uploaded',
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_user_uploaded_at
    ON documents(user_id, uploaded_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES USUARIOS(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    chunk_index INT NOT NULL CHECK (chunk_index >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON document_chunks(document_id, chunk_index, id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id
    ON document_chunks(user_id);

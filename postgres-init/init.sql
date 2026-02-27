CREATE DOMAIN DONO AS VARCHAR(100);

CREATE TABLE USUARIOS (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    senha       VARCHAR(255) NOT NULL,
    telefone    VARCHAR(20)
);

CREATE TABLE CATEGORIAS (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE PRIORIDADES (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(50) UNIQUE NOT NULL,
    nivel       INT NOT NULL CHECK (nivel >= 0)
);

CREATE TABLE MOEDAS (
    codigo      CHAR(3) PRIMARY KEY              -- ISO‑4217
);

CREATE TABLE CONTAS_BANCARIAS (
    id              SERIAL PRIMARY KEY,
    nome_conta      VARCHAR(100) NOT NULL,
    dono_conta      VARCHAR(100) NOT NULL
                        REFERENCES USUARIOS(email),
    banco           VARCHAR(100) NOT NULL,
    moeda           CHAR(3) NOT NULL
                        REFERENCES MOEDAS(codigo),
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

INSERT INTO CONTAS_BANCARIAS (nome_conta, dono_conta, banco, moeda) VALUES
    ('Conta Principal', 'admin@example.com', 'Banco Brasil', 'BRL'),
    ('Conta Dólares', 'admin@example.com', 'Banco Brasil', 'USD');
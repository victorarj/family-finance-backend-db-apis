import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const {
    nome,
    valor_total,
    valor_mensal,
    numero_parcelas,
    data_inicio,
    data_fim,
    categoria_id,
    prioridade_id,
    debito_bancario,
    conta_bancaria_id,
    frequencia_pagamento,
    descricao,
    tipo_despesa,
    dono_despesa,
    moeda,
  } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO DESPESAS (nome, valor_total, valor_mensal, numero_parcelas, data_inicio, data_fim, categoria_id, prioridade_id, debito_bancario, conta_bancaria_id, frequencia_pagamento, descricao, tipo_despesa, dono_despesa, moeda) VALUES ($1, $2, $3) RETURNING id",
      [
        nome,
        valor_total,
        valor_mensal,
        numero_parcelas,
        data_inicio,
        data_fim,
        categoria_id,
        prioridade_id,
        debito_bancario,
        conta_bancaria_id,
        frequencia_pagamento,
        descricao,
        tipo_despesa,
        dono_despesa,
        moeda,
      ],
    );
    res
      .status(201)
      .json({
        id: result.rows[0].id,
        nome,
        valor_total,
        valor_mensal,
        numero_parcelas,
        data_inicio,
        data_fim,
        categoria_id,
        prioridade_id,
        debito_bancario,
        conta_bancaria_id,
        frequencia_pagamento,
        descricao,
        tipo_despesa,
        dono_despesa,
        moeda,
      });
  } catch (err) {
    console.error("Error creating expense: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM DESPESAS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query database.");
  }
});

export default router;

import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
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
      "INSERT INTO DESPESAS (nome, valor_total, valor_mensal, numero_parcelas, data_inicio, data_fim, categoria_id, prioridade_id, debito_bancario, conta_bancaria_id, frequencia_pagamento, descricao, tipo_despesa, dono_despesa, moeda) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id",
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
    res.status(201).json({
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

router.get("/", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM DESPESAS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query database.");
  }
});

router.get("/:dono_despesa", async (req, res) => {
  try {
    const now = await pool.query(
      "SELECT * FROM DESPESAS WHERE dono_despesa = $1",
      [req.params.dono_despesa],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query expenses.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
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
      "UPDATE DESPESAS SET nome = $1, valor_total = $2, valor_mensal = $3, numero_parcelas = $4, data_inicio = $5, data_fim = $6, categoria_id = $7, prioridade_id = $8, debito_bancario = $9, conta_bancaria_id = $10, frequencia_pagamento = $11, descricao = $12, tipo_despesa = $13, dono_despesa = $14, moeda = $15 WHERE id = $16 RETURNING *",
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
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating expense: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM DESPESAS WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting expense: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

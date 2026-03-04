import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import {
  assertMonthIsOpen,
  getLockedMonthsMap,
  monthFromDate,
} from "../services/planningService.js";

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
    moeda,
  } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    await assertMonthIsOpen(auth.id, monthFromDate(data_inicio));
    const result = await pool.query(
      "INSERT INTO DESPESAS (nome, valor_total, valor_mensal, numero_parcelas, data_inicio, data_fim, categoria_id, prioridade_id, debito_bancario, conta_bancaria_id, frequencia_pagamento, descricao, tipo_despesa, dono_despesa, moeda) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *",
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
        auth.email,
        moeda,
      ],
    );
    res.status(201).json({ ...result.rows[0], locked: false });
  } catch (err) {
    console.error("Error creating expense: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const now = await pool.query(
      "SELECT * FROM DESPESAS WHERE dono_despesa = $1 ORDER BY data_inicio DESC, id DESC",
      [auth.email],
    );
    const months = [...new Set(now.rows.map((row) => monthFromDate(row.data_inicio)).filter(Boolean))];
    const lockedMap = await getLockedMonthsMap(auth.id, months);
    res.json(
      now.rows.map((row) => ({
        ...row,
        locked: Boolean(lockedMap.get(monthFromDate(row.data_inicio))),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query database.");
  }
});

router.get("/:dono_despesa", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    if (req.params.dono_despesa !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const now = await pool.query(
      "SELECT * FROM DESPESAS WHERE dono_despesa = $1",
      [req.params.dono_despesa],
    );
    const months = [...new Set(now.rows.map((row) => monthFromDate(row.data_inicio)).filter(Boolean))];
    const lockedMap = await getLockedMonthsMap(auth.id, months);
    res.json(
      now.rows.map((row) => ({
        ...row,
        locked: Boolean(lockedMap.get(monthFromDate(row.data_inicio))),
      })),
    );
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
    moeda,
  } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const existing = await pool.query(
      "SELECT id, dono_despesa, data_inicio FROM DESPESAS WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    if (existing.rows[0].dono_despesa !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }

    await assertMonthIsOpen(auth.id, monthFromDate(existing.rows[0].data_inicio));
    await assertMonthIsOpen(auth.id, monthFromDate(data_inicio));

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
        auth.email,
        moeda,
        id,
      ],
    );
    res.json({ ...result.rows[0], locked: false });
  } catch (err) {
    console.error("Error updating expense: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const existing = await pool.query(
      "SELECT id, dono_despesa, data_inicio FROM DESPESAS WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    if (existing.rows[0].dono_despesa !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    await assertMonthIsOpen(auth.id, monthFromDate(existing.rows[0].data_inicio));
    const result = await pool.query(
      "DELETE FROM DESPESAS WHERE id = $1 RETURNING *",
      [id],
    );
    res.json({ ...result.rows[0], locked: false });
  } catch (err) {
    console.error("Error deleting expense: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

export default router;

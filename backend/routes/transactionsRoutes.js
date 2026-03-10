import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import {
  assertMonthIsOpen,
  getLockedMonthsMap,
  monthFromDate,
} from "../services/planningService.js";
import { assertActiveBankAccountOwnership } from "../services/bankAccounts.js";

const router = express.Router();

function serializeExpense(row, locked) {
  return {
    transaction_id: `expense:${row.id}`,
    source_ref: row.id,
    type: "expense",
    amount: Number(row.valor_total),
    date: row.data_inicio,
    description: row.nome,
    category_id: row.categoria_id,
    currency: row.moeda,
    locked,
    raw: row,
  };
}

function serializeIncome(row, locked) {
  return {
    transaction_id: `income:${row.id}`,
    source_ref: row.id,
    type: "income",
    amount: Number(row.valor),
    date: row.data_recebimento,
    description: row.nome,
    category_id: null,
    currency: row.moeda,
    locked,
    raw: row,
  };
}

function parseTransactionId(transactionId) {
  const [type, id] = String(transactionId || "").split(":");
  if (!type || !id) return null;
  if (!["expense", "income"].includes(type)) return null;
  return { type, id: Number(id) };
}

router.get("/", async (req, res) => {
  const { mes } = req.query;
  try {
    const auth = await resolveAuthUser(req);
    const expenseQuery =
      "SELECT * FROM DESPESAS WHERE dono_despesa = $1" +
      (mes ? " AND to_char(data_inicio, 'YYYY-MM') = $2" : "");
    const incomeQuery =
      "SELECT * FROM RECEITAS WHERE dono_receita = $1" +
      (mes ? " AND to_char(data_recebimento, 'YYYY-MM') = $2" : "");
    const params = mes ? [auth.email, mes] : [auth.email];

    const [expenses, incomes] = await Promise.all([
      pool.query(expenseQuery, params),
      pool.query(incomeQuery, params),
    ]);
    const months = [
      ...new Set(
        [
          ...expenses.rows.map((r) => monthFromDate(r.data_inicio)),
          ...incomes.rows.map((r) => monthFromDate(r.data_recebimento)),
        ].filter(Boolean),
      ),
    ];
    const lockedMap = await getLockedMonthsMap(auth.id, months);
    const merged = [
      ...expenses.rows.map((r) =>
        serializeExpense(r, Boolean(lockedMap.get(monthFromDate(r.data_inicio)))),
      ),
      ...incomes.rows.map((r) =>
        serializeIncome(
          r,
          Boolean(lockedMap.get(monthFromDate(r.data_recebimento))),
        ),
      ),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    res.json(merged);
  } catch (err) {
    console.error("Error listing transactions: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/", async (req, res) => {
  const { type, amount, date, description, category_id, currency, raw } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    await assertMonthIsOpen(auth.id, monthFromDate(date));
    if (type === "expense") {
      const bankAccountId = raw?.conta_bancaria_id;
      if (!bankAccountId) {
        return res.status(400).json({ error: "Bank account is required for expenses" });
      }
      await assertActiveBankAccountOwnership(bankAccountId, auth.email);
      const result = await pool.query(
        "INSERT INTO DESPESAS (nome, valor_total, valor_mensal, numero_parcelas, data_inicio, data_fim, categoria_id, prioridade_id, debito_bancario, conta_bancaria_id, frequencia_pagamento, descricao, tipo_despesa, dono_despesa, moeda) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *",
        [
          description,
          amount,
          raw?.valor_mensal ?? amount,
          raw?.numero_parcelas ?? 1,
          date,
          raw?.data_fim ?? date,
          category_id ?? raw?.categoria_id,
          raw?.prioridade_id ?? 1,
          raw?.debito_bancario ?? false,
          bankAccountId,
          raw?.frequencia_pagamento ?? "mensal",
          raw?.descricao ?? description,
          raw?.tipo_despesa ?? "variavel",
          auth.email,
          currency ?? "BRL",
        ],
      );
      return res.status(201).json(serializeExpense(result.rows[0], false));
    }
    if (type === "income") {
      const result = await pool.query(
        "INSERT INTO RECEITAS (nome, valor, dono_receita, data_recebimento, descricao, moeda) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        [description, amount, auth.email, date, raw?.descricao ?? description, currency ?? "BRL"],
      );
      return res.status(201).json(serializeIncome(result.rows[0], false));
    }
    return res.status(400).json({ error: "Invalid transaction type" });
  } catch (err) {
    console.error("Error creating transaction: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.put("/:transactionId", async (req, res) => {
  const parsed = parseTransactionId(req.params.transactionId);
  if (!parsed) return res.status(400).json({ error: "Invalid transaction id" });
  try {
    const auth = await resolveAuthUser(req);
    if (parsed.type === "expense") {
      const row = await pool.query(
        "SELECT * FROM DESPESAS WHERE id = $1 AND dono_despesa = $2",
        [parsed.id, auth.email],
      );
      if (!row.rows.length) return res.status(404).json({ error: "Transaction not found" });
      await assertMonthIsOpen(auth.id, monthFromDate(row.rows[0].data_inicio));
      const r = await pool.query(
        "UPDATE DESPESAS SET nome = $1, valor_total = $2, moeda = $3, descricao = $4 WHERE id = $5 RETURNING *",
        [req.body.description, req.body.amount, req.body.currency, req.body.description, parsed.id],
      );
      return res.json(serializeExpense(r.rows[0], false));
    }
    const row = await pool.query(
      "SELECT * FROM RECEITAS WHERE id = $1 AND dono_receita = $2",
      [parsed.id, auth.email],
    );
    if (!row.rows.length) return res.status(404).json({ error: "Transaction not found" });
    await assertMonthIsOpen(auth.id, monthFromDate(row.rows[0].data_recebimento));
    const r = await pool.query(
      "UPDATE RECEITAS SET nome = $1, valor = $2, moeda = $3, descricao = $4 WHERE id = $5 RETURNING *",
      [req.body.description, req.body.amount, req.body.currency, req.body.description, parsed.id],
    );
    return res.json(serializeIncome(r.rows[0], false));
  } catch (err) {
    console.error("Error updating transaction: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.delete("/:transactionId", async (req, res) => {
  const parsed = parseTransactionId(req.params.transactionId);
  if (!parsed) return res.status(400).json({ error: "Invalid transaction id" });
  try {
    const auth = await resolveAuthUser(req);
    if (parsed.type === "expense") {
      const row = await pool.query(
        "SELECT data_inicio FROM DESPESAS WHERE id = $1 AND dono_despesa = $2",
        [parsed.id, auth.email],
      );
      if (!row.rows.length) return res.status(404).json({ error: "Transaction not found" });
      await assertMonthIsOpen(auth.id, monthFromDate(row.rows[0].data_inicio));
      await pool.query("DELETE FROM DESPESAS WHERE id = $1", [parsed.id]);
      return res.json({ deleted: true });
    }
    const row = await pool.query(
      "SELECT data_recebimento FROM RECEITAS WHERE id = $1 AND dono_receita = $2",
      [parsed.id, auth.email],
    );
    if (!row.rows.length) return res.status(404).json({ error: "Transaction not found" });
    await assertMonthIsOpen(auth.id, monthFromDate(row.rows[0].data_recebimento));
    await pool.query("DELETE FROM RECEITAS WHERE id = $1", [parsed.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error("Error deleting transaction: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

export default router;

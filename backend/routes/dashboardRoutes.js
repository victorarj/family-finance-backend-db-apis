import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

router.get("/", async (req, res) => {
  const mes = String(req.query.mes || currentMonth());
  try {
    const auth = await resolveAuthUser(req);

    const income = await pool.query(
      "SELECT COALESCE(SUM(valor),0) AS total FROM RECEITAS WHERE dono_receita = $1 AND to_char(data_recebimento, 'YYYY-MM') = $2",
      [auth.email, mes],
    );
    const expenses = await pool.query(
      "SELECT COALESCE(SUM(valor_total),0) AS total FROM DESPESAS WHERE dono_despesa = $1 AND to_char(data_inicio, 'YYYY-MM') = $2",
      [auth.email, mes],
    );
    const recurringIncome = await pool.query(
      "SELECT COALESCE(SUM(valor),0) AS total FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'income'",
      [auth.id],
    );
    const recurringExpense = await pool.query(
      "SELECT COALESCE(SUM(valor),0) AS total FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'expense'",
      [auth.id],
    );
    const budgets = await pool.query(
      "SELECT COALESCE(SUM(valor_planejado),0) AS total FROM ORCAMENTOS_MENSAIS WHERE usuario_id = $1 AND mes = $2",
      [auth.id, mes],
    );

    const incomeMtd = Number(income.rows[0].total) + Number(recurringIncome.rows[0].total);
    const expensesMtd = Number(expenses.rows[0].total) + Number(recurringExpense.rows[0].total);
    const projection = incomeMtd - Number(recurringExpense.rows[0].total) - Number(budgets.rows[0].total);
    const monthStatus = await deriveMonthStatus(auth.id, mes);

    res.json({
      month: mes,
      balance: incomeMtd - expensesMtd,
      income_mtd: incomeMtd,
      expenses_mtd: expensesMtd,
      projection,
      month_status: monthStatus,
    });
  } catch (err) {
    console.error("Error building dashboard: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

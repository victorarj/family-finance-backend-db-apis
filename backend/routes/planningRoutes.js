import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function getPlanningTotals(user, mes) {
  const income = await pool.query(
    "SELECT COALESCE(SUM(valor),0) AS total FROM RECEITAS WHERE dono_receita = $1 AND to_char(data_recebimento, 'YYYY-MM') = $2",
    [user.email, mes],
  );
  const expenses = await pool.query(
    "SELECT COALESCE(SUM(valor_total),0) AS total FROM DESPESAS WHERE dono_despesa = $1 AND to_char(data_inicio, 'YYYY-MM') = $2",
    [user.email, mes],
  );
  const recurringIncome = await pool.query(
    "SELECT COALESCE(SUM(valor),0) AS total FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'income'",
    [user.id],
  );
  const recurringExpense = await pool.query(
    "SELECT COALESCE(SUM(valor),0) AS total FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'expense'",
    [user.id],
  );
  const budgets = await pool.query(
    "SELECT COALESCE(SUM(valor_planejado),0) AS total FROM ORCAMENTOS_MENSAIS WHERE usuario_id = $1 AND mes = $2",
    [user.id, mes],
  );
  return {
    income: Number(income.rows[0].total) + Number(recurringIncome.rows[0].total),
    expenses: Number(expenses.rows[0].total),
    recurringExpense: Number(recurringExpense.rows[0].total),
    budgets: Number(budgets.rows[0].total),
  };
}

router.get("/summary", async (req, res) => {
  const mes = String(req.query.mes || currentMonth());
  try {
    const user = await resolveAuthUser(req);
    const totals = await getPlanningTotals(user, mes);
    res.json({
      month: mes,
      total_income: totals.income,
      total_expenses: totals.expenses + totals.recurringExpense,
      largest_increase_category: null,
      largest_decrease_category: null,
    });
  } catch (err) {
    console.error("Error generating planning summary: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/projection", async (req, res) => {
  const mes = String(req.query.mes || currentMonth());
  try {
    const user = await resolveAuthUser(req);
    const totals = await getPlanningTotals(user, mes);
    const projectedBalance =
      totals.income - totals.expenses - totals.recurringExpense - totals.budgets;
    res.json({
      month: mes,
      income: totals.income,
      expenses_logged: totals.expenses,
      fixed_expenses: totals.recurringExpense,
      planned_variable: totals.budgets,
      projected_balance: projectedBalance,
    });
  } catch (err) {
    console.error("Error generating planning projection: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/status", async (req, res) => {
  const mes = String(req.query.mes || currentMonth());
  try {
    const user = await resolveAuthUser(req);
    const status = await deriveMonthStatus(user.id, mes);
    res.json({ month: mes, status });
  } catch (err) {
    console.error("Error calculating month status: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

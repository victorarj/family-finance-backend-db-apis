import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";
import { getProjectionDataForMonth } from "../services/projectionService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

router.get("/", async (req, res) => {
  const mes = String(req.query.mes || currentMonth());
  try {
    const auth = await resolveAuthUser(req);
    const projectionData = await getProjectionDataForMonth(auth, mes);
    const monthStatus = await deriveMonthStatus(auth.id, mes);
    const snapshotResult = await pool.query(
      "SELECT total_receitas, total_fixas, total_variaveis, saldo_projetado FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 AND mes = $2 ORDER BY created_at DESC LIMIT 1",
      [auth.id, mes],
    );
    const snapshot = snapshotResult.rows[0] || null;
    const actualIncome = projectionData.incomeLogged;
    const actualExpenses = projectionData.expensesLogged;
    const actualBalance = actualIncome - actualExpenses;
    const plannedIncome = snapshot ? Number(snapshot.total_receitas) : null;
    const plannedExpenses = snapshot
      ? Number(snapshot.total_fixas) + Number(snapshot.total_variaveis)
      : null;
    const plannedBalance = snapshot ? Number(snapshot.saldo_projetado) : null;

    res.json({
      month: mes,
      balance: projectionData.totalIncome - projectionData.totalExpenses,
      income_mtd: projectionData.totalIncome,
      expenses_mtd: projectionData.totalExpenses,
      projection: projectionData.projectedBalance,
      month_status: monthStatus,
      planned_income: plannedIncome,
      planned_expenses: plannedExpenses,
      actual_income: actualIncome,
      actual_expenses: actualExpenses,
      planned_vs_actual_diff:
        plannedBalance === null ? null : actualBalance - plannedBalance,
    });
  } catch (err) {
    console.error("Error building dashboard: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

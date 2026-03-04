import express from "express";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";
import { getProjectionDataForMonth } from "../services/projectionService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

router.get("/summary", async (req, res) => {
  const mes = String(req.query.mes || currentMonth());
  try {
    const user = await resolveAuthUser(req);
    const projection = await getProjectionDataForMonth(user, mes);
    res.json({
      month: mes,
      total_income: projection.totalIncome,
      total_expenses: projection.totalExpenses,
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
    const projection = await getProjectionDataForMonth(user, mes);
    res.json({
      month: mes,
      income: projection.totalIncome,
      expenses_logged: projection.expensesLogged,
      fixed_expenses: projection.fixedExpenses,
      planned_variable: projection.plannedVariable,
      projected_balance: projection.projectedBalance,
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

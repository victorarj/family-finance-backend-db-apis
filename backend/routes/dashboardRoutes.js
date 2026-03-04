import express from "express";
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

    res.json({
      month: mes,
      balance: projectionData.totalIncome - projectionData.totalExpenses,
      income_mtd: projectionData.totalIncome,
      expenses_mtd: projectionData.totalExpenses,
      projection: projectionData.projectedBalance,
      month_status: monthStatus,
    });
  } catch (err) {
    console.error("Error building dashboard: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

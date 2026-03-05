import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";
import {
  computeSnapshotData,
  requiresNegativeConfirmation,
  snapshotExistsForMonth,
} from "../services/snapshotService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const mes = req.query.mes ? String(req.query.mes) : null;
    const result = mes
      ? await pool.query(
          "SELECT * FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 AND mes = $2 ORDER BY created_at DESC",
          [auth.id, mes],
        )
      : await pool.query(
          "SELECT * FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 ORDER BY mes DESC",
          [auth.id],
        );
    res.json(result.rows);
  } catch (err) {
    console.error("Error querying snapshots: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/", async (req, res) => {
  const mes = String(req.body.mes || currentMonth());
  try {
    const auth = await resolveAuthUser(req);
    if (await snapshotExistsForMonth(auth.id, mes)) {
      return res.status(409).json({ error: "Snapshot already exists for month" });
    }
    const computed = await computeSnapshotData(auth, mes);
    const totalReceitas = computed.totalReceitas;
    const totalFixas = computed.totalFixas;
    const totalVariaveis = computed.totalVariaveis;
    const saldoProjetado = computed.saldoProjetado;
    const confirmNegative = req.body.confirm_negative === true;
    if (requiresNegativeConfirmation(saldoProjetado, confirmNegative)) {
      return res.status(409).json({
        error:
          "Your projected balance is negative or zero. Are you sure you want to confirm planning?",
      });
    }
    const result = await pool.query(
      "INSERT INTO SNAPSHOTS_MENSAIS (usuario_id, mes, total_receitas, total_fixas, total_variaveis, saldo_projetado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [auth.id, mes, totalReceitas, totalFixas, totalVariaveis, saldoProjetado],
    );
    await pool.query(
      "UPDATE USUARIOS SET planning_completed_at = NOW() WHERE id = $1",
      [auth.id],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating snapshot: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/:id/details", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const snapshotResult = await pool.query(
      "SELECT * FROM SNAPSHOTS_MENSAIS WHERE id = $1 AND usuario_id = $2 LIMIT 1",
      [req.params.id, auth.id],
    );
    if (!snapshotResult.rows.length) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    const snapshot = snapshotResult.rows[0];
    const incomeResult = await pool.query(
      "SELECT COALESCE(SUM(valor),0) AS total FROM RECEITAS WHERE dono_receita = $1 AND to_char(data_recebimento, 'YYYY-MM') = $2",
      [auth.email, snapshot.mes],
    );
    const expensesResult = await pool.query(
      "SELECT COALESCE(SUM(valor_total),0) AS total FROM DESPESAS WHERE dono_despesa = $1 AND to_char(data_inicio, 'YYYY-MM') = $2",
      [auth.email, snapshot.mes],
    );

    const actualIncome = Number(incomeResult.rows[0].total);
    const actualExpenses = Number(expensesResult.rows[0].total);
    const plannedIncome = Number(snapshot.total_receitas);
    const plannedExpenses =
      Number(snapshot.total_fixas) + Number(snapshot.total_variaveis);
    const plannedBalance = Number(snapshot.saldo_projetado);
    const actualBalance = actualIncome - actualExpenses;

    res.json({
      snapshot,
      planned_income: plannedIncome,
      planned_expenses: plannedExpenses,
      projected_balance: plannedBalance,
      actual_income: actualIncome,
      actual_expenses: actualExpenses,
      planned_vs_actual_diff: actualBalance - plannedBalance,
    });
  } catch (err) {
    console.error("Error querying snapshot details: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const isAdmin = auth.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      return res.status(403).json({ error: "admin only endpoint" });
    }
    const result = await pool.query(
      "DELETE FROM SNAPSHOTS_MENSAIS WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    const snapshot = result.rows[0];
    const status = await deriveMonthStatus(snapshot.usuario_id, snapshot.mes);
    res.json({ deleted: snapshot, recalculated_status: status });
  } catch (err) {
    console.error("Error deleting snapshot: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

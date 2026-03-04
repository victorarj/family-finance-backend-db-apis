import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";
import { getProjectionDataForMonth } from "../services/projectionService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function computeSnapshotData(user, mes) {
  const projection = await getProjectionDataForMonth(user, mes);
  const totalReceitas = projection.totalIncome;
  const totalFixas = projection.fixedExpenses;
  const totalVariaveis = projection.plannedVariable;
  const saldoProjetado = projection.projectedBalance;
  return { totalReceitas, totalFixas, totalVariaveis, saldoProjetado };
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
    const existing = await pool.query(
      "SELECT 1 FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 AND mes = $2",
      [auth.id, mes],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Snapshot already exists for month" });
    }
    const computed = await computeSnapshotData(auth, mes);
    const totalReceitas = computed.totalReceitas;
    const totalFixas = computed.totalFixas;
    const totalVariaveis = computed.totalVariaveis;
    const saldoProjetado = computed.saldoProjetado;
    const confirmNegative = req.body.confirm_negative === true;
    if (Number(saldoProjetado) <= 0 && !confirmNegative) {
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

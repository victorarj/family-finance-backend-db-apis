import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { deriveMonthStatus } from "../services/planningService.js";

const router = express.Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function computeSnapshotData(user, mes) {
  const income = await pool.query(
    "SELECT COALESCE(SUM(valor),0) AS total FROM RECEITAS WHERE dono_receita = $1 AND to_char(data_recebimento, 'YYYY-MM') = $2",
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
  const totalReceitas = Number(income.rows[0].total) + Number(recurringIncome.rows[0].total);
  const totalFixas = Number(recurringExpense.rows[0].total);
  const totalVariaveis = Number(budgets.rows[0].total);
  const saldoProjetado = totalReceitas - totalFixas - totalVariaveis;
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
    const totalReceitas = req.body.total_receitas ?? computed.totalReceitas;
    const totalFixas = req.body.total_fixas ?? computed.totalFixas;
    const totalVariaveis = req.body.total_variaveis ?? computed.totalVariaveis;
    const saldoProjetado = req.body.saldo_projetado ?? computed.saldoProjetado;
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

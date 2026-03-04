import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { assertMonthIsOpen } from "../services/planningService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { mes } = req.query;
  try {
    const auth = await resolveAuthUser(req);
    const result = mes
      ? await pool.query(
          "SELECT * FROM ALOCACOES_SUPERAVIT WHERE usuario_id = $1 AND mes = $2 ORDER BY created_at DESC",
          [auth.id, mes],
        )
      : await pool.query(
          "SELECT * FROM ALOCACOES_SUPERAVIT WHERE usuario_id = $1 ORDER BY mes DESC, created_at DESC",
          [auth.id],
        );
    res.json(result.rows);
  } catch (err) {
    console.error("Error listing allocations: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/", async (req, res) => {
  const { mes, tipo_alocacao, valor } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    await assertMonthIsOpen(auth.id, mes);
    const result = await pool.query(
      "INSERT INTO ALOCACOES_SUPERAVIT (usuario_id, mes, tipo_alocacao, valor) VALUES ($1, $2, $3, $4) RETURNING *",
      [auth.id, mes, tipo_alocacao, valor],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating allocation: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const current = await pool.query(
      "SELECT mes FROM ALOCACOES_SUPERAVIT WHERE id = $1 AND usuario_id = $2",
      [req.params.id, auth.id],
    );
    if (!current.rows.length) {
      return res.status(404).json({ error: "Allocation not found" });
    }
    await assertMonthIsOpen(auth.id, current.rows[0].mes);
    const result = await pool.query(
      "DELETE FROM ALOCACOES_SUPERAVIT WHERE id = $1 AND usuario_id = $2 RETURNING *",
      [req.params.id, auth.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting allocation: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

export default router;

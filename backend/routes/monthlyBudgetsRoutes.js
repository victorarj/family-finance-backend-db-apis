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
          "SELECT * FROM ORCAMENTOS_MENSAIS WHERE usuario_id = $1 AND mes = $2 ORDER BY categoria_id",
          [auth.id, mes],
        )
      : await pool.query(
          "SELECT * FROM ORCAMENTOS_MENSAIS WHERE usuario_id = $1 ORDER BY mes DESC, categoria_id",
          [auth.id],
        );
    res.json(result.rows);
  } catch (err) {
    console.error("Error listing budgets: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/", async (req, res) => {
  const { mes, categoria_id, valor_planejado } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    await assertMonthIsOpen(auth.id, mes);
    const result = await pool.query(
      "INSERT INTO ORCAMENTOS_MENSAIS (usuario_id, mes, categoria_id, valor_planejado) VALUES ($1, $2, $3, $4) ON CONFLICT (usuario_id, mes, categoria_id) DO UPDATE SET valor_planejado = EXCLUDED.valor_planejado, updated_at = NOW() RETURNING *",
      [auth.id, mes, categoria_id, valor_planejado],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving budget: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { valor_planejado } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const current = await pool.query(
      "SELECT mes FROM ORCAMENTOS_MENSAIS WHERE id = $1 AND usuario_id = $2",
      [id, auth.id],
    );
    if (!current.rows.length) {
      return res.status(404).json({ error: "Budget not found" });
    }
    await assertMonthIsOpen(auth.id, current.rows[0].mes);
    const result = await pool.query(
      "UPDATE ORCAMENTOS_MENSAIS SET valor_planejado = $1, updated_at = NOW() WHERE id = $2 AND usuario_id = $3 RETURNING *",
      [valor_planejado, id, auth.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating budget: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const current = await pool.query(
      "SELECT mes FROM ORCAMENTOS_MENSAIS WHERE id = $1 AND usuario_id = $2",
      [id, auth.id],
    );
    if (!current.rows.length) {
      return res.status(404).json({ error: "Budget not found" });
    }
    await assertMonthIsOpen(auth.id, current.rows[0].mes);
    const result = await pool.query(
      "DELETE FROM ORCAMENTOS_MENSAIS WHERE id = $1 AND usuario_id = $2 RETURNING *",
      [id, auth.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting budget: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

export default router;

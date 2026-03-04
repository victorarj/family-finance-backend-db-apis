import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "SELECT * FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 ORDER BY id DESC",
      [auth.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error listing recurring transactions: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/", async (req, res) => {
  const { categoria_id, tipo, descricao, valor, frequencia, ativo } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "INSERT INTO TRANSACOES_RECORRENTES (usuario_id, categoria_id, tipo, descricao, valor, frequencia, ativo) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE)) RETURNING *",
      [auth.id, categoria_id, tipo, descricao, valor, frequencia || "mensal", ativo],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating recurring transaction: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { categoria_id, tipo, descricao, valor, frequencia, ativo } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "UPDATE TRANSACOES_RECORRENTES SET categoria_id = $1, tipo = $2, descricao = $3, valor = $4, frequencia = $5, ativo = COALESCE($6, ativo), updated_at = NOW() WHERE id = $7 AND usuario_id = $8 RETURNING *",
      [categoria_id, tipo, descricao, valor, frequencia, ativo, id, auth.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recurring transaction not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating recurring transaction: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "UPDATE TRANSACOES_RECORRENTES SET ativo = FALSE, updated_at = NOW() WHERE id = $1 AND usuario_id = $2 RETURNING *",
      [id, auth.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recurring transaction not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error disabling recurring transaction: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

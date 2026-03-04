import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "SELECT * FROM PREFERENCIAS_USUARIO WHERE usuario_id = $1",
      [auth.id],
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("Error querying preferences: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/", async (req, res) => {
  const { tipo_residencia, modo_registro, planejamento_guiado } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "INSERT INTO PREFERENCIAS_USUARIO (usuario_id, tipo_residencia, modo_registro, planejamento_guiado) VALUES ($1, $2, $3, $4) ON CONFLICT (usuario_id) DO UPDATE SET tipo_residencia = EXCLUDED.tipo_residencia, modo_registro = EXCLUDED.modo_registro, planejamento_guiado = EXCLUDED.planejamento_guiado, updated_at = NOW() RETURNING *",
      [auth.id, tipo_residencia, modo_registro, planejamento_guiado],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving preferences: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

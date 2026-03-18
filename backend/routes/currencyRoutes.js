import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { codigo } = req.body;
  try {
    const normalized = String(codigo || "").toUpperCase();
    const result = await pool.query(
      "INSERT INTO MOEDAS (codigo) VALUES ($1) RETURNING codigo",
      [normalized],
    );
    res.status(201).json({ codigo: result.rows[0].codigo });
  } catch (err) {
    console.error("Error creating currency: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM MOEDAS ORDER BY codigo");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query currencies.");
  }
});

router.put("/:codigo", async (req, res) => {
  const { codigo } = req.params;
  const { novo_codigo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE MOEDAS SET codigo = $1 WHERE codigo = $2 RETURNING *",
      [String(novo_codigo || "").toUpperCase(), String(codigo).toUpperCase()],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating currency: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:codigo", async (req, res) => {
  const { codigo } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM MOEDAS WHERE codigo = $1 RETURNING *",
      [String(codigo).toUpperCase()],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

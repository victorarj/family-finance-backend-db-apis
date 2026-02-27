import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { nome, nivel } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO PRIORIDADES (nome, nivel) VALUES ($1, $2) RETURNING id",
      [nome, nivel],
    );
    res.status(201).json({ id: result.rows[0].id, nome, nivel });
  } catch (err) {
    console.error("Error creating prioridade: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM PRIORIDADES");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query priorities.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, nivel } = req.body;
  try {
    const result = await pool.query(
      "UPDATE PRIORIDADES SET nome = $1, nivel = $2 WHERE id = $3 RETURNING *",
      [nome, nivel, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Priority not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating priority: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM PRIORIDADES WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Priority not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting priority: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

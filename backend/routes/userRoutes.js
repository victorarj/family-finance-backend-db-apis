import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM USUARIOS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query users.");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM USUARIOS WHERE id = $1", [
      req.params.id,
    ]);
    res.json(now.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query users.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, telefone } = req.body;
  try {
    const result = await pool.query(
      "UPDATE USUARIOS SET nome = $1, email = $2, senha = $3, telefone = $4 WHERE id = $5 RETURNING *",
      [nome, email, senha, telefone, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM USUARIOS WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

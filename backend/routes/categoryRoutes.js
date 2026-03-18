import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { nome } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO CATEGORIAS (nome) VALUES ($1) RETURNING *",
      [nome],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === "true";
    const now = includeInactive
      ? await pool.query("SELECT * FROM CATEGORIAS ORDER BY nome")
      : await pool.query("SELECT * FROM CATEGORIAS WHERE ativo = TRUE ORDER BY nome");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query categories.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;
  try {
    const result = await pool.query(
      "UPDATE CATEGORIAS SET nome = $1 WHERE id = $2 RETURNING *",
      [nome, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE CATEGORIAS SET ativo = FALSE WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

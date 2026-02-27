import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { codigo } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO MOEDAS (codigo) VALUES ($1) RETURNING id",
      [codigo],
    );
    res.status(201).json({ codigo: result.rows[0].codigo, codigo });
  } catch (err) {
    console.error("Error creating currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM MOEDAS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query currencies.");
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { codigo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE MOEDAS SET codigo = $1 WHERE id = $2 RETURNING *",
      [codigo, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM MOEDAS WHERE id = $1 RETURNING *",
      [id],
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

import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { nome } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO CATEGORIAS (nome) VALUES ($1) RETURNING id",
      [nome],
    );
    res.status(201).json({ id: result.rows[0].id, nome });
  } catch (err) {
    console.error("Error creating category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM CATEGORIAS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query categories.");
  }
});

export default router;

import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
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

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM PRIORIDADES");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query priorities.");
  }
});

export default router;

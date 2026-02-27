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

export default router;

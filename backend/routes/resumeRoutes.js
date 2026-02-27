import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { nome_resumo, total_despesas, total_receitas, saldo, data_resumo } =
    req.body;
  try {
    const result = await pool.query(
      "INSERT INTO RESUMOS (nome_resumo, total_despesas, total_receitas, saldo, data_resumo) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [nome_resumo, total_despesas, total_receitas, saldo, data_resumo],
    );
    res.status(201).json({
      id: result.rows[0].id,
      nome_resumo,
      total_despesas,
      total_receitas,
      saldo,
      data_resumo,
    });
  } catch (err) {
    console.error("Error creating resume: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM RESUMOS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query resumes.");
  }
});

export default router;

import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const {
    nome_resumo,
    total_despesas,
    total_receitas,
    saldo,
    data_resumo,
    dono_resumo,
  } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO RESUMOS (nome_resumo, total_despesas, total_receitas, saldo, data_resumo, dono_resumo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        nome_resumo,
        total_despesas,
        total_receitas,
        saldo,
        data_resumo,
        dono_resumo,
      ],
    );
    res.status(201).json({
      id: result.rows[0].id,
      nome_resumo,
      total_despesas,
      total_receitas,
      saldo,
      data_resumo,
      dono_resumo,
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

router.get("/find/:dono_resumo", async (req, res) => {
  try {
    const now = await pool.query(
      "SELECT * FROM RESUMOS WHERE dono_resumo = $1",
      [req.params.dono_resumo],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query resumes.");
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_resumo, total_despesas, total_receitas, saldo, data_resumo } =
    req.body;
  try {
    const result = await pool.query(
      "UPDATE RESUMOS SET nome_resumo = $1, total_despesas = $2, total_receitas = $3, saldo = $4, data_resumo = $5 WHERE id = $6 RETURNING *",
      [nome_resumo, total_despesas, total_receitas, saldo, data_resumo, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resume not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating resume: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM RESUMOS WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resume not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting resume: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { nome, valor, dono_receita, data_recebimento, descricao, moeda } =
    req.body;
  try {
    const result = await pool.query(
      "INSERT INTO RECEITAS (nome, valor, dono_receita, data_recebimento, descricao, moeda) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [nome, valor, dono_receita, data_recebimento, descricao, moeda],
    );
    res.status(201).json({
      id: result.rows[0].id,
      nome,
      valor,
      dono_receita,
      data_recebimento,
      descricao,
      moeda,
    });
  } catch (err) {
    console.error("Error creating recipe: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM RECEITAS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query recipes.");
  }
});

export default router;

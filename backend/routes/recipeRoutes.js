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

router.get("/find/:dono_receita", async (req, res) => {
  try {
    const now = await pool.query(
      "SELECT * FROM RECEITAS WHERE dono_receita = $1",
      [req.params.dono_receita],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query recipes.");
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, valor, dono_receita, data_recebimento, descricao, moeda } =
    req.body;
  try {
    const result = await pool.query(
      "UPDATE RECEITAS SET nome = $1, valor = $2, dono_receita = $3, data_recebimento = $4, descricao = $5, moeda = $6 WHERE id = $7 RETURNING *",
      [nome, valor, dono_receita, data_recebimento, descricao, moeda, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating recipe: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM RECEITAS WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting recipe: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

//distribuicoes table.
import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const {
    dono_distribuicao,
    nome_distribuicao,
    data_distribuicao,
    valor_distribuido,
    moeda,
  } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO DISTRIBUICOES (dono_distribuicao, nome_distribuicao, data_distribuicao, valor_distribuido, moeda) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        dono_distribuicao,
        nome_distribuicao,
        data_distribuicao,
        valor_distribuido,
        moeda,
      ],
    );
    res.status(201).json({
      id: result.rows[0].id,
      dono_distribuicao,
      nome_distribuicao,
      data_distribuicao,
      valor_distribuido,
      moeda,
    });
  } catch (err) {
    console.error("Error creating distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM DISTRIBUICOES");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query distributions.");
  }
});

export default router;

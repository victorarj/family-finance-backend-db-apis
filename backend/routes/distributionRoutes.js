//distribuicoes table.
import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
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

router.get("/", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM DISTRIBUICOES");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query distributions.");
  }
});

router.get("/:dono_distribuicao", async (req, res) => {
  try {
    const now = await pool.query(
      "SELECT * FROM DISTRIBUICOES WHERE dono_distribuicao = $1",
      [req.params.dono_distribuicao],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query distributions.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    dono_distribuicao,
    nome_distribuicao,
    data_distribuicao,
    valor_distribuido,
    moeda,
  } = req.body;
  try {
    const result = await pool.query(
      "UPDATE DISTRIBUICOES SET dono_distribuicao = $1, nome_distribuicao = $2, data_distribuicao = $3, valor_distribuido = $4, moeda = $5 WHERE id = $6 RETURNING *",
      [
        dono_distribuicao,
        nome_distribuicao,
        data_distribuicao,
        valor_distribuido,
        moeda,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM DISTRIBUICOES WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

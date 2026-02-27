import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { nome_representatividade, percentual, dono_representatividade } =
    req.body;
  try {
    const result = await pool.query(
      "INSERT INTO REPRESENTATIVIDADES (nome_representatividade, percentual, dono_representatividade) VALUES ($1, $2, $3) RETURNING id",
      [nome_representatividade, percentual, dono_representatividade],
    );
    res.status(201).json({
      id: result.rows[0].id,
      nome_representatividade,
      percentual,
      dono_representatividade,
    });
  } catch (err) {
    console.error("Error creating tax: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM REPRESENTATIVIDADES");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query taxes.");
  }
});

router.get("/:dono_representatividade", async (req, res) => {
  try {
    const now = await pool.query(
      "SELECT * FROM REPRESENTATIVIDADES WHERE dono_representatividade = $1",
      [req.params.dono_representatividade],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query taxes.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_representatividade, percentual, dono_representatividade } =
    req.body;
  try {
    const result = await pool.query(
      "UPDATE REPRESENTATIVIDADES SET nome_representatividade = $1, percentual = $2, dono_representatividade = $3 WHERE id = $4 RETURNING *",
      [nome_representatividade, percentual, dono_representatividade, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tax not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating tax: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM REPRESENTATIVIDADES WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tax not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting tax: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

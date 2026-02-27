import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
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

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM REPRESENTATIVIDADES");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query taxes.");
  }
});

export default router;

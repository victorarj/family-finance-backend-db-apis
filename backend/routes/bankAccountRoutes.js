import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { nome_conta, dono_conta, banco, moeda } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO CONTAS_BANCARIAS (nome_conta, dono_conta, banco, moeda) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome_conta, dono_conta, banco, moeda],
    );
    res
      .status(201)
      .json({ id: result.rows[0].id, nome_conta, dono_conta, banco, moeda });
  } catch (err) {
    console.error("Error creating bank account: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM CONTAS_BANCARIAS");
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query database.");
  }
});

export default router;

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

router.get("/find/:dono_conta", async (req, res) => {
  try {
    const now = await pool.query(
      "SELECT * FROM CONTAS_BANCARIAS WHERE dono_conta = $1",
      [req.params.dono_conta],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query bank accounts.");
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_conta, dono_conta, banco, moeda } = req.body;
  try {
    const result = await pool.query(
      "UPDATE CONTAS_BANCARIAS SET nome_conta = $1, dono_conta = $2, banco = $3, moeda = $4 WHERE id = $5 RETURNING *",
      [nome_conta, dono_conta, banco, moeda, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bank account not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating bank account: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM CONTAS_BANCARIAS WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bank account not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting bank account: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

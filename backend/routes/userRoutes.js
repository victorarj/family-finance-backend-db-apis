import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { nome, email, senha, telefone } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO USUARIOS (nome, email, senha, telefone) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, email, senha, telefone],
    );
    res.status(201).json({ id: result.rows[0].id, nome, email, telefone });
  } catch (err) {
    console.error("Error creating user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/find/:id", async (req, res) => {
  try {
    const now = await pool.query("SELECT * FROM USUARIOS WHERE id = $1", [
      req.params.id,
    ]);
    res.json(now.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query users.");
  }
});

export default router;

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();

router.post("/", async (req, res) => {
  const { nome, email, senha, telefone } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(senha, salt);

  try {
    const result = await pool.query(
      "INSERT INTO USUARIOS (nome, email, senha, telefone) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, email, hashedPassword, telefone],
    );
    res.status(201).json({ id: result.rows[0].id, nome, email, telefone });
  } catch (err) {
    console.error("Error creating user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM USUARIOS WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      userId: user.id,
      email: user.email,
      nome: user.nome,
    });
  } catch (err) {
    console.error("Error logging in: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

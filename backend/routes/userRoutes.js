import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { nome, email, senha, telefone } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);
    const result = await pool.query(
      "INSERT INTO USUARIOS (nome, email, senha, telefone) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, telefone",
      [nome, email, hashedPassword, telefone],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const now = await pool.query(
      "SELECT id, nome, email, telefone FROM USUARIOS WHERE id = $1",
      [auth.id],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query users.");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    if (Number(req.params.id) !== auth.id) {
      return res.status(403).json({ error: "forbidden" });
    }
    const now = await pool.query(
      "SELECT id, nome, email, telefone FROM USUARIOS WHERE id = $1",
      [req.params.id],
    );
    res.json(now.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query users.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, telefone } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    if (Number(id) !== auth.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    let password = null;
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      password = await bcrypt.hash(senha, salt);
    }

    const result = await pool.query(
      "UPDATE USUARIOS SET nome = $1, email = $2, senha = COALESCE($3, senha), telefone = $4 WHERE id = $5 RETURNING id, nome, email, telefone",
      [nome, email, password, telefone, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    if (Number(id) !== auth.id) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await pool.query(
      "DELETE FROM USUARIOS WHERE id = $1 RETURNING id, nome, email, telefone",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting user: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;

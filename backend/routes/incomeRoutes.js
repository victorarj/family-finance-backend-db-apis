import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import {
  assertMonthIsOpen,
  getLockedMonthsMap,
  monthFromDate,
} from "../services/planningService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { nome, valor, data_recebimento, descricao, moeda } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      "INSERT INTO RECEITAS (nome, valor, dono_receita, data_recebimento, descricao, moeda) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [nome, valor, auth.email, data_recebimento, descricao, moeda],
    );
    res.status(201).json({ ...result.rows[0], locked: false });
  } catch (err) {
    console.error("Error creating income: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const now = await pool.query(
      "SELECT * FROM RECEITAS WHERE dono_receita = $1 ORDER BY data_recebimento DESC, id DESC",
      [auth.email],
    );
    const months = [...new Set(now.rows.map((row) => monthFromDate(row.data_recebimento)).filter(Boolean))];
    const lockedMap = await getLockedMonthsMap(auth.id, months);
    res.json(
      now.rows.map((row) => ({
        ...row,
        locked: Boolean(lockedMap.get(monthFromDate(row.data_recebimento))),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query incomes.");
  }
});

router.get("/:dono_receita", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    if (req.params.dono_receita !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const now = await pool.query(
      "SELECT * FROM RECEITAS WHERE dono_receita = $1",
      [req.params.dono_receita],
    );
    const months = [...new Set(now.rows.map((row) => monthFromDate(row.data_recebimento)).filter(Boolean))];
    const lockedMap = await getLockedMonthsMap(auth.id, months);
    res.json(
      now.rows.map((row) => ({
        ...row,
        locked: Boolean(lockedMap.get(monthFromDate(row.data_recebimento))),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query incomes.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, valor, data_recebimento, descricao, moeda } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const existing = await pool.query(
      "SELECT id, dono_receita, data_recebimento FROM RECEITAS WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Income not found" });
    }
    if (existing.rows[0].dono_receita !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    await assertMonthIsOpen(auth.id, monthFromDate(existing.rows[0].data_recebimento));
    await assertMonthIsOpen(auth.id, monthFromDate(data_recebimento));
    const result = await pool.query(
      "UPDATE RECEITAS SET nome = $1, valor = $2, dono_receita = $3, data_recebimento = $4, descricao = $5, moeda = $6 WHERE id = $7 RETURNING *",
      [nome, valor, auth.email, data_recebimento, descricao, moeda, id],
    );
    res.json({ ...result.rows[0], locked: false });
  } catch (err) {
    console.error("Error updating income: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const existing = await pool.query(
      "SELECT id, dono_receita, data_recebimento FROM RECEITAS WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Income not found" });
    }
    if (existing.rows[0].dono_receita !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    await assertMonthIsOpen(auth.id, monthFromDate(existing.rows[0].data_recebimento));
    const result = await pool.query(
      "DELETE FROM RECEITAS WHERE id = $1 RETURNING *",
      [id],
    );
    res.json({ ...result.rows[0], locked: false });
  } catch (err) {
    console.error("Error deleting income: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

export default router;

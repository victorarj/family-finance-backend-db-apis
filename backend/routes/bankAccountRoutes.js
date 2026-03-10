import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import {
  assertValidBankAccountInput,
  getBankAccountByIdForOwner,
  listBankAccountsByOwner,
  serializeBankAccount,
} from "../services/bankAccounts.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const { nome_conta, banco, moeda } = await assertValidBankAccountInput(req.body);
    const result = await pool.query(
      `INSERT INTO CONTAS_BANCARIAS (nome_conta, dono_conta, banco, moeda, ativo)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [nome_conta, auth.email, banco, moeda],
    );
    const created = await getBankAccountByIdForOwner(result.rows[0].id, auth.email);
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating bank account: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Bank account name already exists" });
    }
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const activeOnly = String(req.query.active_only || "").toLowerCase() === "true";
    const accounts = await listBankAccountsByOwner(auth.email, { activeOnly });
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query database.");
  }
});

router.get("/:dono_conta", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    if (req.params.dono_conta !== auth.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const accounts = await listBankAccountsByOwner(auth.email);
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query bank accounts.");
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const existing = await getBankAccountByIdForOwner(id, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Bank account not found" });
    }

    const { nome_conta, banco, moeda } = await assertValidBankAccountInput(req.body);
    const result = await pool.query(
      `UPDATE CONTAS_BANCARIAS
       SET nome_conta = $1, banco = $2, moeda = $3, updated_at = NOW()
       WHERE id = $4 AND dono_conta = $5
       RETURNING *`,
      [nome_conta, banco, moeda, id, auth.email],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bank account not found" });
    }
    const updated = await getBankAccountByIdForOwner(id, auth.email);
    res.json(updated);
  } catch (err) {
    console.error("Error updating bank account: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Bank account name already exists" });
    }
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.post("/:id/deactivate", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      `UPDATE CONTAS_BANCARIAS
       SET ativo = FALSE, updated_at = NOW()
       WHERE id = $1 AND dono_conta = $2
       RETURNING *`,
      [id, auth.email],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bank account not found" });
    }
    const updated = await getBankAccountByIdForOwner(id, auth.email);
    res.json(updated);
  } catch (err) {
    console.error("Error deactivating bank account: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const auth = await resolveAuthUser(req);
    const existing = await getBankAccountByIdForOwner(id, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Bank account not found" });
    }
    if (existing.is_historically_used) {
      return res.status(409).json({ error: "Historically used bank accounts must be deactivated instead" });
    }

    const result = await pool.query("DELETE FROM CONTAS_BANCARIAS WHERE id = $1 AND dono_conta = $2 RETURNING *", [
      id,
      auth.email,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bank account not found" });
    }
    res.json(serializeBankAccount({ ...result.rows[0], is_historically_used: false }));
  } catch (err) {
    console.error("Error deleting bank account: ", err);
    res.status(err.statusCode || 500).json({ error: err.message || "database error" });
  }
});

export default router;

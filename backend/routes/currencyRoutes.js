import express from "express";
import pool from "../db.js";

const router = express.Router();

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

async function getCurrencyRowByCode(code) {
  const result = await pool.query(
    "SELECT codigo, ativo, is_default FROM moedas WHERE codigo = $1 LIMIT 1",
    [code],
  );
  return result.rows[0] || null;
}

async function getCurrencyUsage(code) {
  const result = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM contas_bancarias WHERE moeda = $1) AS has_bank_accounts,
            EXISTS(SELECT 1 FROM despesas WHERE moeda = $1) AS has_expenses,
            EXISTS(SELECT 1 FROM receitas WHERE moeda = $1) AS has_income,
            EXISTS(SELECT 1 FROM resumos WHERE moeda = $1) AS has_resumes,
            EXISTS(SELECT 1 FROM distribuicoes WHERE moeda = $1) AS has_distributions`,
    [code],
  );
  const row = result.rows[0];
  const isInUse = Boolean(
    row?.has_bank_accounts ||
      row?.has_expenses ||
      row?.has_income ||
      row?.has_resumes ||
      row?.has_distributions,
  );
  return {
    isInUse,
    canDelete: !isInUse,
  };
}

async function serializeCurrency(row) {
  const usage = await getCurrencyUsage(row.codigo);
  return {
    codigo: row.codigo,
    ativo: row.ativo,
    is_default: row.is_default,
    is_in_use: usage.isInUse,
    can_delete: usage.canDelete,
  };
}

router.post("/", async (req, res) => {
  const codigo = normalizeCode(req.body.codigo);
  try {
    const result = await pool.query(
      "INSERT INTO moedas (codigo, ativo, is_default) VALUES ($1, TRUE, FALSE) RETURNING codigo, ativo, is_default",
      [codigo],
    );
    res.status(201).json(await serializeCurrency(result.rows[0]));
  } catch (err) {
    console.error("Error creating currency: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === "true";
    const result = await pool.query(
      `SELECT codigo, ativo, is_default
       FROM moedas
       ${includeInactive ? "" : "WHERE ativo = TRUE"}
       ORDER BY codigo`,
    );
    const currencies = await Promise.all(result.rows.map((row) => serializeCurrency(row)));
    res.json(currencies);
  } catch (err) {
    console.error("Error querying currencies: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.put("/:codigo", async (req, res) => {
  const codigo = normalizeCode(req.params.codigo);
  const novoCodigo = normalizeCode(req.body.novo_codigo);
  try {
    const result = await pool.query(
      "UPDATE moedas SET codigo = $1 WHERE codigo = $2 RETURNING codigo, ativo, is_default",
      [novoCodigo, codigo],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json(await serializeCurrency(result.rows[0]));
  } catch (err) {
    console.error("Error updating currency: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency already exists" });
    }
    if (err.code === "23503") {
      return res.status(409).json({ error: "In-use currencies cannot be renamed" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.post("/:codigo/activate", async (req, res) => {
  const codigo = normalizeCode(req.params.codigo);
  try {
    const result = await pool.query(
      "UPDATE moedas SET ativo = TRUE WHERE codigo = $1 RETURNING codigo, ativo, is_default",
      [codigo],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json(await serializeCurrency(result.rows[0]));
  } catch (err) {
    console.error("Error activating currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:codigo", async (req, res) => {
  const codigo = normalizeCode(req.params.codigo);
  try {
    const existing = await getCurrencyRowByCode(codigo);
    if (!existing) {
      return res.status(404).json({ error: "Currency not found" });
    }

    const usage = await getCurrencyUsage(codigo);
    const mustSoftDelete = existing.is_default || usage.isInUse;

    if (mustSoftDelete) {
      const result = await pool.query(
        "UPDATE moedas SET ativo = FALSE WHERE codigo = $1 RETURNING codigo, ativo, is_default",
        [codigo],
      );
      return res.json(await serializeCurrency(result.rows[0]));
    }

    await pool.query("DELETE FROM moedas WHERE codigo = $1", [codigo]);
    res.json({
      ...(await serializeCurrency(existing)),
      deleted: true,
      ativo: false,
      can_delete: true,
    });
  } catch (err) {
    console.error("Error deleting currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
